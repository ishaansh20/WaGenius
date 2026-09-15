const Company = require("../models/company");

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

    const company = await Company.findById(req.user.companyId).select("_id status");
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
