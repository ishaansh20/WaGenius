const Company = require("../models/company");

// Sets req.companyId from the authenticated user's JWT claim. Applied to
// every company-scoped route — never the platform console's routes (see
// requirePlatformRole.js), which intentionally query *across* companies.
// A platform-tier account has no companyId at all (enforced at the User
// model level), so this doubles as a guard against a platform login
// reaching a company-scoped route by mistake.
//
// Also enforces suspension here rather than only at login — a user whose
// company gets suspended mid-session (JWT still valid) must be cut off on
// their very next request, not just blocked from logging in again.
const companyScope = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return res.status(403).json({
        success: false,
        message: "This account has no company — access denied",
      });
    }

    const company = await Company.findById(req.user.companyId).select("status");
    if (!company || company.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "This company's access has been suspended",
      });
    }

    req.companyId = req.user.companyId;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Company scoping error",
    });
  }
};

module.exports = { companyScope };
