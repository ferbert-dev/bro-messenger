export const state = {
  chats: [],
  filteredChats: [],
  authToken: null,
  currentUserId: null,
  activeChatId: null,
  messageCache: new Map(),
  socket: null,
  pendingSocketActions: [],
  currentUserProfile: null,
  pendingAvatarData: null,
  pendingChatAvatarData: null,
};
