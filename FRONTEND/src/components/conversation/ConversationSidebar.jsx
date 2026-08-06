import { MessageSquareText, Search, X, Menu } from "lucide-react";
import { cn } from "../../utils/cn";
import { formatPhone } from "../../utils/formatPhone";

function getTagStyles(tag = "") {
  const normalized = tag.toLowerCase();

  if (normalized === "hot lead") return "bg-red-50 text-red-700 border border-red-100";
  if (normalized === "complaint") return "bg-amber-50 text-amber-700 border border-amber-100";
  if (normalized === "vip") return "bg-purple-50 text-purple-700 border border-purple-100";
  if (normalized === "interested") return "bg-blue-50 text-blue-700 border border-blue-100";
  if (normalized === "follow up") return "bg-orange-50 text-orange-700 border border-orange-100";
  if (normalized === "existing customer") return "bg-emerald-50 text-emerald-700 border border-emerald-100";

  const customTagColorMap = {
    urgent: "bg-cyan-50 text-cyan-700 border border-cyan-200",
    "call leads": "bg-pink-50 text-pink-700 border border-pink-200",
  };
  if (customTagColorMap[normalized]) return customTagColorMap[normalized];

  const fallbackColors = [
    "bg-indigo-50 text-indigo-700 border border-indigo-200",
    "bg-teal-50 text-teal-700 border border-teal-200",
  ];
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) hash += normalized.charCodeAt(i);
  return fallbackColors[hash % fallbackColors.length];
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatCardTime(value) {
  const date = new Date(value);
  const now = new Date();

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return new Intl.DateTimeFormat("en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date);
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isYesterday) return "Yesterday";

  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  if (diffDays < 7) {
    return new Intl.DateTimeFormat("en", { weekday: "short" }).format(date);
  }

  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(date);
}

