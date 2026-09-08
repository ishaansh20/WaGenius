const express = require("express");
const cors = require("cors");
const path = require("path");
const messageRoutes = require("./routes/messageRoutes");
const campaignRoutes = require("./routes/campaignRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const templateRoutes = require("./routes/templateRoutes");
const templateCategoryRoutes = require("./routes/templateCategoryRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const contactRoutes = require("./routes/contactRoutes");
const metaAccountRoutes = require("./routes/metaAccountRoutes");
const pricingConfigRoutes = require("./routes/pricingConfigRoutes");
const segmentRoutes = require("./routes/segmentRoutes");
const companyRoutes = require("./routes/companyRoutes");
const platformRoutes = require("./routes/platformRoutes");
const planRoutes = require("./routes/planRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const webhookRoutes = require("./routes/webhookRoutes");

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://wagenius.beforelive.in",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests and tools without Origin
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  }),
);
// The `verify` hook stashes the raw request bytes on `req.rawBody` — needed
// by webhookController.js to check Meta's X-Hub-Signature-256 header, which
// is an HMAC over the exact bytes sent, not the re-serialized parsed JSON
// (those can differ in whitespace/key order and would fail verification).
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/platform", platformRoutes);
app.use("/api/users", userRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/campaigns", uploadRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/template-categories", templateCategoryRoutes);
app.use("/api/contacts", contactRoutes);
app.use("/api/meta-account", metaAccountRoutes);
app.use("/api/settings", pricingConfigRoutes);
app.use("/api/segments", segmentRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/plans", planRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/webhook", webhookRoutes);
app.use("/api", messageRoutes);
app.get("/", (req, res) => {
  res.send("WAI Backend Running");
});

module.exports = app;
