require("dotenv").config();

const connectDB = require("../src/config/db");
const Contact = require("../src/models/contact");
const Conversation = require("../src/models/conversation");
const Message = require("../src/models/message");

// Only unambiguous development/test placeholders — never touches real
// customer names/numbers.
const TEST_NAME_PATTERN = /^(test|test user|dummy|sample|demo)$/i;

const cleanTestData = async () => {
  try {
    await connectDB();

    const testContacts = await Contact.find({
      $or: [
        { name: { $regex: TEST_NAME_PATTERN } },
        { phone: { $in: [null, ""] } },
      ],
    });

    if (!testContacts.length) {
      console.log("No dev/test contacts found. Nothing to clean.");
      process.exit(0);
    }

    console.log(
      "Deleting test contacts:",
      testContacts.map((c) => ({ name: c.name, phone: c.phone })),
    );

    const contactIds = testContacts.map((c) => c._id);

    const conversations = await Conversation.find({
      contact: { $in: contactIds },
    });
    const conversationIds = conversations.map((c) => c._id);

    const messageResult = await Message.deleteMany({
      conversation: { $in: conversationIds },
    });
    const conversationResult = await Conversation.deleteMany({
      contact: { $in: contactIds },
    });
    const contactResult = await Contact.deleteMany({
      _id: { $in: contactIds },
    });

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
