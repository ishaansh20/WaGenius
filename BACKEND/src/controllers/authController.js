const User = require("../models/user");
const PlatformUser = require("../models/platformUser");
const Company = require("../models/company");
const Subscription = require("../models/subscription");
const { resolveSetupStatus, SETUP_STATUS } = require("../utils/setupStatus");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { slugifyCompanyName } = require("../utils/slugify");

const MAX_SLUG_COLLISION_ATTEMPTS = 5;

// Two companies picking similar names ("Acme", "ACME Inc") would otherwise
// collide on Company.slug's unique index and crash signup with a raw
// duplicate-key error — same collision-retry shape as the template-name
// auto-naming in templateController.js.
async function generateUniqueCompanySlug(companyName) {
  const base = slugifyCompanyName(companyName) || "company";
  let candidate = base;
  let suffix = 1;

  while (suffix <= MAX_SLUG_COLLISION_ATTEMPTS) {
    const existing = await Company.findOne({ slug: candidate });
    if (!existing) return candidate;
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now()}`;
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user (email is globally unique, so this alone identifies them)
    const user = await User.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const [company, subscription] = await Promise.all([
      Company.findById(user.companyId).select(
        "name setupStatus whatsapp.connected whatsapp.wabaId whatsapp.phoneNumberId whatsapp.onboardingCompletedAt",
      ),
      Subscription.findOne({ companyId: user.companyId }),
    ]);

    // Platform-tier accounts must use the separate platform login — this
    // login endpoint is for company accounts only. Keeps the two auth
    // surfaces from ever sharing a page/session (see requirePlatformRole.js
    // for the mirror-image check on the platform side).
    if (user.platformRole) {
      return res.status(401).json({
        success: false,
        message: "This is a platform account — use the platform login instead",
      });
    }

    // Check active status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Determine and sync setupStatus for company
    const setupStatus = resolveSetupStatus(company, subscription);
    if (company && company.setupStatus !== setupStatus) {
      company.setupStatus = setupStatus;
      await company.save();
    }

    // Generate JWT
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        companyId: user.companyId,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Response
    res.status(200).json({
      success: true,
      token,
      setupStatus,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      },
      company: {
        id: company?._id,
        name: company?.name,
        setupStatus,
      },
      whatsapp: {
        connected: company?.whatsapp?.connected === true,
        onboardingCompleted: !!company?.whatsapp?.onboardingCompletedAt,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// Public self-serve signup — creates a brand-new Company plus its first
// User (role ADMIN), and logs them straight in. This is the only way a
// company enters the system on its own; every other user for that company
// is created afterward by that company's own ADMIN via the existing
// Settings → Users flow (createUser in userController.js), unchanged.
const registerCompany = async (req, res) => {
  try {
    const { companyName, name, email, password } = req.body;

    if (!companyName || !name || !email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Company name, your name, email, and password are all required",
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        // Specific and actionable: tells the person what happened and
        // exactly what to do next, instead of a bare "already exists".
        message:
          "An account already exists with this email. If this is your account, sign in instead — otherwise, use a different email address to register a new company.",
        code: "EMAIL_ALREADY_REGISTERED",
      });
    }

    const company = await Company.create({
      name: companyName.trim(),
      slug: await generateUniqueCompanySlug(companyName),
      status: "active",
      setupStatus: SETUP_STATUS.PLAN_SELECTION_REQUIRED,
    });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
      companyId: company._id,
    });

    company.ownerUserId = user._id;
    await company.save();

    const token = jwt.sign(
      { userId: user._id, role: user.role, companyId: company._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.status(201).json({
      success: true,
      token,
      setupStatus: SETUP_STATUS.PLAN_SELECTION_REQUIRED,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: company._id,
      },
      company: {
        id: company._id,
        name: company.name,
        setupStatus: SETUP_STATUS.PLAN_SELECTION_REQUIRED,
      },
    });
  } catch (error) {
    console.error("Register Company Error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to register company",
    });
  }
};

// Separate login endpoint for platform-tier (Super Admin) accounts — a
// distinct surface from the company login above, per the strict-separation
// design: a platform login never shares a page/session with any company
// account, and this rejects outright if the matched user has no
// platformRole, mirroring `login`'s reverse check.
const platformLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await PlatformUser.findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Platform account is inactive",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const token = jwt.sign(
      {
        platformUserId: user._id,
        platformRole: user.role,
      },
      process.env.PLATFORM_JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        platformRole: user.role,
      },
    });
  } catch (error) {
    console.error("Platform Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
module.exports = {
  login,
  registerCompany,
  platformLogin,
};
