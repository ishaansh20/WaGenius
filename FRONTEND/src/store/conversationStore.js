export const initialInboxState = {
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  filter: "all",
  query: "",
  theme: "light",
  mobileListOpen: true,
  isLoadingConversations: true,
  isLoadingMessages: false,
  isSending: false,
  typingConversationId: null,
  agentAssignments: {},
  hasMoreConversations: false,
  nextConversationsCursor: null,
  isLoadingMoreConversations: false,
};

export function normalizeConversation(conversation) {
  const contact = conversation.contact || {};

  return {
    id: conversation._id || conversation.id,
    contact: {
      id:
        contact._id || contact.id || conversation.contactId || conversation.id,
      name: contact.name || conversation.name || contact.phone || "",
      phone: contact.phone || conversation.phone || "",
      profilePic: contact.profilePic || "",
      tags: contact.tags || conversation.tags || [],
      optedOut: Boolean(contact.optedOut),
    },
    status: conversation.status || "AI_ACTIVE",
    escalationReason: conversation.escalationReason || null,
    assignedAgent: (function () {
      const raw = conversation.assignedAgent;
      if (!raw) return null;
      if (typeof raw === "object")
        return { id: raw._id || raw.id || "", name: raw.name || raw.username || raw.email || "" };
      return { id: raw, name: raw };
    })(),
    aiEnabled:
      typeof conversation.aiEnabled === "boolean"
        ? conversation.aiEnabled
        : conversation.status !== "HUMAN_PENDING",
    lastMessage: conversation.lastMessage || contact.lastMessage || "",
    unreadCount: conversation.unreadCount || 0,
    lastMessageTime:
      conversation.lastMessageTime ||
      conversation.updatedAt ||
      conversation.createdAt ||
      new Date().toISOString(),
    online:
      typeof conversation.online === "boolean"
        ? conversation.online
        : Boolean(conversation.contact?.online),
    labels: conversation.labels || [],
  };
}

export function normalizeMessage(message) {
  const conversationId =
    message.conversation?._id ||
    message.conversation?.id ||
    message.conversationId ||
    message.conversation;

  return {
    id:
      message._id ||
      message.id ||
      `${conversationId || "msg"}-${message.createdAt || Date.now()}`,

    conversationId,

    sender: message.sender || "agent",
    senderName: message.senderName || null,
    content: message.content || message.message || "",
    mediaUrl: message.mediaUrl || "",
    mediaType: message.mediaType || "",
    messageType: message.messageType || "text",
    status: message.status || "sent",
    createdAt: message.createdAt || new Date().toISOString(),
    optimistic: Boolean(message.optimistic),
  };
}

export function conversationMatchesFilter(conversation, filter, currentUserId) {
  if (filter === "unread") return conversation.unreadCount > 0;
  if (filter === "ai") return conversation.aiEnabled;
  if (filter === "human")
    return !conversation.aiEnabled || conversation.status === "HUMAN_PENDING";
  if (filter === "mine")
    return conversation.assignedAgent?.id === currentUserId;
  if (filter === "unassigned") return !conversation.assignedAgent;
  if (filter.startsWith("agent:")) {
    const agentId = filter.slice(6);
    return conversation.assignedAgent?.id === agentId;
  }
  return true;
}

function sortConversations(conversations) {
  return [...conversations].sort(
    (left, right) =>
      new Date(right.lastMessageTime).getTime() -
      new Date(left.lastMessageTime).getTime(),
  );
}

function upsertConversation(list, updatedConversation) {
  const normalized = normalizeConversation(updatedConversation);
  const index = list.findIndex((item) => item.id === normalized.id);

  if (index === -1) {
    return sortConversations([normalized, ...list]);
  }

  const next = [...list];
  next[index] = {
    ...next[index],
    ...normalized,
    contact: {
      ...next[index].contact,
      ...normalized.contact,
    },
  };

  return sortConversations(next);
}

// Merges an older page of conversations (fetched via "Load More", strictly
// older than everything already loaded) onto the end of the list. Dedupes
// by id defensively — a conversation could in principle have moved and
// been re-fetched already via a socket update in between.
function appendOlderConversations(list, olderConversations) {
  const existingIds = new Set(list.map((item) => item.id));
  const normalizedNew = olderConversations
    .map(normalizeConversation)
    .filter((item) => !existingIds.has(item.id));

  return sortConversations([...list, ...normalizedNew]);
}

function updateConversationMessage(list, conversationId, messageContent) {
  const index = list.findIndex((item) => item.id === conversationId);

  if (index === -1) {
    return list;
  }

  const next = [...list];
  next[index] = {
    ...next[index],
    lastMessage: messageContent.content,
    lastMessageTime: messageContent.createdAt || new Date().toISOString(),
    unreadCount:
      messageContent.sender === "user"
        ? next[index].unreadCount + 1
        : next[index].unreadCount,
  };

  return sortConversations(next);
}

function appendMessage(list, conversationId, message) {
  const normalizedMessage = normalizeMessage(message);
  const existingMessages = list[conversationId] || [];

  // Check if message already exists by ID
  const isDuplicate = existingMessages.some(
    (msg) => msg.id === normalizedMessage.id,
  );

  if (isDuplicate) {
    return list;
  }

  return {
    ...list,
    [conversationId]: [...existingMessages, normalizedMessage],
  };
}

function replaceOptimisticMessage(list, conversationId, tempId, message) {
  const messages = list[conversationId] || [];
  const index = messages.findIndex(
    (item) => item.id === tempId || item.optimistic,
  );

  if (index === -1) {
    return appendMessage(list, conversationId, message);
  }

  const nextMessages = [...messages];
  nextMessages[index] = {
    ...normalizeMessage(message),
    optimistic: false,
  };

  return {
    ...list,
    [conversationId]: nextMessages,
  };
}

