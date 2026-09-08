/**
 * Run from the BACKEND directory:
 *   node src/scripts/seedPlans.js
 *
 * Requires MONGO_URI in environment. It reads the .env file automatically.
 */
require("dotenv").config();
const connectDB = require("../config/db");
const { seedDefaultPlans } = require("../config/seedPlans");

(async () => {
  await connectDB();
  await seedDefaultPlans();
  process.exit(0);
})();
