const Company = require("../models/company");

const DEFAULT_COMPANY_NAME =
  process.env.DEFAULT_COMPANY_NAME || "Default Company";
const DEFAULT_COMPANY_SLUG =
  process.env.DEFAULT_COMPANY_SLUG || "default-company";

// Sets req.companyId for all company-scoped routes. In single-tenant mode
// this no longer requires companyId to exist in the JWT; if absent, it
// resolves one default active company and applies it to the request.
//
// Also enforces suspension here rather than only at login — a user whose
// company gets suspended mid-session (JWT still valid) must be cut off on
// their very next request, not just blocked from logging in again.
const companyScope = async (req, res, next) => {
  try {
    let company = null;

    if (req.user?.companyId) {
      company = await Company.findById(req.user.companyId).select("_id status");
    }

    // Single-tenant fallback: if JWT has no company claim, use an explicit
    // DEFAULT_COMPANY_ID when configured, otherwise first active company.
    if (!company) {
      if (process.env.DEFAULT_COMPANY_ID) {
        company = await Company.findById(process.env.DEFAULT_COMPANY_ID).select(
          "_id status",
        );
      }

      if (!company) {
        company = await Company.findOne({ status: "active" })
          .sort({ createdAt: 1 })
          .select("_id status");
      }

      // Single-tenant bootstrap: create one default active company if the
      // database has no company yet, so seeded admin can use the app
      // immediately without registering a company.
      if (!company) {
        company = await Company.create({
          name: DEFAULT_COMPANY_NAME,
          slug: DEFAULT_COMPANY_SLUG,
          status: "active",
        });
      }
    }

    if (!company) {
      return res.status(403).json({
        success: false,
        message: "No active company configured",
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
    return res.status(500).json({
      success: false,
      message: "Company scoping error",
    });
  }
};

module.exports = { companyScope };
