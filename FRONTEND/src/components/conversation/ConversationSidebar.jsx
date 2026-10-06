import { ChevronDown, MessageSquareText, Search, X, Menu } from "lucide-react";
import { Virtuoso } from "react-virtuoso";
import { cn } from "../../utils/cn";
import { formatPhone } from "../../utils/formatPhone";

// Tags are labels, not status: one calm neutral style for all of them.
const TAG_CHIP =
  "inline-flex shrink-0 items-center rounded-full border border-line bg-canvas px-2 py-0.5 text-[12px] font-medium leading-none text-ink-muted";

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
    <div className="px-2 py-0.5">
      <button
        type="button"
        onClick={onClick}
        aria-current={active ? "true" : undefined}
        className={cn(
          "group relative flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150",
          active ? "bg-brand-50" : "hover:bg-canvas",
        )}
      >
        {active && (
          <span className="absolute inset-y-3 left-0 w-[3px] rounded-r bg-brand-600" />
        )}

        {/* Avatar */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-[14px] font-semibold text-brand-800 ring-1 ring-brand-100">
          {conversation.contact.profilePic ? (
            <img
              src={conversation.contact.profilePic}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <span>{getInitials(displayName)}</span>
          )}
          {conversation.online && (
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-brand-500" />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3
              className={cn(
                "truncate text-[15px] leading-snug text-ink",
                unread ? "font-semibold" : "font-medium",
              )}
            >
              {displayName}
            </h3>
            <span
              className={cn(
                "shrink-0 text-[12px] tabular-nums",
                unread ? "font-medium text-brand-700" : "text-ink-muted",
              )}
            >
              {formatCardTime(conversation.lastMessageTime)}
            </span>
          </div>

          <div className="mt-0.5 flex items-center justify-between gap-2">
            <p
              className={cn(
                "min-w-0 truncate text-[14px] leading-snug",
                unread ? "text-ink" : "text-ink-muted",
              )}
            >
              {conversation.lastMessage || "No messages yet"}
            </p>
            {unread && (
              <span
                className="inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[12px] font-semibold tabular-nums leading-none text-white"
                aria-label={`${conversation.unreadCount} unread`}
              >
                {conversation.unreadCount}
              </span>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-2 flex min-w-0 gap-1 overflow-hidden">
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className={TAG_CHIP}>
                  {tag}
                </span>
              ))}
              {tags.length > 2 && (
                <span className={TAG_CHIP}>+{tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </button>
    </div>
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

  const tagChipClass = (active) =>
    cn(
      "inline-flex h-8 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[13px] font-medium transition-colors focus:outline-none",
      active
        ? "border-brand-200 bg-brand-50 text-brand-800"
        : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
    );

  const tagCountClass = (active) =>
    cn(
      "rounded-full px-1.5 text-[12px] font-semibold tabular-nums",
      active ? "bg-brand-100 text-brand-800" : "bg-canvas text-ink-muted",
    );

  return (
    <>
      <aside
        className={cn(
          "shrink-0 border-r border-line bg-surface transition-[width,transform] duration-300",
          // Mobile (<768px): full-screen fixed overlay
          "fixed inset-y-0 left-0 z-40 w-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          // Tablet (768-1023px): static in flex layout, width-based collapse
          "md:relative md:inset-auto md:left-auto md:z-auto md:translate-x-0",
          mobileOpen ? "md:w-[300px]" : "md:w-0 md:overflow-hidden",
          // Desktop (1024px+): always visible
          "lg:w-[340px] xl:w-[360px] lg:overflow-visible",
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <button
                type="button"
                onClick={onOpenDashboard}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink lg:hidden"
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <h2 className="text-[20px] font-semibold leading-tight tracking-[-0.02em] text-ink">
                  Inbox
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-muted">
                  {totalConversationCount}{" "}
                  {totalConversationCount === 1 ? "conversation" : "conversations"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCloseMobile}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink lg:hidden"
              aria-label="Close conversation list"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search + Filters */}
          <div className="space-y-3 border-b border-line px-4 pb-3.5">
            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
              <input
                value={query}
                onChange={(event) => onQueryChange(event.target.value)}
                placeholder="Search name, phone or message…"
                aria-label="Search conversations"
                className="h-10 w-full rounded-lg border border-line-strong bg-surface pl-10 pr-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle hover:border-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
              />
            </div>

            {/* Assignment filter (segmented) */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label="Show conversations"
                className="inline-flex rounded-lg border border-line bg-surface p-1"
              >
                {ASSIGN_FILTERS.map(({ value, label }) => {
                  const active = filter === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => onFilterChange?.(value)}
                      className={cn(
                        "h-8 whitespace-nowrap rounded-md px-3 text-[14px] font-medium transition-colors focus:outline-none",
                        active
                          ? "bg-brand-900 text-white"
                          : "text-ink-muted hover:bg-canvas hover:text-ink",
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {isAdminOrLead && agents.length > 0 && (
                <div className="relative min-w-0 flex-1">
                  <select
                    value={agentFilterId}
                    onChange={(e) =>
                      onFilterChange?.(
                        e.target.value ? `agent:${e.target.value}` : "all",
                      )
                    }
                    aria-label="Filter by team member"
                    className={cn(
                      "h-10 w-full min-w-[120px] cursor-pointer appearance-none rounded-lg border pl-3 pr-8 text-[14px] font-medium outline-none transition-colors focus:ring-4 focus:ring-brand-600/12",
                      agentFilterId
                        ? "border-brand-900 bg-brand-900 text-white"
                        : "border-line-strong bg-surface text-ink-muted hover:border-ink-subtle",
                    )}
                  >
                    <option value="">By agent</option>
                    {agents.map((a) => (
                      <option key={a._id || a.id} value={a._id || a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className={cn(
                      "pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2",
                      agentFilterId ? "text-white" : "text-ink-subtle",
                    )}
                  />
                </div>
              )}
            </div>

            {/* Tag filter */}
            <div className="-mx-4 overflow-x-auto px-4 scrollbar-hide">
              <div className="flex w-max items-center gap-1.5 pr-2">
                <button
                  type="button"
                  onClick={() => onTagChange("all")}
                  className={tagChipClass(selectedTag === "all")}
                >
                  All tags
                  <span className={tagCountClass(selectedTag === "all")}>
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
                      type="button"
                      onClick={() => onTagChange(tag)}
                      className={tagChipClass(selectedTag === tag)}
                    >
                      {tag}
                      <span className={tagCountClass(selectedTag === tag)}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Conversation list */}
          <div className="min-h-0 flex-1 py-2">
            {loading ? (
              <div className="space-y-1 px-2">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-3 px-3 py-3">
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-canvas" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div
                        className="h-3.5 animate-pulse rounded bg-canvas"
                        style={{ width: `${50 + (i % 3) * 15}%` }}
                      />
                      <div
                        className="h-3 animate-pulse rounded bg-canvas"
                        style={{ width: `${60 + (i % 4) * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length ? (
              <Virtuoso
                style={{ height: "100%" }}
                data={conversations}
                endReached={() => {
                  if (hasMoreConversations && !isLoadingMoreConversations) {
                    onLoadMoreConversations();
                  }
                }}
                itemContent={(index, conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    active={activeConversationId === conversation.id}
                    onClick={() => onConversationSelect(conversation.id)}
                  />
                )}
                components={{
                  Footer: () =>
                    isLoadingMoreConversations ? (
                      <div className="flex items-center justify-center gap-2 py-3 text-[13px] font-medium text-ink-muted">
                        <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-line-strong border-t-brand-600" />
                        Loading more…
                      </div>
                    ) : null,
                }}
              />
            ) : (
              <div className="mx-4 mt-4 flex flex-col items-center justify-center rounded-2xl bg-canvas px-6 py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface shadow-[var(--shadow-card)]">
                  <MessageSquareText className="h-5 w-5 text-brand-600" />
                </div>
                <p className="text-[15px] font-semibold text-ink">
                  No conversations found
                </p>
                <p className="mt-1 text-[14px] text-ink-muted">
                  Try a different search word or filter.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
