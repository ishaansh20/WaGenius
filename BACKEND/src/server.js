require("dotenv").config();

const http = require("http");

const connectDB = require("./config/db");
const { seedDefaultPlans } = require("./config/seedPlans");

const app = require("./app");

const { initSocket } = require("./sockets/socket");
const { startCampaignPoller } = require("./services/campaign/campaignSchedulerService");

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
