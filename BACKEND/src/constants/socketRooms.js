// Feature-area rooms — not per-conversation/per-user rooms. The Inbox is
// genuinely shared (any agent can view "All"/"Unassigned"/any other
// agent's conversations via client-side filters), so every inbox event
// still needs to reach every client actively on the Inbox page. What these
// rooms actually prevent is a client on the Templates page receiving
// inbox message events (and vice versa) — event types it has no use for.
const SOCKET_ROOMS = ["inbox", "templates", "campaigns"];

module.exports = { SOCKET_ROOMS };
