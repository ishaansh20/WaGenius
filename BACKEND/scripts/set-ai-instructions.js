/*
 * Sets the AI assistant's business details for ONE company.
 *
 *   node scripts/set-ai-instructions.js --company "<company name or id>" --file scripts/ai-instructions/nuform-social.txt          (preview only)
 *   node scripts/set-ai-instructions.js --company "<company name or id>" --file scripts/ai-instructions/nuform-social.txt --apply  (save)
 *
 * Updates exactly one company document, matched by _id or exact name.
 * Never touches any other company.
 */
require("dotenv").config();
const fs = require("fs");
const mongoose = require("mongoose");
const Company = require("../src/models/company");
const { MAX_INSTRUCTIONS_CHARS } = require("../src/config/aiPrompt");

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

(async () => {
  const companyArg = arg("--company");
  const file = arg("--file");
  const apply = process.argv.includes("--apply");
  if (!companyArg || !file) {
    console.error('Usage: node scripts/set-ai-instructions.js --company "<name or id>" --file <path> [--apply]');
    process.exit(1);
  }

  const text = fs.readFileSync(file, "utf8").trim();
  if (text.length > MAX_INSTRUCTIONS_CHARS) {
    console.error(`Instructions are ${text.length} characters; the limit is ${MAX_INSTRUCTIONS_CHARS}.`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  const query = mongoose.isValidObjectId(companyArg) ? { _id: companyArg } : { name: companyArg };
  const matches = await Company.find(query).select("name").lean();
  if (matches.length !== 1) {
    console.error(`Expected exactly 1 company for ${JSON.stringify(query)}, found ${matches.length}. Nothing changed.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const company = matches[0];
  console.log(`Company: ${company.name} (${company._id})`);
  console.log(`Instructions: ${text.length} characters`);
  if (!apply) {
    console.log("Preview only. Re-run with --apply to save.");
  } else {
    await Company.updateOne({ _id: company._id }, { $set: { aiInstructions: text } });
    console.log("Saved.");
  }
  await mongoose.disconnect();
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
