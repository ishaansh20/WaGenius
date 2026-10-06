import {
  useCallback,
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import { MiniSidebar } from "../../components/layout/MiniSidebar";
import { useSidebarOffset } from "../../store/uiStore";
import { ConversationSidebar } from "../../components/conversation/ConversationSidebar";
import { ChatPanel } from "../../components/chat/ChatPanel";
import {
  assignConversation,
  fetchAgents,
  fetchConversations,
  fetchMessages,
  markConversationRead,
  sendInboxMessage,
  toggleConversationAi,
  updateContact,
  updateContactTags,
  updateContactConsent,
} from "../../services/api";
import useAuthStore from "../../store/authStore";
import toast from "react-hot-toast";
import { getInboxSocket, joinRoom, leaveRoom } from "../../services/socket";
import {
  filterConversationList,
  initialInboxState,
  inboxReducer,
  normalizeMessage,
} from "../../store/conversationStore";
import MobileSidebar from "../../components/layout/MobileSidebar";

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const DEFAULT_TAGS = [
  "Hot Lead",
  "Interested",
  "Existing Customer",
  "Follow Up",
  "VIP",
  "Complaint",
];

// Tags use one calm brand tint (no rainbow colours).
const TAG_SELECTED = "border border-brand-200 bg-brand-50 text-brand-800";

function DrawerSection({ title, action, children }) {
  return (
    <section className="rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-[var(--shadow-card)]">
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h3 className="text-[15px] font-semibold text-ink">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[14px] font-medium text-ink">{children}</dd>
    </div>
  );
}

function getAvailableTags(contactTags = []) {
  return [...new Set([...DEFAULT_TAGS, ...contactTags])];
}

export function InboxPage() {
  const [state, dispatch] = useReducer(inboxReducer, initialInboxState);
  const [composer, setComposer] = useState("");
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarOffset = useSidebarOffset();
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [selectedTag, setSelectedTag] = useState("all");
  const [agents, setAgents] = useState([]);

  const currentUser = useAuthStore((s) => s.user);

  const messagesContainerRef = useRef(null);

  const hasInitializedConversationRef = useRef(false);

  const location = useLocation();
  const targetPhone = location.state?.targetPhone;

  const deferredQuery = useDeferredValue(state.query);
  const messagesEndRef = useRef(null);

  const allTags = useMemo(
    () => [
      ...new Set(
        state.conversations.flatMap(
          (conversation) => conversation.contact.tags || [],
        ),
      ),
    ],
    [state.conversations],
  );

  const activeConversation = useMemo(
    () =>
      state.conversations.find(
        (conversation) => conversation.id === state.activeConversationId,
      ) || null,
    [state.activeConversationId, state.conversations],
  );

  const currentUserId = currentUser?._id || currentUser?.id;

  const filteredConversations = useMemo(() => {
    const filtered = filterConversationList(
      state.conversations,
      deferredQuery,
      state.filter,
      currentUserId,
    );

    return filtered.filter((conversation) => {
      if (selectedTag === "all") return true;

      return (conversation.contact.tags || []).includes(selectedTag);
    });
  }, [
    deferredQuery,
    state.conversations,
    state.filter,
    selectedTag,
    currentUserId,
  ]);

  const activeMessages = useMemo(
    () => state.messagesByConversation[state.activeConversationId] || [],
    [state.activeConversationId, state.messagesByConversation],
  );

  useLayoutEffect(() => {
    if (!messagesContainerRef.current) return;

    messagesContainerRef.current.scrollTop =
      messagesContainerRef.current.scrollHeight;
  }, [activeMessages]);
  const activeUnreadCount = activeConversation?.unreadCount || 0;
  const isContactDrawerOpen = contactDrawerOpen && Boolean(activeConversation);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
  }, [state.theme]);

  useEffect(() => {
    let mounted = true;

    async function loadConversations() {
      try {
        const result = await fetchConversations({ limit: 50 });
        if (!mounted) return;

        dispatch({ type: "SET_CONVERSATIONS", payload: result });
      } catch {
        if (!mounted) return;

        dispatch({
          type: "SET_CONVERSATIONS",
          payload: { conversations: [], hasMore: false, nextCursor: null },
        });
      }
    }

    loadConversations();

    return () => {
      mounted = false;
    };
  }, []);

  // Separate from the message-listener effect below (which re-subscribes
  // on every new message) — room membership should only change on mount/
  // unmount, not every time a message arrives.
  useEffect(() => {
    joinRoom("inbox");
    return () => leaveRoom("inbox");
  }, []);

  const loadMoreConversations = useCallback(async () => {
    if (state.isLoadingMoreConversations || !state.hasMoreConversations) return;

    dispatch({ type: "SET_LOADING_MORE_CONVERSATIONS", payload: true });
    try {
      const result = await fetchConversations({
        before: state.nextConversationsCursor,
        limit: 50,
      });
      dispatch({ type: "APPEND_OLDER_CONVERSATIONS", payload: result });
    } catch {
      dispatch({ type: "SET_LOADING_MORE_CONVERSATIONS", payload: false });
    }
  }, [
    state.isLoadingMoreConversations,
    state.hasMoreConversations,
    state.nextConversationsCursor,
  ]);

  const loadMoreMessages = useCallback(async () => {
    const conversationId = state.activeConversationId;
    if (!conversationId || state.isLoadingMoreMessages) return;

    const meta = state.messagesMetaByConversation[conversationId];
    if (!meta?.hasMore) return;

    dispatch({ type: "SET_LOADING_MORE_MESSAGES", payload: true });
    try {
      const result = await fetchMessages(conversationId, {
        before: meta.nextCursor,
        limit: 50,
      });
      dispatch({
        type: "PREPEND_OLDER_MESSAGES",
        payload: {
          conversationId,
          messages: result.messages,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        },
      });
    } catch {
      dispatch({ type: "SET_LOADING_MORE_MESSAGES", payload: false });
    }
  }, [
    state.activeConversationId,
    state.isLoadingMoreMessages,
    state.messagesMetaByConversation,
  ]);

  useEffect(() => {
    fetchAgents()
      .then(setAgents)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hasInitializedConversationRef.current) {
      return;
    }

    // First priority:
    // open inbox conversation from route state only once on initial load.
    if (targetPhone && state.conversations.length > 0) {
      const matchedConversation = state.conversations.find(
        (conversation) => conversation.contact.phone === targetPhone,
      );

      if (
        matchedConversation &&
        matchedConversation.id !== state.activeConversationId
      ) {
        dispatch({
          type: "SET_ACTIVE_CONVERSATION",
          payload: matchedConversation.id,
        });

        hasInitializedConversationRef.current = true;

        return;
      }
    }

    // fallback behavior
  }, [
    filteredConversations,
    state.activeConversationId,
    state.conversations,
    targetPhone,
  ]);

  useEffect(() => {
    if (!state.activeConversationId) return;

    let mounted = true;

    async function loadMessages() {
      try {
        const messages = await fetchMessages(state.activeConversationId);
        if (!mounted) return;

        dispatch({
          type: "SET_MESSAGES",
          payload: {
            conversationId: state.activeConversationId,
            messages: messages.messages || messages, // backend now returns { messages, hasMore, nextCursor }
            hasMore: messages.hasMore,
            nextCursor: messages.nextCursor,
          },
        });
      } catch {
        if (!mounted) return;

        dispatch({
          type: "SET_MESSAGES",
          payload: {
            conversationId: state.activeConversationId,
            messages: [],
          },
        });
      } finally {
        if (mounted) {
          dispatch({ type: "SET_LOADING_MESSAGES", payload: false });
          dispatch({ type: "MARK_READ", payload: state.activeConversationId });
          markConversationRead(state.activeConversationId).catch(
            () => undefined,
          );
        }
      }
    }

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [state.activeConversationId]);

  useEffect(() => {
    const socket = getInboxSocket();
    const handleNewMessage = (payload) => {
      const normalizedMessage = normalizeMessage(payload);
      const targetConversationId = normalizedMessage.conversationId;

      if (!targetConversationId) return;

      const existingMessages =
        state.messagesByConversation[targetConversationId] || [];

      // Check if message already exists by ID (most reliable check)
      const messageExists = existingMessages.some(
        (msg) => msg.id === normalizedMessage.id,
      );

      if (messageExists) {
        // Message already in state, skip
        return;
      }

      // Check if we have an optimistic message for this one
      const optimisticMessage = existingMessages.find((msg) => msg.optimistic);

      if (
        state.activeConversationId === targetConversationId &&
        optimisticMessage &&
        optimisticMessage.content === normalizedMessage.content &&
        optimisticMessage.sender === normalizedMessage.sender
      ) {
        // Confirm the optimistic message with the server ID
        dispatch({
          type: "CONFIRM_MESSAGE",
          payload: {
            conversationId: targetConversationId,
            tempId: optimisticMessage.id,
            message: normalizedMessage,
          },
        });
      } else if (state.activeConversationId === targetConversationId) {
        // Regular message append
        dispatch({
          type: "APPEND_MESSAGE",
          payload: {
            conversationId: targetConversationId,
            message: normalizedMessage,
          },
        });
      }

      // Update conversation metadata in conversation list
      dispatch({
        type: "UPDATE_ACTIVE_CONVERSATION",
        payload: {
          conversationId: targetConversationId,
          message: normalizedMessage,
        },
      });
    };

    const handleConversationUpdated = (payload) => {
      dispatch({ type: "UPSERT_CONVERSATION", payload });
    };

    const handleMessageStatusUpdated = (message) => {
      dispatch({
        type: "UPDATE_MESSAGE_STATUS",
        payload: {
          conversationId:
            message.conversation?._id ||
            message.conversation?.id ||
            message.conversationId ||
            message.conversation,

          messageId: message._id || message.id,
          status: message.status,
        },
      });
    };

    const handleConversationAssigned = (payload) => {
      dispatch({ type: "APPLY_CONVERSATION_ASSIGNMENT", payload });
    };

    socket.on("new_message", handleNewMessage);
    socket.on("conversation_updated", handleConversationUpdated);
    socket.on("message_status_updated", handleMessageStatusUpdated);
    socket.on("conversation_assigned", handleConversationAssigned);

    return () => {
      socket.off("new_message", handleNewMessage);
      socket.off("conversation_updated", handleConversationUpdated);
      socket.off("message_status_updated", handleMessageStatusUpdated);
      socket.off("conversation_assigned", handleConversationAssigned);
    };
  }, [state.activeConversationId, state.messagesByConversation]);

  const handleConversationSelect = (conversationId) => {
    hasInitializedConversationRef.current = true;
    dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: conversationId });
    dispatch({ type: "MARK_READ", payload: conversationId });
    markConversationRead(conversationId).catch(() => undefined);
  };

  const handleSend = async () => {
    if (state.isSending) return;

    const messageText = composer.trim();
    if (!messageText || !activeConversation) return;

    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempMessage = {
      id: tempId,
      conversationId: activeConversation.id,
      sender: "agent",
      content: messageText,
      status: "sending",
      createdAt: new Date().toISOString(),
      optimistic: true,
    };

    // Append optimistic message
    dispatch({
      type: "APPEND_MESSAGE",
      payload: { conversationId: activeConversation.id, message: tempMessage },
    });

    // Update conversation last message
    dispatch({
      type: "UPDATE_ACTIVE_CONVERSATION",
      payload: {
        conversationId: activeConversation.id,
        message: tempMessage,
      },
    });

    setComposer("");
    dispatch({ type: "SET_SENDING", payload: true });

    try {
      const response = await sendInboxMessage({
        phone: activeConversation.contact.phone,
        message: messageText,
        sender: "agent",
      });

      // Get confirmed message from API response
      const confirmedMessage = normalizeMessage(
        response?.data || {
          id: tempId,
          conversationId: activeConversation.id,
          sender: "agent",
          content: messageText,
          status: "sent",
          createdAt: new Date().toISOString(),
        },
      );

      // Replace optimistic with confirmed
      dispatch({
        type: "CONFIRM_MESSAGE",
        payload: {
          conversationId: activeConversation.id,
          tempId,
          message: confirmedMessage,
        },
      });
    } catch {
      // Revert optimistic message on error
      dispatch({
        type: "SET_MESSAGES",
        payload: {
          conversationId: activeConversation.id,
          messages: (
            state.messagesByConversation[activeConversation.id] || []
          ).filter((msg) => msg.id !== tempId),
        },
      });
      setComposer(messageText);
    } finally {
      dispatch({ type: "SET_SENDING", payload: false });
    }
  };

  const handleToggleAi = async () => {
    if (!activeConversation) return;

    const nextAiEnabled = !activeConversation.aiEnabled;
    dispatch({
      type: "UPSERT_CONVERSATION",
      payload: {
        _id: activeConversation.id,
        contact: activeConversation.contact,
        status: nextAiEnabled ? "AI_ACTIVE" : "HUMAN_PENDING",
        assignedAgent: activeConversation.assignedAgent,
        aiEnabled: nextAiEnabled,
        lastMessage: activeConversation.lastMessage,
        unreadCount: activeConversation.unreadCount,
        lastMessageTime: activeConversation.lastMessageTime,
        online: activeConversation.online,
      },
    });

    toggleConversationAi(activeConversation.id, nextAiEnabled).catch(
      () => undefined,
    );
  };

  const handleOpenConversationList = () => {
    dispatch({ type: "TOGGLE_MOBILE_LIST", payload: true });
  };

  const handleOpenContactDrawer = () => {
    if (!activeConversation) return;
    setContactDrawerOpen(true);
  };

  const handleCloseContactDrawer = () => {
    setContactDrawerOpen(false);
  };

  const handleToggleConsent = async () => {
    if (!activeConversation) return;
    try {
      await updateContactConsent(
        activeConversation.contact.id,
        !activeConversation.contact.optedOut,
      );
    } catch {
      toast.error("Failed to update consent status");
    }
  };

  const handleStartEditName = () => {
    if (!activeConversation) return;
    setNameValue(activeConversation.contact.name || "");
    setEditingName(true);
  };

  const handleCancelEditName = () => {
    setEditingName(false);
    setNameValue("");
  };

  const handleSaveName = async () => {
    if (!activeConversation) return;
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === activeConversation.contact.name) {
      setEditingName(false);
      return;
    }
    try {
      setSavingName(true);
      await updateContact(activeConversation.contact.id, { name: trimmed });
      setEditingName(false);
    } catch {
      toast.error("Failed to update contact name");
    } finally {
      setSavingName(false);
    }
  };

  const handleAssignAgent = async (agentId) => {
    if (!activeConversation) return;
    try {
      const result = await assignConversation(activeConversation.id, agentId);
      dispatch({
        type: "UPSERT_CONVERSATION",
        payload: result.conversation || result,
      });
    } catch {
      toast.error("Failed to assign conversation");
    }
  };

  return (
    <div className={`h-[100dvh] overflow-hidden bg-canvas text-ink transition-[padding] duration-200 ${sidebarOffset}`}>
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <aside className="hidden lg:block">
        <MiniSidebar />
      </aside>
      <div className="mx-auto flex h-full w-full overflow-hidden">
        <ConversationSidebar
          onOpenDashboard={() => setSidebarOpen(true)}
          mobileOpen={state.mobileListOpen}
          dashboardOpen={sidebarOpen}
          onCloseDashboard={() => setSidebarOpen(false)}
          conversations={filteredConversations}
          allConversations={state.conversations}
          totalConversationCount={state.conversations.length}
          query={state.query}
          filter={state.filter}
          onQueryChange={(value) =>
            dispatch({ type: "SET_QUERY", payload: value })
          }
          onFilterChange={(value) =>
            dispatch({ type: "SET_FILTER", payload: value })
          }
          selectedTag={selectedTag}
          onTagChange={setSelectedTag}
          allTags={allTags}
          activeConversationId={state.activeConversationId}
          onConversationSelect={handleConversationSelect}
          loading={state.isLoadingConversations}
          onCloseMobile={() =>
            dispatch({ type: "TOGGLE_MOBILE_LIST", payload: false })
          }
          agents={agents}
          currentUser={currentUser}
          hasMoreConversations={state.hasMoreConversations}
          isLoadingMoreConversations={state.isLoadingMoreConversations}
          onLoadMoreConversations={loadMoreConversations}
        />

        <ChatPanel
          conversation={activeConversation}
          messagesContainerRef={messagesContainerRef}
          messages={activeMessages}
          endRef={messagesEndRef}
          hasMoreMessages={
            state.messagesMetaByConversation[state.activeConversationId]?.hasMore || false
          }
          isLoadingMoreMessages={state.isLoadingMoreMessages}
          onLoadMoreMessages={loadMoreMessages}
          onBack={() => dispatch({ type: "TOGGLE_MOBILE_LIST", payload: true })}
          onToggleAi={handleToggleAi}
          composerValue={composer}
          onComposerChange={setComposer}
          onSend={handleSend}
          sending={state.isSending}
          loadingMessages={state.isLoadingMessages}
          typing={state.typingConversationId === state.activeConversationId}
          onOpenContactDrawer={handleOpenContactDrawer}
          onOpenConversationList={handleOpenConversationList}
          contactDrawerOpen={contactDrawerOpen}
          agents={agents}
          currentUser={currentUser}
          onAssign={handleAssignAgent}
        />
      </div>

      <AnimatePresence>
        {isContactDrawerOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-ink/25 lg:hidden"
              onClick={handleCloseContactDrawer}
            />

            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[360px] flex-col border-l border-line bg-canvas shadow-[var(--shadow-pop)] lg:shadow-none">
              <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4">
                <div className="min-w-0">
                  <h2 className="text-[17px] font-semibold text-ink">Contact details</h2>
                  <p className="mt-0.5 text-[13px] text-ink-muted">
                    Who you are chatting with
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCloseContactDrawer}
                  aria-label="Close contact details"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                {/* Identity */}
                <DrawerSection>
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-[17px] font-semibold text-brand-800 ring-1 ring-brand-100">
                      {activeConversation.contact.profilePic ? (
                        <img
                          src={activeConversation.contact.profilePic}
                          alt={activeConversation.contact.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span>
                          {getInitials(activeConversation.contact.name)}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      {editingName ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            type="text"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveName();
                              if (e.key === "Escape") handleCancelEditName();
                            }}
                            aria-label="Contact name"
                            className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-[15px] text-ink outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
                          />
                          <button
                            type="button"
                            disabled={savingName}
                            onClick={handleSaveName}
                            aria-label="Save name"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-white transition-colors hover:bg-brand-800 disabled:opacity-55"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditName}
                            aria-label="Cancel editing name"
                            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-canvas hover:text-ink"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartEditName}
                          className="group flex max-w-full items-center gap-1.5 text-left"
                          title="Click to edit name"
                        >
                          <h3 className="truncate text-[17px] font-semibold text-ink">
                            {activeConversation.contact.name}
                          </h3>
                          <Pencil className="h-4 w-4 shrink-0 text-ink-muted transition-colors group-hover:text-brand-700" />
                        </button>
                      )}
                      <p className="mt-1 truncate text-[14px] tabular-nums text-ink-muted">
                        {activeConversation.contact.phone}
                      </p>
                    </div>
                  </div>
                </DrawerSection>

                {/* Conversation facts */}
                <DrawerSection title="Conversation">
                  <dl className="divide-y divide-line">
                    <DetailRow label="Status">
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            activeConversation.online ? "bg-brand-500" : "bg-line-strong"
                          }`}
                        />
                        {activeConversation.online ? "Online" : "Offline"}
                      </span>
                    </DetailRow>
                    <DetailRow label="Unread messages">
                      <span className="tabular-nums">{activeUnreadCount}</span>
                    </DetailRow>
                    <DetailRow label="Assigned to">
                      {activeConversation.assignedAgent?.name || "Unassigned"}
                    </DetailRow>
                    <DetailRow label="Replies by">
                      {activeConversation.aiEnabled ? "AI enabled" : "Human mode"}
                    </DetailRow>
                  </dl>
                </DrawerSection>

                {/* Consent */}
                <DrawerSection title="Marketing consent">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p
                        className={`text-[14px] font-medium ${
                          activeConversation.contact.optedOut
                            ? "text-danger"
                            : "text-ink"
                        }`}
                      >
                        {activeConversation.contact.optedOut
                          ? "Opted out"
                          : "Opted in"}
                      </p>
                      <p className="mt-0.5 text-[13px] text-ink-muted">
                        {activeConversation.contact.optedOut
                          ? "Won't receive campaign messages"
                          : "Can receive campaign messages"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleToggleConsent}
                      className="inline-flex h-9 shrink-0 items-center rounded-lg border border-line-strong bg-surface px-3 text-[14px] font-medium text-ink transition-colors hover:bg-canvas"
                    >
                      {activeConversation.contact.optedOut
                        ? "Opt back in"
                        : "Opt out"}
                    </button>
                  </div>
                </DrawerSection>

                {/* Tags */}
                <DrawerSection
                  title="Tags"
                  action={
                    <button
                      type="button"
                      onClick={() => setShowTagMenu((prev) => !prev)}
                      aria-expanded={showTagMenu}
                      className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
                    >
                      {showTagMenu ? "Done" : "+ Add tag"}
                    </button>
                  }
                >
                  {showTagMenu && (
                    <div className="mb-4 rounded-xl border border-line bg-canvas p-3">
                      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                        <input
                          value={newTag}
                          onChange={(e) => setNewTag(e.target.value)}
                          placeholder="New tag name"
                          aria-label="New tag name"
                          className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand-600 focus:ring-4 focus:ring-brand-600/12"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const value = newTag.trim();

                            if (!value) return;

                            const current =
                              activeConversation.contact.tags || [];

                            if (current.includes(value)) {
                              setNewTag("");
                              return;
                            }

                            const updatedTags = [...current, value];

                            dispatch({
                              type: "UPSERT_CONVERSATION",
                              payload: {
                                ...activeConversation,
                                contact: {
                                  ...activeConversation.contact,
                                  tags: updatedTags,
                                },
                              },
                            });

                            updateContactTags(
                              activeConversation.contact.id ||
                                activeConversation.contact._id,
                              updatedTags,
                            ).catch(() => undefined);

                            setNewTag("");
                          }}
                          className="inline-flex h-10 w-full shrink-0 items-center justify-center rounded-lg bg-brand-900 px-4 text-[14px] font-medium text-white transition-colors hover:bg-brand-800 sm:w-auto"
                        >
                          Add
                        </button>
                      </div>
                      <p className="mb-2 text-[13px] text-ink-muted">
                        Tap a tag to add or remove it
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {getAvailableTags(
                          activeConversation.contact.tags,
                        ).map((tag) => {
                          const selected =
                            activeConversation.contact.tags?.includes(tag);

                          return (
                            <button
                              key={tag}
                              type="button"
                              aria-pressed={Boolean(selected)}
                              onClick={() => {
                                const current =
                                  activeConversation.contact.tags || [];

                                const updatedTags = selected
                                  ? current.filter((item) => item !== tag)
                                  : [...current, tag];

                                dispatch({
                                  type: "UPSERT_CONVERSATION",
                                  payload: {
                                    ...activeConversation,
                                    contact: {
                                      ...activeConversation.contact,
                                      tags: updatedTags,
                                    },
                                  },
                                });
                                updateContactTags(
                                  activeConversation.contact.id ||
                                    activeConversation.contact._id,
                                  updatedTags,
                                ).catch(() => undefined);
                              }}
                              className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-[13px] font-medium transition-colors ${
                                selected
                                  ? TAG_SELECTED
                                  : "border border-line-strong bg-surface text-ink-muted hover:text-ink"
                              }`}
                            >
                              {selected && <Check className="h-3.5 w-3.5" />}
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {(activeConversation.contact.tags || []).length > 0 ? (
                      activeConversation.contact.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-medium ${TAG_SELECTED}`}
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <p className="text-[14px] text-ink-muted">
                        No tags added yet
                      </p>
                    )}
                  </div>
                </DrawerSection>

                {/* AI */}
                <DrawerSection title="AI replies">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 text-[14px] text-ink-muted">
                      {activeConversation.aiEnabled
                        ? "AI is answering this customer for you."
                        : "You and your team are replying."}
                    </p>
                    <button
                      type="button"
                      onClick={handleToggleAi}
                      className={`inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[14px] font-medium transition-colors ${
                        activeConversation.aiEnabled
                          ? "border border-line-strong bg-surface text-ink hover:bg-canvas"
                          : "bg-brand-900 text-white hover:bg-brand-800"
                      }`}
                    >
                      <Sparkles className="h-4 w-4" />
                      {activeConversation.aiEnabled
                        ? "Disable AI"
                        : "Enable AI"}
                    </button>
                  </div>
                </DrawerSection>
              </div>
            </aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
