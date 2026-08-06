const PricingConfig = require("../models/pricingConfig");

const getOrCreateConfig = (companyId) =>
  PricingConfig.findOneAndUpdate(
    { companyId },
    { $setOnInsert: { companyId } },
    { upsert: true, new: true },
  );

const getPricingConfig = async (req, res) => {
  try {
    const config = await getOrCreateConfig(req.companyId);
    res.status(200).json({ success: true, config });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to fetch pricing config" });
  }
};

const updatePricingConfig = async (req, res) => {
  try {
    const { currency, rates } = req.body;

    const update = { updatedBy: req.user.userId };
    if (currency) update.currency = currency;
    if (rates) {
      update.rates = {
        marketing: Number(rates.marketing) || 0,
        utility: Number(rates.utility) || 0,
        authentication: Number(rates.authentication) || 0,
        service: Number(rates.service) || 0,
      };
    }

    const config = await PricingConfig.findOneAndUpdate(
      { companyId: req.companyId },
      { $set: update },
      { upsert: true, new: true },
    );

    res.status(200).json({ success: true, config });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Failed to update pricing config" });
  }
};

module.exports = { getPricingConfig, updatePricingConfig, getOrCreateConfig };