function ConversationCard({ conversation, active, onClick }) {
  const unread = conversation.unreadCount > 0;
  const displayName =
    !conversation.contact.name || conversation.contact.name === "Unknown Contact"
      ? formatPhone(conversation.contact.phone)
      : conversation.contact.name;
  const tags = conversation.contact.tags || [];

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-150",
        active ? "bg-slate-100" : "hover:bg-slate-50",
      )}
    >
      {active && (
        <span className="absolute inset-y-2 left-0 w-0.5 rounded-r bg-emerald-500" />
      )}

      {/* Avatar */}
      <div className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-[13px] font-semibold text-slate-600">
        {conversation.contact.profilePic ? (
          <img
            src={conversation.contact.profilePic}
            alt={displayName}
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{getInitials(displayName)}</span>
        )}
        <span
          className={cn(
            "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white",
            conversation.online ? "bg-emerald-500" : "bg-slate-300",
          )}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3
            className={cn(
              "truncate text-[13.5px] leading-snug",
              unread ? "font-semibold text-slate-950" : "font-medium text-slate-700",
            )}
          >
            {displayName}
          </h3>
          <span className="shrink-0 text-[11px] tabular-nums text-slate-400">
            {formatCardTime(conversation.lastMessageTime)}
          </span>
        </div>

        <p
          className={cn(
            "mt-0.5 truncate text-[12.5px] leading-snug",
            unread ? "text-slate-700" : "text-slate-400",
          )}
        >
          {conversation.lastMessage || "No messages yet"}
        </p>

        {(tags.length > 0 || unread) && (
          <div className="mt-1.5 flex items-center justify-between gap-2">
            <div className="flex min-w-0 gap-1 overflow-hidden">
              {tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className={cn(
                    "inline-flex shrink-0 items-center rounded px-1.5 py-px text-[10px] font-medium leading-none",
                    getTagStyles(tag),
                  )}
                >
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className="inline-flex shrink-0 items-center rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium leading-none text-slate-500">
                  +{tags.length - 2}
                </span>
              )}
            </div>

            {unread && (
              <span className="inline-flex min-w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-500 px-1.5 py-px text-[10px] font-bold leading-none text-white">
                {conversation.unreadCount}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

const ASSIGN_FILTERS = [
  { value: "all", label: "All" },
  { value: "mine", label: "Mine" },
  { value: "unassigned", label: "Unassigned" },
];

export function ConversationSidebar({
  conversations,
  allConversations,
  totalConversationCount,
  query,
  onQueryChange,
  filter = "all",
  onFilterChange,
  selectedTag,
  onTagChange,
  allTags,
  activeConversationId,
  onConversationSelect,
  loading,
  mobileOpen,
  onCloseMobile,
  onOpenDashboard,
  agents = [],
  currentUser,
  hasMoreConversations = false,
  isLoadingMoreConversations = false,
  onLoadMoreConversations,
}) {
  const isAdminOrLead =
    currentUser?.role === "ADMIN" || currentUser?.role === "TEAM_LEAD";
  const agentFilterId = filter.startsWith("agent:") ? filter.slice(6) : "";

  return (
    <>
      <aside
        className={cn(
          "shrink-0 border-r border-slate-200 bg-white transition-[width,transform] duration-300",
          // Mobile (<768px): full-screen fixed overlay
          "fixed inset-y-0 left-0 z-40 w-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Tablet (768-1023px): static in flex layout, width-based collapse
          "md:relative md:inset-auto md:left-auto md:z-auto md:translate-x-0",
          mobileOpen ? "md:w-[280px]" : "md:w-0 md:overflow-hidden",
          // Desktop (1024px+): always 320px, always visible
          "lg:w-[320px] xl:w-[340px] lg:overflow-visible",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <MessageSquareText className="h-4 w-4" />
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Workspace
                </p>
                <h2 className="text-[15px] font-semibold text-slate-900 leading-tight">
                  Inbox
                </h2>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search + Filters */}
          <div className="space-y-2.5 border-b border-slate-200 bg-slate-50 px-3 pb-3 pt-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search conversations…"
                className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
              />
            </div>

            {/* Assignment filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {ASSIGN_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onFilterChange?.(value)}
                  className={cn(
                    "whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition focus:outline-none",
                    filter === value
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800",
                  )}
                >
                  {label}
                </button>
              ))}

              {isAdminOrLead && agents.length > 0 && (
                <select
                  value={agentFilterId}
                  onChange={(e) =>
                    onFilterChange?.(
                      e.target.value ? `agent:${e.target.value}` : "all",
                    )
                  }
                  className={cn(
                    "h-[26px] cursor-pointer rounded-md border px-2 text-[12px] font-medium transition focus:outline-none focus:ring-2 focus:ring-slate-100",
                    agentFilterId
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-500 hover:border-slate-300",
                  )}
                >
                  <option value="">By Agent</option>
                  {agents.map((a) => (
                    <option key={a._id || a.id} value={a._id || a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tag filter */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex w-max items-center gap-1 pr-2">
                <button
                  onClick={() => onTagChange("all")}
                  className={cn(
                    "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition focus:outline-none",
                    selectedTag === "all"
                      ? "bg-emerald-600 text-white"
                      : "text-slate-500 hover:text-slate-800",
                  )}
                >
                  All
                  <span
                    className={cn(
                      "rounded px-1 py-px text-[10px] font-semibold",
                      selectedTag === "all"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-600",
                    )}
                  >
                    {totalConversationCount}
                  </span>
                </button>

                {allTags.map((tag) => {
                  const count = (allConversations || conversations).filter((c) =>
                    (c.contact.tags || []).includes(tag),
                  ).length;

                  return (
                    <button
                      key={tag}
                      onClick={() => onTagChange(tag)}
                      className={cn(
                        "flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[12px] font-medium transition focus:outline-none",
                        selectedTag === tag
                          ? "bg-emerald-600 text-white"
                          : "text-slate-500 hover:text-slate-800",
                      )}
                    >
                      {tag}
                      <span
                        className={cn(
                          "rounded px-1 py-px text-[10px] font-semibold",
                          selectedTag === tag
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            <div className="space-y-px">
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-2.5">
                    <div className="mt-0.5 h-10 w-10 shrink-0 animate-pulse rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div
                        className="h-3 animate-pulse rounded bg-slate-100"
                        style={{ width: `${50 + (i % 3) * 15}%` }}
                      />
                      <div
                        className="h-2.5 animate-pulse rounded bg-slate-100"
                        style={{ width: `${60 + (i % 4) * 10}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : conversations.length ? (
                <>
                  {conversations.map((conversation) => (
                    <ConversationCard
                      key={conversation.id}
                      conversation={conversation}
                      active={activeConversationId === conversation.id}
                      onClick={() => onConversationSelect(conversation.id)}
                    />
                  ))}

                  {hasMoreConversations && (
                    <button
                      type="button"
                      onClick={onLoadMoreConversations}
                      disabled={isLoadingMoreConversations}
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-[12.5px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isLoadingMoreConversations ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                          Loading…
                        </>
                      ) : (
                        "Load older conversations"
                      )}
                    </button>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                    <Search className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="text-[13.5px] font-medium text-slate-800">
                    No conversations found
                  </p>
                  <p className="mt-1 text-[12.5px] text-slate-400">
                    Try a different keyword or filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
