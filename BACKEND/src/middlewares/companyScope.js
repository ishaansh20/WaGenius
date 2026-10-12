const Company = require("../models/company");
const User = require("../models/user");

// Middleware to ensure request is scoped to a company.
// Requires req.user.companyId from JWT. If missing or invalid, reject with 401.
const companyScope = async (req, res, next) => {
  try {
    if (!req.user?.companyId) {
      return res.status(401).json({
        success: false,
        message: "Missing companyId in token",
      });
    }

    const [company, user] = await Promise.all([
      Company.findById(req.user.companyId).select("_id status"),
      req.user.userId ? User.findById(req.user.userId).select("isActive companyId") : null,
    ]);

    // A token stays valid until it expires, so check the account on every
    // request: deactivated users (or users moved out of this company) lose
    // access immediately instead of when their token runs out.
    if (!user || !user.isActive || String(user.companyId) !== String(req.user.companyId)) {
      return res.status(401).json({
        success: false,
        code: "ACCOUNT_INACTIVE",
        message: "Your account is no longer active. Please contact your admin.",
      });
    }

    if (!company) {
      return res.status(401).json({
        success: false,
        message: "Invalid companyId",
      });
    }

    if (company.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "This company's access has been suspended",
      });
    }

    req.companyId = company._id;
    next();
  } catch (error) {
    console.error("Company scope error:", error);
    return res.status(500).json({
      success: false,
      message: "Company scoping error",
    });
  }
};

module.exports = { companyScope };
