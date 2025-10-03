import {
  TOKEN_KEY,
  USER_KEY,
} from './chat.constants.js';
import { state } from './chat.state.js';
import { DOM } from './chat.dom.js';
import {
  loadCurrentUser,
  fetchChats,
  fetchChatDetails,
  fetchChatMessages,
  createChat,
  updateProfile,
  uploadUserAvatar,
} from './chat.api.js';
import {
  initSocket,
  subscribeToChat,
  sendChatMessage,
} from './chat.ws.js';
import {
  normalizeMessagePayload,
  cacheMessage,
  setMessages,
} from './chat.messages.js';
import {
  showStatus,
  showError,
  renderChatList,
  highlightChat,
  updateChatHeader,
  renderMessages,
  renderMessagesStatus,
  renderMessagesError,
  appendSystemNotice,
  appendMessageRow,
  setProfileButtonAvatar,
  setProfilePreview,
  setChatPreviewAvatar,
  resetCreateChatModal,
  setCreateChatError,
  resetProfileModal,
  setProfileError,
  setActiveChatPresence,
  setChatListPresence,
  refreshMessagePresence,
  scrollMessagesToBottom,
} from './chat.view.js';
import { getInitials, isImageFile, compressImageToLimit } from './chat.utils.js';

export async function initialize() {
  setupEventListeners();
  await bootstrap();
}

async function bootstrap() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    showError('Missing auth token. Please sign in again.');
    return;
  }
  state.authToken = token;

  try {
    const profile = await loadCurrentUser(token);
    state.currentUserProfile = profile;
    state.currentUserId = profile?.id || state.currentUserId;
    const initials = getInitials(profile?.name || profile?.email || 'User');
    const avatarUrl = profile?.avatarUrl || null;
    setProfileButtonAvatar(avatarUrl, initials);
    setProfilePreview(avatarUrl, initials);
    if (DOM.profileEmail) DOM.profileEmail.textContent = profile?.email || '';
    localStorage.setItem(USER_KEY, JSON.stringify(profile));
  } catch (err) {
    console.error(err);
  }

  initSocket(handleSocketMessage);

  renderMessagesStatus('Loading chats…');
  try {
    const chats = await fetchChats(token);
    state.chats = chats.map((chat) => ({
      id: chat.id,
      title: chat.title || 'Untitled chat',
      avatarUrl: chat.avatarUrl || null,
    }));
    state.filteredChats = [...state.chats];
    renderChatList(handleChatSelect);

    if (state.filteredChats.length) {
      if (isMobileViewport()) {
        highlightChat(state.filteredChats[0].id);
        showChatsListMobile();
      } else {
        const firstChat = state.filteredChats[0];
        selectChat(firstChat.id, { skipHighlight: true });
      }
    }
  } catch (err) {
    console.error(err);
    showError(err.message || 'Failed to load chats');
  }

  DOM.search?.addEventListener('input', handleSearch);
}

function setupEventListeners() {
  DOM.send?.addEventListener('click', handleSendMessage);
  DOM.input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  DOM.emojiBtn?.addEventListener('click', toggleEmojiPicker);
  DOM.emojiPickerPanel?.addEventListener('emoji-click', handleEmojiSelect);

  DOM.newChatBtn?.addEventListener('click', () => {
    resetCreateChatModal();
    DOM.newChatModal?.classList.add('open');
    DOM.newChatModal?.setAttribute('aria-hidden', 'false');
    DOM.chatTitleInput?.focus();
  });

  DOM.createChatCancel?.addEventListener('click', closeCreateChatModal);
  DOM.newChatModal?.addEventListener('click', (event) => {
    if (event.target === DOM.newChatModal) closeCreateChatModal();
  });
  DOM.createChatSave?.addEventListener('click', handleCreateChat);
  DOM.chatAvatarInput?.addEventListener('change', handleChatAvatarChange);
  DOM.chatTitleInput?.addEventListener('input', () => {
    if (!state.pendingChatAvatarData) {
      setChatPreviewAvatar(null, getInitials(DOM.chatTitleInput?.value || 'Chat'));
    }
  });

  DOM.profileBtn?.addEventListener('click', openProfileModal);
  DOM.profileCancel?.addEventListener('click', closeProfileModal);
  DOM.profileModal?.addEventListener('click', (event) => {
    if (event.target === DOM.profileModal) closeProfileModal();
  });
  DOM.profileSave?.addEventListener('click', handleProfileSave);
  DOM.profileAvatarInput?.addEventListener('change', handleProfileAvatarChange);

  DOM.logoutBtn?.addEventListener('click', handleLogout);

  document.addEventListener('click', handleDocumentClickForEmoji);
  document.addEventListener('keydown', handleEmojiKeydown);
  DOM.backToChats?.addEventListener('click', (event) => {
    event?.preventDefault();
    showChatsListMobile();
  });
  window.addEventListener('resize', handleViewportResize);
  handleViewportResize();
}

