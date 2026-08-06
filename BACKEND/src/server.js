require("dotenv").config();

const http = require("http");

const connectDB = require("./config/db");

const app = require("./app");

const { initSocket } = require("./sockets/socket");
const { startCampaignPoller } = require("./services/campaign/campaignSchedulerService");

connectDB();

const server = http.createServer(app);

initSocket(server);
startCampaignPoller();

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
