require("dotenv").config();

const http = require("http");

const connectDB = require("./config/db");
const { seedDefaultPlans } = require("./config/seedPlans");

const app = require("./app");

const { initSocket } = require("./sockets/socket");
const { startCampaignPoller } = require("./services/campaign/campaignSchedulerService");

// Without these, Node crashes the ENTIRE server on the very first
// unhandled promise rejection anywhere in the app (default behavior since
// Node 15) — one missed .catch() in an obscure route or background job
// takes down every company's access at once, with nothing beyond a stack
// trace dumped to stdout. Log loudly instead of dying silently.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  // Unlike unhandledRejection, an uncaught exception can leave the process
  // in a genuinely corrupted state — exit and let the process manager
  // (pm2/systemd/Docker restart policy) bring up a clean instance, rather
  // than keep serving requests from a potentially broken process.
  process.exit(1);
});

connectDB().then(() => {
  seedDefaultPlans();
});

const server = http.createServer(app);

initSocket(server);
startCampaignPoller();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