function toggleEmojiPicker(event) {
  event?.preventDefault();
  event?.stopPropagation();
  if (state.isEmojiPickerOpen) {
    closeEmojiPicker();
  } else {
    openEmojiPicker();
  }
}

function openEmojiPicker() {
  if (!DOM.emojiPicker) return;
  DOM.emojiPicker.classList.add('open');
  DOM.emojiPicker.setAttribute('aria-hidden', 'false');
  state.isEmojiPickerOpen = true;
}

function closeEmojiPicker() {
  if (!DOM.emojiPicker) return;
  DOM.emojiPicker.classList.remove('open');
  DOM.emojiPicker.setAttribute('aria-hidden', 'true');
  state.isEmojiPickerOpen = false;
}

function handleEmojiSelect(event) {
  const emoji = event?.detail?.unicode;
  if (!emoji) return;
  insertEmojiAtCaret(emoji);
  closeEmojiPicker();
}

function insertEmojiAtCaret(emoji) {
  const input = DOM.input;
  if (!input) return;
  const { selectionStart = input.value.length, selectionEnd = input.value.length } = input;
  const before = input.value.slice(0, selectionStart);
  const after = input.value.slice(selectionEnd);
  input.value = `${before}${emoji}${after}`;
  const caret = selectionStart + emoji.length;
  input.focus();
  input.setSelectionRange(caret, caret);
}

function handleDocumentClickForEmoji(event) {
  if (!state.isEmojiPickerOpen) return;
  const target = event.target;
  if (DOM.emojiPicker?.contains(target) || DOM.emojiBtn?.contains(target)) return;
  closeEmojiPicker();
}

function handleEmojiKeydown(event) {
  if (!state.isEmojiPickerOpen) return;
  if (event.key === 'Escape') {
    closeEmojiPicker();
  }
}

function isMobileViewport() {
  return window.matchMedia('(max-width: 980px)').matches;
}

function showChatOnMobile() {
  if (!isMobileViewport()) return;
  DOM.container?.classList.add('show-chat');
  setTimeout(() => scrollMessagesToBottom(), 80);
}

function showChatsListMobile() {
  if (!isMobileViewport()) return;
  DOM.container?.classList.remove('show-chat');
  closeEmojiPicker();
}

function handleViewportResize() {
  if (!isMobileViewport()) {
    DOM.container?.classList.remove('show-chat');
  }
}

function handleSearch(event) {
  const query = (event.target.value || '').toLowerCase();
  state.filteredChats = state.chats.filter((chat) =>
    (chat.title || '').toLowerCase().includes(query),
  );
  renderChatList(handleChatSelect);
}

function handleChatSelect(chatId) {
  selectChat(chatId);
}

async function selectChat(chatId, options = {}) {
  closeEmojiPicker();
  state.activeChatId = chatId;
  if (!options.skipHighlight) highlightChat(chatId);
  subscribeToChat(chatId);
  showChatOnMobile();
  syncActiveChatPresence();

  const chatMeta = state.chats.find((chat) => chat.id === chatId);
  updateChatHeader(chatMeta?.title || 'Untitled chat', chatMeta?.avatarUrl || null);

  renderMessagesStatus('Loading messages…');
  try {
    const details = await fetchChatDetails(state.authToken, chatId);
    updateChatHeader(details?.title || chatMeta?.title || 'Untitled chat', details?.avatarUrl);
    state.chats = state.chats.map((chat) =>
      chat.id === chatId
        ? { ...chat, title: details?.title || chat.title, avatarUrl: details?.avatarUrl || chat.avatarUrl }
        : chat,
    );
  } catch (err) {
    console.error(err);
  }

  try {
    const payload = await fetchChatMessages(state.authToken, chatId);
    const normalized = Array.isArray(payload)
      ? payload
          .map((item) => normalizeMessagePayload(item))
          .filter((item) => item && item.type === 'chat:message')
      : [];
    setMessages(chatId, normalized);
    renderMessages(chatId);
    requestAnimationFrame(() => scrollMessagesToBottom());
  } catch (err) {
    console.error(err);
    renderMessagesError(err.message || 'Failed to load messages');
  }
}

