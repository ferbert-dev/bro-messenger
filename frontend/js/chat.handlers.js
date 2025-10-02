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
} from './chat.view.js';
import { getInitials, isImageFile, validateFileSize } from './chat.utils.js';

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
      const firstChat = state.filteredChats[0];
      selectChat(firstChat.id, { skipHighlight: true });
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
  state.activeChatId = chatId;
  if (!options.skipHighlight) highlightChat(chatId);
  subscribeToChat(chatId);

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
  } catch (err) {
    console.error(err);
    renderMessagesError(err.message || 'Failed to load messages');
  }
}

function handleSendMessage() {
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

function handleProfileAvatarChange(event) {
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

  if (!validateFileSize(file)) {
    setProfileError('Image must be smaller than 2MB');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      state.pendingAvatarData = reader.result;
      setProfilePreview(reader.result, initials);
      setProfileError('');
    }
  };
  reader.onerror = () => {
    setProfileError('Failed to read file');
    event.target.value = '';
  };
  reader.readAsDataURL(file);
}

function handleChatAvatarChange(event) {
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

  if (!validateFileSize(file)) {
    setCreateChatError('Image must be smaller than 2MB');
    event.target.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    if (typeof reader.result === 'string') {
      state.pendingChatAvatarData = reader.result;
      setChatPreviewAvatar(reader.result, initials);
      setCreateChatError('');
    }
  };
  reader.onerror = () => {
    setCreateChatError('Failed to read file');
    event.target.value = '';
  };
  reader.readAsDataURL(file);
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

function handleSocketMessage(raw) {
  const normalized = normalizeMessagePayload(raw);
  if (!normalized?.chatId) return;

  if (normalized.type === 'chat:system') {
    if (normalized.chatId === state.activeChatId) {
      appendSystemNotice(normalized.content, normalized.createdAt);
    }
    return;
  }

  cacheMessage(normalized);
  if (normalized.chatId === state.activeChatId) {
    appendMessageRow(normalized);
  }
}
