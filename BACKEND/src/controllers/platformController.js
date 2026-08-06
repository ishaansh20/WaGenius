const Company = require("../models/company");
const User = require("../models/user");
const Contact = require("../models/contact");
const Campaign = require("../models/campaign");

// v1 scope, deliberately: list + suspend/reactivate + a basic usage snapshot.
// No impersonation, no billing/plan management — both real features, kept
// as deliberate follow-ups rather than bundled into this retrofit.
const listCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .select("name slug status whatsapp.connected whatsapp.tokenType createdAt")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, companies });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch companies" });
  }
};

const getCompanyDetail = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).select("-whatsapp.accessToken");

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    const [admins, contactCount, campaignCount] = await Promise.all([
      User.find({ companyId: company._id, role: "ADMIN" }).select("name email lastLogin"),
      Contact.countDocuments({ companyId: company._id }),
      Campaign.countDocuments({ companyId: company._id }),
    ]);

    res.status(200).json({
      success: true,
      company,
      admins,
      usage: { contactCount, campaignCount },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch company detail" });
  }
};

const updateCompanyStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["active", "suspended"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'active' or 'suspended'" });
    }

    const company = await Company.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );

    if (!company) {
      return res.status(404).json({ success: false, message: "Company not found" });
    }

    res.status(200).json({ success: true, company });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to update company status" });
  }
};

module.exports = { listCompanies, getCompanyDetail, updateCompanyStatus };