function handleSendMessage() {
  closeEmojiPicker();
  const content = DOM.input?.value ?? '';
  if (!content.trim()) return;
  sendChatMessage(state.activeChatId, content);
  if (DOM.input) DOM.input.value = '';
}

async function handleCreateChat() {
  const title = DOM.chatTitleInput?.value?.trim();
  if (!title) {
    setCreateChatError('Please enter a title');
    return;
  }

  setCreateChatError('');
  const payload = {
    title,
    participantIds: [],
  };
  if (state.pendingChatAvatarData) {
    payload.avatarImage = state.pendingChatAvatarData;
  }

  try {
    DOM.createChatSave?.setAttribute('disabled', 'true');
    const chat = await createChat(state.authToken, payload);
    const transformed = {
      id: chat.id,
      title: chat.title || title,
      avatarUrl: chat.avatarUrl || null,
    };
    state.chats = [transformed, ...state.chats.filter((c) => c.id !== transformed.id)];
    state.filteredChats = [...state.chats];
    renderChatList(handleChatSelect);
    highlightChat(transformed.id);
    closeCreateChatModal();
    selectChat(transformed.id, { skipHighlight: true });
  } catch (err) {
    setCreateChatError(err.message || 'Failed to create chat');
  } finally {
    DOM.createChatSave?.removeAttribute('disabled');
    state.pendingChatAvatarData = null;
  }
}

async function handleProfileSave() {
  const name = DOM.profileNameInput?.value?.trim();
  if (!name) {
    setProfileError('Please enter a name');
    return;
  }

  if (!state.authToken) {
    setProfileError('Missing auth token. Please sign in.');
    return;
  }

  setProfileError('');
  try {
    DOM.profileSave?.setAttribute('disabled', 'true');
    let avatarUrl = state.currentUserProfile?.avatarUrl || null;
    if (state.pendingAvatarData) {
      const uploaded = await uploadUserAvatar(state.authToken, state.pendingAvatarData);
      avatarUrl = uploaded?.avatarUrl || avatarUrl;
      state.pendingAvatarData = null;
    }

    const updatePayload = { name };
    if (state.currentUserProfile?.age != null) {
      updatePayload.age = state.currentUserProfile.age;
    }

    const updated = await updateProfile(state.authToken, updatePayload);
    state.currentUserProfile = {
      ...state.currentUserProfile,
      ...updated,
      name: updated?.name || name,
      avatarUrl,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(state.currentUserProfile));

    const initials = getInitials(state.currentUserProfile?.name || state.currentUserProfile?.email || 'User');
    setProfileButtonAvatar(avatarUrl, initials);
    setProfilePreview(avatarUrl, initials);
    closeProfileModal();
  } catch (err) {
    setProfileError(err.message || 'Failed to update profile');
  } finally {
    DOM.profileSave?.removeAttribute('disabled');
  }
}

async function handleProfileAvatarChange(event) {
  const file = event.target?.files?.[0];
  const initials = getInitials(
    state.currentUserProfile?.name || state.currentUserProfile?.email || 'User',
  );

  if (!file) {
    state.pendingAvatarData = null;
    setProfilePreview(state.currentUserProfile?.avatarUrl || null, initials);
    return;
  }

  if (!isImageFile(file)) {
    setProfileError('Please choose an image file');
    event.target.value = '';
    return;
  }

  try {
    const processed = await compressImageToLimit(file);
    state.pendingAvatarData = processed;
    setProfilePreview(processed, initials);
    setProfileError('');
  } catch (err) {
    console.error(err);
    setProfileError(err.message || 'Failed to process image');
    state.pendingAvatarData = null;
    event.target.value = '';
  }
}

