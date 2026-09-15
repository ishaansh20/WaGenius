const { executeCampaign } = require("./campaignSenderService");
const Campaign = require("../../models/campaign");

// How often to check the database for due scheduled campaigns. Replaces
// the old setTimeout-per-campaign approach, which had two real problems:
// every pending schedule was lost on any server restart (nodemon reloads
// on every file save in dev — this wasn't a hypothetical), and Node's
// setTimeout silently misfires for delays beyond ~24.8 days (its delay
// argument is a 32-bit signed int internally), so a campaign scheduled
// further out than that would have fired almost immediately instead of
// waiting. A periodic poller has neither problem — every tick re-derives
// "what's due" straight from the database, so there's no in-memory state
// to lose across a restart, and no delay large enough to overflow.
const POLL_INTERVAL_MS = 30 * 1000;

let pollTimer = null;
let isPolling = false;

// Atomically claims one due campaign (status: "scheduled" -> "processing")
// before executing it, so a slow poll tick that overlaps the next one
// can't pick up and send the same campaign twice.
const claimAndExecute = async (campaignDoc) => {
  const claimed = await Campaign.findOneAndUpdate(
    { _id: campaignDoc._id, status: "scheduled" },
    { $set: { status: "processing" } },
    { new: true },
  );

  if (!claimed) return; // already claimed by a previous/overlapping tick

  console.log(
    `⏰ Executing due scheduled campaign: "${claimed.campaignName}" (${claimed._id}), was due ${claimed.scheduleAt}`,
  );

  try {
    await executeCampaign({
      companyId: claimed.companyId,
      campaignId: claimed._id,
      campaignName: claimed.campaignName,
      contacts: claimed.contacts,
      message: claimed.message,
      mediaUrl: claimed.mediaUrl,
      mediaType: claimed.mediaType,
      campaignType: claimed.campaignType,
      isScheduled: false, // scheduling already happened — this is the actual send
      templateId: claimed.templateId,
      templateVariables: claimed.templateVariables,
      buttonVariables: claimed.buttonVariables,
    });
  } catch (error) {
    console.error(
      `Scheduled campaign execution failed for ${claimed._id}:`,
      error.response?.data || error.message,
    );
    // Without this, a campaign that hits an unexpected error here (as
    // opposed to a per-contact send failure, which executeCampaign already
    // handles internally) stays stuck at "processing" forever — invisible
    // to the user, and immune to Pause/Resume/Cancel since those only
    // operate on "scheduled"/"paused" campaigns.
    await Campaign.updateOne(
      { _id: claimed._id },
      { $set: { status: "failed" } },
    ).catch((updateError) => {
      console.error(
        `Also failed to mark campaign ${claimed._id} as failed:`,
        updateError.message,
      );
    });
  }
};

const pollDueCampaigns = async () => {
  if (isPolling) return; // previous tick still running (e.g. large batch) — skip, don't overlap
  isPolling = true;

  try {
    const due = await Campaign.find({
      status: "scheduled",
      scheduleAt: { $lte: new Date() },
    });

    for (const campaignDoc of due) {
      await claimAndExecute(campaignDoc);
    }
  } catch (error) {
    console.error("Campaign poller error:", error);
  } finally {
    isPolling = false;
  }
};

// Starts the periodic check — called once at server boot (see server.js).
// Runs one check immediately so campaigns already due at startup (e.g. the
// server was down past their scheduled time) don't wait for the first
// interval to elapse.
const startCampaignPoller = () => {
  if (pollTimer) return; // already started

  console.log(`📅 Campaign scheduler poller started (checking every ${POLL_INTERVAL_MS / 1000}s)`);
  pollDueCampaigns();
  pollTimer = setInterval(pollDueCampaigns, POLL_INTERVAL_MS);
};

// Immediate campaigns still run right away, synchronously with the
// request that created them. Scheduled campaigns don't need anything
// armed here anymore — they're already persisted with status "scheduled"
// and a scheduleAt (see uploadController.js), so the poller above will
// find and execute them when due, on this boot or any future one.
const scheduleCampaign = async (campaign) => {
  if (!campaign.isScheduled) {
    console.log("⚡ Executing immediately");
    return await executeCampaign(campaign);
  }

  console.log(
    `📅 Campaign "${campaign.campaignName}" scheduled for ${campaign.scheduleAt} — the poller will pick it up when due.`,
  );
  return true;
};

module.exports = {
  scheduleCampaign,
  startCampaignPoller,
};
