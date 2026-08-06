// One-time migration: turns the current single-tenant deployment into
// tenant #1 of the new multi-tenant model.
//
// What it does:
//   1. Creates a Company from the existing .env WhatsApp credentials.
//   2. Backfills companyId onto every existing document across all
//      tenant-scoped models (including existing Users, who become that
//      company's admins/agents — unchanged roles).
//   3. Creates one brand-new, separate Super Admin account (platformRole
//      set, companyId null) — a distinct login from any company account,
//      per the strict-separation design.
//   4. Rebuilds the indexes that changed shape (Contact.phone,
//      TemplateCategory.name, PricingConfig.key) from global-unique to
//      per-company-unique.
//
// Usage:
//   MIGRATION_COMPANY_NAME="Nuform Social" \
//   MIGRATION_SUPER_ADMIN_EMAIL="platform-admin@yourdomain.com" \
//   MIGRATION_SUPER_ADMIN_PASSWORD="<a strong password>" \
//   node scripts/migrate-multitenant.js
//
// Safe to run exactly once — aborts immediately if any Company already
// exists, rather than risk double-running against real data.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const Company = require("../src/models/company");
const User = require("../src/models/user");
const Contact = require("../src/models/contact");
const Conversation = require("../src/models/conversation");
const Message = require("../src/models/message");
const Template = require("../src/models/template");
const Campaign = require("../src/models/campaign");
const Segment = require("../src/models/segment");
const TemplateCategory = require("../src/models/templateCategory");
const PricingConfig = require("../src/models/pricingConfig");
const { encryptToken } = require("../src/services/whatsapp/companyCredentials");
const { slugifyCompanyName } = require("../src/utils/slugify");

async function main() {
  const companyName = process.env.MIGRATION_COMPANY_NAME;
  const superAdminEmail = process.env.MIGRATION_SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.MIGRATION_SUPER_ADMIN_PASSWORD;

  if (!companyName || !superAdminEmail || !superAdminPassword) {
    console.error(
      "Missing required env vars. Set MIGRATION_COMPANY_NAME, MIGRATION_SUPER_ADMIN_EMAIL, MIGRATION_SUPER_ADMIN_PASSWORD before running.",
    );
    process.exit(1);
  }

  if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
    console.error(
      "CREDENTIALS_ENCRYPTION_KEY is not set. Add a long random secret to .env before running this " +
        "migration — it's what encrypts every company's WhatsApp access token at rest, including the one " +
        "this script is about to create.",
    );
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  const existingCompanyCount = await Company.countDocuments();
  if (existingCompanyCount > 0) {
    console.error(
      `Aborting: ${existingCompanyCount} Company document(s) already exist. This migration is meant to run ` +
        "exactly once against a pre-multi-tenant database.",
    );
    process.exit(1);
  }

  console.log("\n=== Step 1: creating Company #1 from existing .env credentials ===");
  const company = await Company.create({
    name: companyName,
    slug: slugifyCompanyName(companyName),
    status: "active",
    whatsapp: {
      connected: Boolean(process.env.META_ACCESS_TOKEN),
      accessToken: process.env.META_ACCESS_TOKEN ? encryptToken(process.env.META_ACCESS_TOKEN) : "",
      phoneNumberId: process.env.META_PHONE_NUMBER_ID || "",
      wabaId: process.env.META_WABA_ID || "",
      apiVersion: process.env.META_API_VERSION || "",
      tokenType: process.env.META_ACCESS_TOKEN ? "manual" : "",
      connectedAt: process.env.META_ACCESS_TOKEN ? new Date() : null,
    },
  });
  console.log(`Created company "${company.name}" (${company._id}).`);

  console.log("\n=== Step 2: backfilling companyId on existing documents ===");
  const models = [
    { name: "User", model: User },
    { name: "Contact", model: Contact },
    { name: "Conversation", model: Conversation },
    { name: "Message", model: Message },
    { name: "Template", model: Template },
    { name: "Campaign", model: Campaign },
    { name: "Segment", model: Segment },
    { name: "TemplateCategory", model: TemplateCategory },
  ];

  for (const { name, model } of models) {
    const result = await model.updateMany(
      { companyId: { $exists: false } },
      { $set: { companyId: company._id } },
    );
    console.log(`${name}: tagged ${result.modifiedCount} document(s) as company #1.`);
  }

  // PricingConfig used a fixed "default" singleton before multi-tenancy —
  // if one exists, it becomes company #1's config instead of getting a
  // fresh companyId-only backfill (it has no companyId field at all yet).
  const existingPricingConfig = await PricingConfig.findOne({ key: "default" });
  if (existingPricingConfig && !existingPricingConfig.companyId) {
    existingPricingConfig.companyId = company._id;
    await existingPricingConfig.save();
    console.log("PricingConfig: migrated the existing default rate config to company #1.");
  } else {
    console.log("PricingConfig: no existing default config found — nothing to migrate.");
  }

  console.log("\n=== Step 3: creating a separate Super Admin account (platform tier) ===");
  const existingSuperAdmin = await User.findOne({ email: superAdminEmail.toLowerCase() });
  if (existingSuperAdmin) {
    console.log(`A user with email ${superAdminEmail} already exists — skipping Super Admin creation.`);
  } else {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    await User.create({
      name: "Platform Super Admin",
      email: superAdminEmail,
      password: hashedPassword,
      platformRole: "SUPER_ADMIN",
      companyId: null,
    });
    console.log(`Created Super Admin account: ${superAdminEmail} (separate from any company login).`);
  }

  console.log("\n=== Step 4: rebuilding indexes that changed from global to per-company unique ===");
  await Contact.syncIndexes();
  console.log("Contact indexes synced (phone uniqueness is now per-company).");
  await TemplateCategory.syncIndexes();
  console.log("TemplateCategory indexes synced (name uniqueness is now per-company).");
  await PricingConfig.syncIndexes();
  console.log("PricingConfig indexes synced (companyId is now the unique key).");

  console.log("\nMigration complete.");
  console.log(`Company #1: ${company.name} (${company._id})`);
  console.log(`Super Admin login: ${superAdminEmail}`);

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
