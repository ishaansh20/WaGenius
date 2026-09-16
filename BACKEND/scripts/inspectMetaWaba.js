require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const axios = require("axios");
const mongoose = require("mongoose");
const Company = require("../src/models/company");
const { decryptToken } = require("../src/services/whatsapp/companyCredentials");

async function main() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGO_URI not found in environment");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB.");

  // Find the most recently updated company with connected WhatsApp
  const company = await Company.findOne({ "whatsapp.connected": true }).sort({ updatedAt: -1 });
  if (!company || !company.whatsapp?.accessToken || !company.whatsapp?.wabaId) {
    console.error("No company with connected WhatsApp found in database.");
    await mongoose.disconnect();
    process.exit(1);
  }

  const wabaId = company.whatsapp.wabaId;
  const accessToken = decryptToken(company.whatsapp.accessToken);
  const apiVersion = process.env.META_API_VERSION || "v23.0";

  console.log(`Testing Meta Graph API for Company: "${company.name}" (WABA: ${wabaId})...\n`);

  // Test 1: Standard health fields
  try {
    const res1 = await axios.get(`https://graph.facebook.com/${apiVersion}/${wabaId}`, {
      params: { fields: "health_status,primary_funding_id,status,account_review_status" },
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log("✓ Standard Health Query Successful:");
    console.log(JSON.stringify(res1.data, null, 2));
  } catch (err) {
    console.error("✗ Standard Health Query Failed:", JSON.stringify(err.response?.data || err.message, null, 2));
  }

  // Test 2: Testing owner_business_info or business fields safely
  const candidateFields = [
    "owner_business_info",
    "business",
    "owner_business",
  ];

  for (const field of candidateFields) {
    console.log(`\nTesting field "${field}"...`);
    try {
      const res = await axios.get(`https://graph.facebook.com/${apiVersion}/${wabaId}`, {
        params: { fields: field },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(`✓ Field "${field}" succeeded:`, JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log(`✗ Field "${field}" failed:`, JSON.stringify(err.response?.data?.error || err.message, null, 2));
    }
  }

  // Test 3: Isolate exactly which field(s) in the combined health query
  // require Business Solution Provider status, by testing each alone.
  const healthFields = ["health_status", "primary_funding_id", "status", "account_review_status"];

  for (const field of healthFields) {
    console.log(`\nTesting health field "${field}" alone...`);
    try {
      const res = await axios.get(`https://graph.facebook.com/${apiVersion}/${wabaId}`, {
        params: { fields: field },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      console.log(`✓ Field "${field}" succeeded:`, JSON.stringify(res.data, null, 2));
    } catch (err) {
      console.log(`✗ Field "${field}" failed:`, JSON.stringify(err.response?.data?.error || err.message, null, 2));
    }
  }

  // Test 4: The payment_configurations edge, which checkWabaHealthStatus
  // also queries separately — check if this one needs BSP status too.
  console.log(`\nTesting payment_configurations edge...`);
  try {
    const res = await axios.get(
      `https://graph.facebook.com/${apiVersion}/${wabaId}/payment_configurations`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    console.log("✓ payment_configurations succeeded:", JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.log(
      "✗ payment_configurations failed:",
      JSON.stringify(err.response?.data?.error || err.message, null, 2),
    );
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Fatal script error:", err);
  process.exit(1);
});
