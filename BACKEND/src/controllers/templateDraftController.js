const { draftTemplateBody } = require("../services/ai/templateDraftService");

const draftTemplate = async (req, res) => {
  try {
    const { goal, category } = req.body;

    if (!goal || !goal.trim()) {
      return res.status(400).json({ success: false, message: "Tell us what this message is for" });
    }

    if (!category) {
      return res.status(400).json({ success: false, message: "Choose a category first" });
    }

    const body = await draftTemplateBody({ goal: goal.trim(), category });

    res.status(200).json({ success: true, draft: { body } });
  } catch (error) {
    console.error("Template Draft Error:", error.response?.data || error.message);

    // Drafting must never block manual entry — the frontend's Step 2
    // textarea works with or without a successful draft.
    res.status(502).json({
      success: false,
      message: "Couldn't generate a draft right now — try again or write it yourself.",
    });
  }
};

module.exports = { draftTemplate };
