const { getAccountHealth } = require("../services/whatsapp/metaAccountService");
const { getCompanyWhatsAppCredentials } = require("../services/whatsapp/companyCredentials");

// Keyed by companyId — each tenant's account health is cached separately, so
// one company's Meta data is never served back to a different company. A
// short TTL keeps repeated dashboard loads fast without needing a manual
// refresh every time.
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

const getHealth = async (req, res) => {
  try {
    const { companyId } = req;
    const force = req.query.force === "true";
    const entry = cache.get(companyId);
    const isStale = !entry || Date.now() - entry.cachedAt > CACHE_TTL_MS;

    if (force || isStale) {
      const credentials = await getCompanyWhatsAppCredentials(companyId);
      const data = credentials ? await getAccountHealth(credentials) : { available: false };
      cache.set(companyId, { data, cachedAt: Date.now() });
    }

    res.status(200).json(cache.get(companyId).data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ available: false });
  }
};

module.exports = { getHealth };
