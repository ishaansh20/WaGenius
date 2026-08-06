import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  MessageSquareText,
  MoreVertical,
  Search,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { cn } from "../../utils/cn";
import { formatPhone } from "../../utils/formatPhone";

const ESCALATION_LABELS = {
  customer_request: "Customer asked to speak with a human",
  low_confidence: "AI flagged its reply as low-confidence",
  turn_limit: "AI reached its auto-reply limit",
};

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0])
    .join("")
    .toUpperCase();
}

function AssignDropdown({ assignedAgent, agents, currentUser, onAssign }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const canAssign =
    currentUser?.role === "ADMIN" || currentUser?.role === "TEAM_LEAD";

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const label = assignedAgent?.name || "Unassigned";

  if (!canAssign) {
    return (
      <span className="hidden items-center gap-1.5 text-[12px] text-slate-500 sm:flex">
        <UserRound className="h-3.5 w-3.5 text-slate-400" />
        <span className="max-w-[96px] truncate">{label}</span>
      </span>
    );
  }

  return (
    <div ref={ref} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition",
          assignedAgent
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
        )}
      >
        <UserRound className="h-3.5 w-3.5 text-current opacity-70" />
        <span className="max-w-[96px] truncate">{label}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[192px] rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => { onAssign(null); setOpen(false); }}
            className={cn(
              "flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition hover:bg-slate-50",
              !assignedAgent ? "font-medium text-emerald-700" : "text-slate-500",
            )}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
              —
            </span>
            Unassigned
          </button>

          {agents.length > 0 && <div className="my-1 border-t border-slate-100" />}

          {agents.map((agent) => {
            const agentId = agent._id || agent.id;
            const isActive = assignedAgent?.id === agentId;
            const initials = (agent.name || "?")
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((p) => p[0])
              .join("")
              .toUpperCase();
            return (
              <button
                key={agentId}
                type="button"
                onClick={() => { onAssign(agentId); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-[13px] transition hover:bg-slate-50",
                  isActive ? "font-medium text-emerald-700" : "text-slate-700",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600",
                  )}
                >
                  {initials}
                </span>
                <span className="truncate">{agent.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({
  conversation,
  messages,
  messagesContainerRef,
  endRef,
  onBack,
  composerValue,
  onComposerChange,
  onSend,
  sending,
  loadingMessages,
  typing,
  onOpenContactDrawer,
  onOpenConversationList,
  contactDrawerOpen,
  agents = [],
  currentUser,
  onAssign,
}) {
  const [msgSearch, setMsgSearch] = useState({ open: false, query: "", index: 0 });
  const searchInputRef = useRef(null);

  // Reset search when conversation changes
  useEffect(() => {
    setMsgSearch({ open: false, query: "", index: 0 });
  }, [conversation?.id]);

  // Focus search input when opened
  useEffect(() => {
    if (msgSearch.open) {
      searchInputRef.current?.focus();
    }
  }, [msgSearch.open]);

  // Compute matching message indices
  const matchIndices = useMemo(() => {
    const q = msgSearch.query.trim().toLowerCase();
    if (!q) return [];
    return messages.reduce((acc, msg, i) => {
      if (msg.content.toLowerCase().includes(q)) acc.push(i);
      return acc;
    }, []);
  }, [messages, msgSearch.query]);

  const totalMatches = matchIndices.length;
  const safeIndex = totalMatches > 0 ? ((msgSearch.index % totalMatches) + totalMatches) % totalMatches : 0;
  const currentMatchMsgId = totalMatches > 0 ? messages[matchIndices[safeIndex]]?.id : null;

  // Scroll to current match
  useEffect(() => {
    if (!currentMatchMsgId) return;
    const el = document.querySelector(`[data-message-id="${currentMatchMsgId}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentMatchMsgId]);

  const handleSearchToggle = () => {
    setMsgSearch((s) =>
      s.open
        ? { open: false, query: "", index: 0 }
        : { open: true, query: "", index: 0 },
    );
  };

  const handleSearchNav = (dir) => {
    setMsgSearch((s) => ({ ...s, index: s.index + dir }));
  };

  if (!conversation) {
    return (
      <section className="relative flex min-h-0 flex-1 items-center justify-center bg-slate-50 lg:border-l lg:border-slate-200">
        <div className="max-w-xs text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <MessageSquareText className="h-5 w-5 text-slate-400" />
          </div>
          <h2 className="text-[15px] font-semibold text-slate-800">
            Select a conversation
          </h2>
          <p className="mt-1.5 text-[13px] text-slate-400">
            Choose a chat from the left to view messages and reply.
          </p>
          <button
            type="button"
            onClick={onOpenConversationList}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13px] font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 lg:hidden"
          >
            <MessageSquareText className="h-3.5 w-3.5" />
            Open conversations
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative flex min-h-0 flex-1 border-l border-slate-200 bg-[#f0ece5] transition-[padding-right] duration-300",
        contactDrawerOpen ? "lg:pr-[340px]" : "lg:pr-0",
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white px-3 py-2.5 sm:px-4 lg:px-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 lg:hidden"
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[13px] font-semibold text-slate-600">
                {conversation.contact.profilePic ? (
                  <img
                    src={conversation.contact.profilePic}
                    alt={conversation.contact.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getInitials(conversation.contact.name)}</span>
                )}
                <span
                  className={cn(
                    "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white",
                    conversation.online ? "bg-emerald-500" : "bg-slate-300",
                  )}
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-[14px] font-semibold text-slate-900 lg:text-[15px]">
                  {conversation.contact.name}
                </h1>
                <div className="flex items-center gap-1.5 text-[12px] text-slate-500">
                  <span>{formatPhone(conversation.contact.phone)}</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className={conversation.online ? "text-emerald-600" : ""}>
                    {conversation.online ? "Online" : "Offline"}
                  </span>
                  {conversation.contact.optedOut ? (
                    <>
                      <span className="h-1 w-1 rounded-full bg-slate-300" />
                      <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">
                        Opted Out
                      </span>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <AssignDropdown
                assignedAgent={conversation.assignedAgent}
                agents={agents}
                currentUser={currentUser}
                onAssign={onAssign}
              />
              <button
                type="button"
                onClick={handleSearchToggle}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-lg transition",
                  msgSearch.open
                    ? "bg-slate-100 text-slate-800"
                    : "text-slate-400 hover:bg-slate-100 hover:text-slate-700",
                )}
                title="Search in conversation"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onOpenContactDrawer}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="Contact details"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* In-message search bar */}
          {msgSearch.open && (
            <div className="mt-2.5 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  value={msgSearch.query}
                  onChange={(e) =>
                    setMsgSearch((s) => ({ ...s, query: e.target.value, index: 0 }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSearchNav(e.shiftKey ? -1 : 1);
                    }
                    if (e.key === "Escape") handleSearchToggle();
                  }}
                  placeholder="Search in conversation…"
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:bg-white"
                />
              </div>

              {msgSearch.query.trim() && (
                <span className="shrink-0 text-[12px] tabular-nums text-slate-500">
                  {totalMatches === 0
                    ? "No results"
                    : `${safeIndex + 1} / ${totalMatches}`}
                </span>
              )}

              <button
                type="button"
                onClick={() => handleSearchNav(-1)}
                disabled={totalMatches === 0}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                title="Previous match (Shift+Enter)"
              >
                <ChevronUp className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => handleSearchNav(1)}
                disabled={totalMatches === 0}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 disabled:opacity-30"
                title="Next match (Enter)"
              >
                <ChevronDown className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={handleSearchToggle}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                title="Close search (Esc)"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </header>

        {/* Messages */}
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-6"
          >
            <div className="flex w-full flex-col gap-2.5">
              {!loadingMessages &&
                messages.map((message, index) => {
                  const previous = messages[index - 1];
                  const showSenderLabel =
                    message.sender !== "user" &&
                    (!previous ||
                      previous.sender !== message.sender ||
                      previous.senderName !== message.senderName);

                  return (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      showSenderLabel={showSenderLabel}
                      searchQuery={msgSearch.open ? msgSearch.query.trim() : ""}
                      isCurrentMatch={msgSearch.open && message.id === currentMatchMsgId}
                    />
                  );
                })}

              <div ref={endRef} />

              {typing && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="flex items-center gap-2 px-1"
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
                    <motion.div className="flex gap-0.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-slate-500"
                          animate={{ y: [-4, 0, -4] }}
                          transition={{
                            duration: 0.6,
                            repeat: Infinity,
                            delay: i * 0.1,
                          }}
                        />
                      ))}
                    </motion.div>
                  </div>
                  <span className="text-[12px] text-slate-500">Typing…</span>
                </motion.div>
              )}
            </div>
          </div>
        </div>

        {/* Composer or AI notice */}
        {!conversation.aiEnabled ? (
          <>
            {conversation.escalationReason ? (
              <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-[12px] text-amber-700">
                Escalated to human — {ESCALATION_LABELS[conversation.escalationReason] || conversation.escalationReason}
              </div>
            ) : null}
            <ChatInput
              value={composerValue}
              onChange={onComposerChange}
              onSend={onSend}
              sending={sending}
            />
          </>
        ) : (
          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-[13px] text-slate-600">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <span>AI is handling this conversation. Switch to human mode to reply.</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
