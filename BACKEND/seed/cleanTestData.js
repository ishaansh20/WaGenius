/*
 * Removes development/test contacts (and their conversations and messages)
 * from ONE company.
 *
 *   node seed/cleanTestData.js --company "<company name or id>"          (preview only)
 *   node seed/cleanTestData.js --company "<company name or id>" --apply  (delete)
 *
 * Safety rules:
 *   - A company is required and must match exactly one company.
 *   - Every query and delete is scoped to that company's companyId.
 *   - Nothing is deleted unless --apply is passed.
 */
require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../src/config/db");
const Company = require("../src/models/company");
const Contact = require("../src/models/contact");
const Conversation = require("../src/models/conversation");
const Message = require("../src/models/message");

// Only unambiguous development/test placeholders — never touches real
// customer names/numbers.
const TEST_NAME_PATTERN = /^(test|test user|dummy|sample|demo)$/i;

const arg = (flag) => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const cleanTestData = async () => {
  const companyArg = arg("--company");
  const apply = process.argv.includes("--apply");

  if (!companyArg) {
    console.error('Usage: node seed/cleanTestData.js --company "<company name or id>" [--apply]');
    process.exit(1);
  }

  try {
    await connectDB();

    const companyQuery = mongoose.isValidObjectId(companyArg) ? { _id: companyArg } : { name: companyArg };
    const companies = await Company.find(companyQuery).select("name").lean();
    if (companies.length !== 1) {
      console.error(`Expected exactly 1 company for ${JSON.stringify(companyQuery)}, found ${companies.length}. Nothing changed.`);
      process.exit(1);
    }
    const company = companies[0];
    const companyId = company._id;
    console.log(`Company: ${company.name} (${companyId})`);

    const testContacts = await Contact.find({
      companyId,
      $or: [
        { name: { $regex: TEST_NAME_PATTERN } },
        { phone: { $in: [null, ""] } },
      ],
    }).select("name phone");

    if (!testContacts.length) {
      console.log("No dev/test contacts found for this company. Nothing to clean.");
      process.exit(0);
    }

    const contactIds = testContacts.map((c) => c._id);
    const conversations = await Conversation.find({ companyId, contact: { $in: contactIds } }).select("_id");
    const conversationIds = conversations.map((c) => c._id);
    const messageCount = conversationIds.length
      ? await Message.countDocuments({ companyId, conversation: { $in: conversationIds } })
      : 0;

    console.log(
      "Test contacts:",
      testContacts.map((c) => ({ name: c.name, phone: c.phone })),
    );
    console.log(`Would remove: ${contactIds.length} contacts, ${conversationIds.length} conversations, ${messageCount} messages.`);

    if (!apply) {
      console.log("Preview only. Re-run with --apply to delete.");
      process.exit(0);
    }

    const messageResult = conversationIds.length
      ? await Message.deleteMany({ companyId, conversation: { $in: conversationIds } })
      : { deletedCount: 0 };
    const conversationResult = await Conversation.deleteMany({ companyId, contact: { $in: contactIds } });
    const contactResult = await Contact.deleteMany({ companyId, _id: { $in: contactIds } });

    console.log("Cleanup complete:", {
      contactsRemoved: contactResult.deletedCount,
      conversationsRemoved: conversationResult.deletedCount,
      messagesRemoved: messageResult.deletedCount,
    });

    process.exit(0);
  } catch (error) {
    console.error("Error cleaning test data:", error);
    process.exit(1);
  }
};

cleanTestData();
