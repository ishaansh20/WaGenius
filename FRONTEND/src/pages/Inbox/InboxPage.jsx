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

function getTagStyles(tag = "") {
  const normalized = tag.toLowerCase();

  const preset = {
    "hot lead": "bg-red-50 text-red-700 border border-red-100",
    complaint: "bg-amber-50 text-amber-700 border border-amber-100",
    vip: "bg-purple-50 text-purple-700 border border-purple-100",
    interested: "bg-blue-50 text-blue-700 border border-blue-100",
    "follow up": "bg-orange-50 text-orange-700 border border-orange-100",
    "existing customer":
      "bg-emerald-50 text-emerald-700 border border-emerald-100",
  };

  if (preset[normalized]) {
    return preset[normalized];
  }

  const palettes = [
    "bg-pink-50 text-pink-700 border border-pink-100",
    "bg-cyan-50 text-cyan-700 border border-cyan-100",
    "bg-indigo-50 text-indigo-700 border border-indigo-100",
    "bg-lime-50 text-lime-700 border border-lime-100",
    "bg-teal-50 text-teal-700 border border-teal-100",
  ];

  const index =
    tag.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    palettes.length;

  return palettes[index];
}

function getAvailableTags(contactTags = []) {
  return [...new Set([...DEFAULT_TAGS, ...contactTags])];
}

export function InboxPage() {
  const [state, dispatch] = useReducer(inboxReducer, initialInboxState);
  const [composer, setComposer] = useState("");
  const [contactDrawerOpen, setContactDrawerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
    <div className="h-[100dvh] overflow-hidden bg-[#f5f6f8] text-slate-900 lg:pl-[80px]">
      <MobileSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <aside className="hidden lg:block">
        <MiniSidebar />
      </aside>
      <div className="mx-auto flex h-full w-full  overflow-hidden">
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
              className="fixed inset-0 z-40 bg-slate-950/25 backdrop-blur-[2px]"
              onClick={handleCloseContactDrawer}
            />

            <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[340px] flex-col border-l border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <div className="flex items-center justify-between border-b border-slate-200 bg-[#f0f2f5] px-5 py-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                    Contact info
                  </p>
                  <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-slate-950">
                    Details
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleCloseContactDrawer}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-slate-200 text-base font-semibold text-slate-700 shadow-sm">
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
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            type="text"
                            value={nameValue}
                            onChange={(e) => setNameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveName();
                              if (e.key === "Escape") handleCancelEditName();
                            }}
                            className="h-8 w-full rounded-md border border-emerald-300 bg-white px-2 text-[15px] outline-none focus:ring-1 focus:ring-emerald-200"
                          />
                          <button
                            type="button"
                            disabled={savingName}
                            onClick={handleSaveName}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-emerald-600 hover:bg-emerald-50"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditName}
                            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleStartEditName}
                          className="group flex items-center gap-1.5 text-left"
                          title="Click to edit name"
                        >
                          <h3 className="truncate text-[18px] font-semibold tracking-[-0.02em] text-slate-950">
                            {activeConversation.contact.name}
                          </h3>
                          <Pencil className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:opacity-100" />
                        </button>
                      )}
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {activeConversation.contact.phone}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Status
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {activeConversation.online ? "Online" : "Offline"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Unread
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {activeUnreadCount}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Agent status
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {activeConversation.assignedAgent?.name || "Unassigned"}
                      </p>
                    </div>

                    <div className="col-span-2 rounded-2xl bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        AI
                      </p>
                      <p className="mt-1 font-medium text-slate-950">
                        {activeConversation.aiEnabled
                          ? "AI enabled"
                          : "Human mode"}
                      </p>
                    </div>

                    <div className="col-span-2 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                          Consent
                        </p>
                        <p
                          className={`mt-1 font-medium ${
                            activeConversation.contact.optedOut
                              ? "text-rose-600"
                              : "text-slate-950"
                          }`}
                        >
                          {activeConversation.contact.optedOut
                            ? "Opted out"
                            : "Opted in"}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleConsent}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                      >
                        {activeConversation.contact.optedOut
                          ? "Opt back in"
                          : "Opt out"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        Labels / Tags
                      </p>

                      <button
                        type="button"
                        onClick={() => setShowTagMenu((prev) => !prev)}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
                      >
                        + Add Tag
                      </button>
                    </div>

                    {showTagMenu && (
                      <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
                          <input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Create custom tag"
                            className="w-full min-w-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-emerald-300"
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
                            className="w-full shrink-0 rounded-full bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 sm:w-auto"
                          >
                            Add
                          </button>
                        </div>
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
                                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                                  selected
                                    ? getTagStyles(tag)
                                    : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                                }`}
                              >
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
                            className={`rounded-full px-3 py-1 text-xs font-medium ${getTagStyles(tag)}`}
                          >
                            {tag}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500">
                          No labels added
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <button
                      type="button"
                      onClick={handleToggleAi}
                      className="flex w-full items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <span>
                        {activeConversation.aiEnabled
                          ? "Disable AI"
                          : "Enable AI"}
                      </span>
                      <Sparkles className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