function updateMessageStatus(list, conversationId, messageId, status) {
  const messages = list[conversationId] || [];

  return {
    ...list,
    [conversationId]: messages.map((msg) =>
      msg.id === messageId
        ? {
            ...msg,
            status,
          }
        : msg,
    ),
  };
}

export function inboxReducer(state, action) {
  switch (action.type) {
    case "SET_CONVERSATIONS":
      return {
        ...state,
        conversations: sortConversations(
          (action.payload.conversations || []).map(normalizeConversation),
        ),
        hasMoreConversations: Boolean(action.payload.hasMore),
        nextConversationsCursor: action.payload.nextCursor || null,
        isLoadingConversations: false,
      };
    case "APPEND_OLDER_CONVERSATIONS":
      return {
        ...state,
        conversations: appendOlderConversations(
          state.conversations,
          action.payload.conversations || [],
        ),
        hasMoreConversations: Boolean(action.payload.hasMore),
        nextConversationsCursor: action.payload.nextCursor || null,
        isLoadingMoreConversations: false,
      };
    case "SET_LOADING_MORE_CONVERSATIONS":
      return {
        ...state,
        isLoadingMoreConversations: action.payload,
      };
    case "UPSERT_CONVERSATION":
      return {
        ...state,
        conversations: upsertConversation(state.conversations, action.payload),
      };
    case "UPDATE_ACTIVE_CONVERSATION":
      return {
        ...state,
        conversations: updateConversationMessage(
          state.conversations,
          action.payload.conversationId,
          action.payload.message,
        ),
      };
    case "SET_ACTIVE_CONVERSATION":
      return {
        ...state,
        activeConversationId: action.payload,
        mobileListOpen: false,
      };
    case "SET_FILTER":
      return {
        ...state,
        filter: action.payload,
      };
    case "SET_QUERY":
      return {
        ...state,
        query: action.payload,
      };
    case "SET_THEME":
      return {
        ...state,
        theme: action.payload,
      };
    case "TOGGLE_MOBILE_LIST":
      return {
        ...state,
        mobileListOpen:
          typeof action.payload === "boolean"
            ? action.payload
            : !state.mobileListOpen,
      };
    case "SET_LOADING_MESSAGES":
      return {
        ...state,
        isLoadingMessages: action.payload,
      };
    case "SET_SENDING":
      return {
        ...state,
        isSending: action.payload,
      };
    case "SET_TYPING":
      return {
        ...state,
        typingConversationId: action.payload,
      };
    case "SET_MESSAGES":
      return {
        ...state,
        messagesByConversation: {
          ...state.messagesByConversation,
          [action.payload.conversationId]:
            action.payload.messages.map(normalizeMessage),
        },
      };
    case "APPEND_MESSAGE":
      return {
        ...state,
        messagesByConversation: appendMessage(
          state.messagesByConversation,
          action.payload.conversationId,
          action.payload.message,
        ),
      };
    case "CONFIRM_MESSAGE":
      return {
        ...state,
        messagesByConversation: replaceOptimisticMessage(
          state.messagesByConversation,
          action.payload.conversationId,
          action.payload.tempId,
          action.payload.message,
        ),
      };

    case "UPDATE_MESSAGE_STATUS":
      return {
        ...state,
        messagesByConversation: updateMessageStatus(
          state.messagesByConversation,
          action.payload.conversationId,
          action.payload.messageId,
          action.payload.status,
        ),
      };
    case "PREPEND_CONVERSATION_FROM_MESSAGE":
      return {
        ...state,
        conversations: updateConversationMessage(
          state.conversations,
          action.payload.conversationId,
          action.payload.message,
        ),
        messagesByConversation: appendMessage(
          state.messagesByConversation,
          action.payload.conversationId,
          action.payload.message,
        ),
      };
    case "APPLY_CONVERSATION_ASSIGNMENT":
      return {
        ...state,
        conversations: state.conversations.map((conv) =>
          conv.id === action.payload.conversationId
            ? {
                ...conv,
                assignedAgent: action.payload.assignedAgent
                  ? {
                      id:
                        action.payload.assignedAgent._id ||
                        action.payload.assignedAgent.id ||
                        "",
                      name:
                        action.payload.assignedAgent.name ||
                        action.payload.assignedAgent.username ||
                        action.payload.assignedAgent.email ||
                        "",
                    }
                  : null,
              }
            : conv,
        ),
      };
    case "MARK_READ":
      return {
        ...state,
        conversations: state.conversations.map((conversation) =>
          conversation.id === action.payload
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      };
    case "SET_INITIAL_FALLBACK":
      return {
        ...state,
        conversations: [],
        isLoadingConversations: false,
      };
    default:
      return state;
  }
}

export function filterConversationList(conversations, query, filter, currentUserId) {
  const trimmedQuery = query.trim().toLowerCase();

  return conversations.filter((conversation) => {
    const matchesTags = (conversation.contact.tags || []).some((tag) =>
      tag.toLowerCase().includes(trimmedQuery),
    );

    const matchesQuery =
      !trimmedQuery ||
      conversation.contact.name.toLowerCase().includes(trimmedQuery) ||
      conversation.contact.phone.toLowerCase().includes(trimmedQuery) ||
      conversation.lastMessage.toLowerCase().includes(trimmedQuery) ||
      matchesTags;

    return matchesQuery && conversationMatchesFilter(conversation, filter, currentUserId);
  });
}
