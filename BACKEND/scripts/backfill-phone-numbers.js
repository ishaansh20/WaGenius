/*
 * Stamps the company's primary WhatsApp number onto conversations and
 * campaigns created before multi-number support (they have no number).
 * Optional: the app already treats unstamped chats as belonging to the
 * primary number, this just makes the data explicit.
 *
 *   node scripts/backfill-phone-numbers.js --company "<name or id>"          (preview)
 *   node scripts/backfill-phone-numbers.js --company "<name or id>" --apply  (write)
 *
 * Safety: needs exactly one matching company; every query is scoped to that
 * company's companyId; only documents with an empty number are touched;
 * nothing is written without --apply.
 */
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Company = require("../src/models/company");
const Conversation = require("../src/models/conversation");
const Campaign = require("../src/models/campaign");
const { primaryNumberId } = require("../src/utils/whatsappNumberList");

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

(async () => {
  const companyArg = arg("--company");
  const apply = process.argv.includes("--apply");

  if (!companyArg) {
    console.error('Usage: node scripts/backfill-phone-numbers.js --company "<name or id>" [--apply]');
    process.exit(1);
  }

  try {
    await connectDB();

    const query = mongoose.isValidObjectId(companyArg) ? { _id: companyArg } : { name: companyArg };
    const companies = await Company.find(query).select("name whatsapp").lean();
    if (companies.length !== 1) {
      console.error(`Expected exactly 1 company, found ${companies.length}. Nothing changed.`);
      process.exit(1);
    }

    const company = companies[0];
    const primary = primaryNumberId(company);
    console.log(`Company: ${company.name} (${company._id}) - primary number id: ${primary || "none"}`);

    if (!primary) {
      console.log("No WhatsApp number connected; nothing to stamp.");
      process.exit(0);
    }

    const empty = { $in: ["", null] };
    const convFilter = { companyId: company._id, phoneNumberId: empty };
    const campFilter = { companyId: company._id, phoneNumberId: empty };

    const [convCount, campCount] = await Promise.all([
      Conversation.countDocuments(convFilter),
      Campaign.countDocuments(campFilter),
    ]);
    console.log(`Would stamp: ${convCount} conversations, ${campCount} campaigns.`);

    if (!apply) {
      console.log("Preview only. Re-run with --apply to write.");
      process.exit(0);
    }

    const [c1, c2] = await Promise.all([
      Conversation.updateMany(convFilter, { $set: { phoneNumberId: primary } }),
      Campaign.updateMany(campFilter, { $set: { phoneNumberId: primary } }),
    ]);
    console.log(`Done: ${c1.modifiedCount} conversations, ${c2.modifiedCount} campaigns stamped.`);
    process.exit(0);
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  }
})();
