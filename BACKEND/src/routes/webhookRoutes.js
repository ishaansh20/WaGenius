const express = require("express");

const {
  verifyWebhook,
  receiveWebhook,
} = require("../controllers/webhookController");

const router = express.Router();

// Proves a request reached Express routing at all, before any controller/
// body-parsing logic runs. If this never prints for an incoming Meta call,
// the request isn't reaching this server — check the callback URL/tunnel/
// firewall in front of Node, not the app code.
router.use((req, res, next) => {
  console.log(`[webhook] ${new Date().toISOString()} ${req.method} ${req.originalUrl}`);
  next();
});

// Meta Verification
router.get("/", verifyWebhook);

// Meta Events
router.post("/", receiveWebhook);

module.exports = router;
