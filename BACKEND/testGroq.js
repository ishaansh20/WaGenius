const { generateReply } = require("./src/services/ai/groqService");
require("dotenv").config();
(async () => {
  try {
    const reply = await generateReply("Hello");

    console.log("\n========== AI REPLY ==========\n");
    console.log(reply);
    console.log("\n==============================\n");
  } catch (err) {
    console.error(err);
  }
})();