async function handleChatAvatarChange(event) {
  const file = event.target?.files?.[0];
  const initials = getInitials(DOM.chatTitleInput?.value || 'Chat');

  if (!file) {
    state.pendingChatAvatarData = null;
    setChatPreviewAvatar(null, initials);
    return;
  }

  if (!isImageFile(file)) {
    setCreateChatError('Please choose an image file');
    event.target.value = '';
    return;
  }

  try {
    const processed = await compressImageToLimit(file);
    state.pendingChatAvatarData = processed;
    setChatPreviewAvatar(processed, initials);
    setCreateChatError('');
  } catch (err) {
    console.error(err);
    setCreateChatError(err.message || 'Failed to process image');
    state.pendingChatAvatarData = null;
    event.target.value = '';
  }
}

function handleLogout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.location.href = 'login.html';
}

function openProfileModal() {
  if (!state.currentUserProfile) return;
  resetProfileModal(state.currentUserProfile);
  DOM.profileModal?.classList.add('open');
  DOM.profileModal?.setAttribute('aria-hidden', 'false');
  DOM.profileNameInput?.focus();
}

function closeProfileModal() {
  DOM.profileModal?.classList.remove('open');
  DOM.profileModal?.setAttribute('aria-hidden', 'true');
  if (DOM.profileAvatarInput) DOM.profileAvatarInput.value = '';
  state.pendingAvatarData = null;
}

function closeCreateChatModal() {
  DOM.newChatModal?.classList.remove('open');
  DOM.newChatModal?.setAttribute('aria-hidden', 'true');
  state.pendingChatAvatarData = null;
  if (DOM.chatAvatarInput) DOM.chatAvatarInput.value = '';
  resetCreateChatModal();
}

function handlePresenceSystemMessage(message) {
  const joinSuffix = ' joined the chat';
  const leaveSuffix = ' left the chat';
  const content = message.content || '';
  const chatId = message.chatId;
  if (!chatId || !content) return;

  if (content.endsWith(joinSuffix)) {
    const name = content.slice(0, -joinSuffix.length).trim();
    if (name && !isSelfDisplayName(name)) {
      updateChatPresence(chatId, name, true);
    }
  } else if (content.endsWith(leaveSuffix)) {
    const name = content.slice(0, -leaveSuffix.length).trim();
    if (name && !isSelfDisplayName(name)) {
      updateChatPresence(chatId, name, false);
    }
  }
}

function handlePresenceFromMessage(message) {
  if (!message?.chatId) return;
  const isMine =
    state.currentUserId &&
    message.authorId &&
    String(message.authorId) === String(state.currentUserId);
  if (isMine) return;

  const identifier = (message.authorName || '').trim() || message.authorId;
  if (!identifier) return;
  updateChatPresence(message.chatId, identifier, true);
}

function updateChatPresence(chatId, identifier, isOnline) {
  if (!chatId || !identifier) return;
  let presence = state.chatPresence.get(chatId);
  if (!presence) {
    presence = new Set();
    state.chatPresence.set(chatId, presence);
  }
  if (isOnline) presence.add(identifier);
  else presence.delete(identifier);
  const count = presence.size;
  if (chatId === state.activeChatId) setActiveChatPresence(count);
  setChatListPresence(chatId, count);
  if (chatId === state.activeChatId) refreshMessagePresence(chatId);
}

function isSelfDisplayName(name) {
  if (!name) return false;
  const normalized = name.trim().toLowerCase();
  const profile = state.currentUserProfile;
  const candidates = new Set();
  if (profile?.name) candidates.add(profile.name.trim().toLowerCase());
  if (profile?.email) {
    candidates.add(profile.email.trim().toLowerCase());
    const local = profile.email.split('@')[0];
    if (local) candidates.add(local.trim().toLowerCase());
  }
  return candidates.has(normalized);
}

function syncActiveChatPresence() {
  if (!state.activeChatId) {
    setActiveChatPresence(0);
    return;
  }
  const count = state.chatPresence.get(state.activeChatId)?.size || 0;
  setActiveChatPresence(count);
}

function handleSocketMessage(raw) {
  const normalized = normalizeMessagePayload(raw);
  if (!normalized?.chatId) return;

  if (normalized.type === 'chat:system') {
    handlePresenceSystemMessage(normalized);
    if (normalized.chatId === state.activeChatId) {
      appendSystemNotice(normalized.content, normalized.createdAt);
    }
    return;
  }

  handlePresenceFromMessage(normalized);
  cacheMessage(normalized);
  if (normalized.chatId === state.activeChatId) {
    appendMessageRow(normalized);
  }
}
