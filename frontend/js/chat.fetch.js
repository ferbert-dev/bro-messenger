// Fetch and render chats from backend; display only chat names in the sidebar
// Endpoint: GET /api/users/me/chats
// Auth: Bearer token from localStorage key "authToken"

const API_URL = 'http://localhost:3000/api/chats';
const PROFILE_URL = 'http://localhost:3000/api/users/me';
const AVATAR_URL = 'http://localhost:3000/api/users/me/avatar';
const WS_BASE_URL = 'ws://localhost:3000/ws';

const list = document.getElementById('chatList');
const search = document.getElementById('search');
const input = document.getElementById('input');
const send = document.getElementById('send');
const messages = document.getElementById('messages');
const active_chat_title = document.getElementById('chat-title');
const active_chat_image = document.getElementById('chat-image');
const newChatBtn = document.getElementById('newChatBtn');
const newChatModal = document.getElementById('newChatModal');
const chatTitleInput = document.getElementById('chatTitleInput');
const createChatCancel = document.getElementById('createChatCancel');
const createChatSave = document.getElementById('createChatSave');
const createChatError = document.getElementById('createChatError');
const chatAvatarInput = document.getElementById('chatAvatarInput');
const chatAvatarPreview = document.getElementById('chatAvatarPreview');
const profileBtn = document.getElementById('profileBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileModal = document.getElementById('profileModal');
const profileNameInput = document.getElementById('profileNameInput');
const profileEmail = document.getElementById('profileEmail');
const profileCancel = document.getElementById('profileCancel');
const profileSave = document.getElementById('profileSave');
const profileError = document.getElementById('profileError');
const profileAvatarInput = document.getElementById('profileAvatarInput');
const profileAvatarPreview = document.getElementById('profileAvatarPreview');
const logoutBtn = document.getElementById('logoutBtn');
const TOKEN_KEY = 'authToken';

let chats = []; // full dataset from server
let filtered = []; // filtered by search
let authToken = null; // cached bearer token
let currentUserId = null;
let activeChatId = null;
const messageCache = new Map();
let socket = null;
const pendingSocketActions = [];
let currentUserProfile = null;
let pendingAvatarData = null;
let pendingChatAvatarData = null;

init();

function openNewChatModal() {
  if (!newChatModal) return;
  resetCreateChatModal();
  newChatModal.classList.add('open');
  newChatModal.setAttribute('aria-hidden', 'false');
  chatTitleInput?.focus();
}

function closeNewChatModal() {
  if (!newChatModal) return;
  newChatModal.classList.remove('open');
  newChatModal.setAttribute('aria-hidden', 'true');
  pendingChatAvatarData = null;
}

function resetCreateChatModal() {
  if (chatTitleInput) chatTitleInput.value = '';
  if (createChatError) createChatError.textContent = '';
  pendingChatAvatarData = null;
  if (chatAvatarInput) chatAvatarInput.value = '';
  const initials = 'CH';
  setChatPreviewAvatar(null, initials);
}

function setCreateChatError(message) {
  if (createChatError) createChatError.textContent = message || '';
}

function openProfileModal() {
  if (!profileModal) return;
  setProfileError('');
  if (profileNameInput)
    profileNameInput.value = currentUserProfile?.name || currentUserProfile?.email || '';
  if (profileEmail)
    profileEmail.textContent = currentUserProfile?.email || '';
  if (profileAvatarInput) profileAvatarInput.value = '';
  pendingAvatarData = null;
  const initials = getInitials(
    currentUserProfile?.name || currentUserProfile?.email || 'User',
  );
  setProfilePreview(normalizeAvatarUrl(currentUserProfile?.avatarUrl), initials);
  profileModal.classList.add('open');
  profileModal.setAttribute('aria-hidden', 'false');
  profileNameInput?.focus();
}

function closeProfileModal() {
  if (!profileModal) return;
  profileModal.classList.remove('open');
  profileModal.setAttribute('aria-hidden', 'true');
  pendingAvatarData = null;
  if (profileAvatarInput) profileAvatarInput.value = '';
}

function setProfileError(message) {
  if (profileError) profileError.textContent = message || '';
}

function normalizeAvatarUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;
  if (url.startsWith('/')) return `${window.location.origin}${url}`;
  return `${window.location.origin}/${url}`;
}

function setProfileButtonAvatar(avatarUrl, initials) {
  if (!profileBtn || !profileAvatar) return;
  if (avatarUrl) {
    profileBtn.classList.add('has-image');
    const normalized = avatarUrl.startsWith('data:')
      ? avatarUrl
      : normalizeAvatarUrl(avatarUrl);
    const safeUrl = normalized.replace(/"/g, '\"');
    profileBtn.style.backgroundImage = `url("${safeUrl}")`;
    profileAvatar.textContent = '';
  } else {
    profileBtn.classList.remove('has-image');
    profileBtn.style.backgroundImage = '';
    profileAvatar.textContent = initials || 'U';
  }
}

function setProfilePreview(imageSrc, initials) {
  if (!profileAvatarPreview) return;
  profileAvatarPreview.innerHTML = '';
  profileAvatarPreview.style.backgroundImage = '';
  if (imageSrc) {
    const normalized = imageSrc.startsWith('data:')
      ? imageSrc
      : normalizeAvatarUrl(imageSrc);
    const img = document.createElement('img');
    img.src = normalized;
    img.alt = 'Avatar preview';
    profileAvatarPreview.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = initials || 'U';
    profileAvatarPreview.appendChild(span);
  }
}

function setChatPreviewAvatar(imageSrc, initials) {
  if (!chatAvatarPreview) return;
  chatAvatarPreview.innerHTML = '';
  chatAvatarPreview.style.backgroundImage = '';
  if (imageSrc) {
    const normalized = imageSrc.startsWith('data:')
      ? imageSrc
      : normalizeAvatarUrl(imageSrc);
    const img = document.createElement('img');
    img.src = normalized;
    img.alt = 'Chat avatar preview';
    chatAvatarPreview.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = initials || 'CH';
    chatAvatarPreview.appendChild(span);
  }
}

function setChatHeaderAvatar(avatarUrl, title) {
  if (!active_chat_image) return;
  const initials = getInitials(title || 'Chat');
  active_chat_image.innerHTML = '';
  active_chat_image.style.backgroundImage = '';
  if (avatarUrl) {
    const img = document.createElement('img');
    const normalized = avatarUrl.startsWith('data:')
      ? avatarUrl
      : normalizeAvatarUrl(avatarUrl);
    img.src = normalized;
    img.alt = initials;
    active_chat_image.appendChild(img);
  } else {
    active_chat_image.textContent = initials;
  }
}

async function loadCurrentUser(token) {
  try {
    const res = await fetch(PROFILE_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) throw new Error('Failed to load profile');

    const data = await res.json();
    currentUserProfile = data;
    const source = data?.name || data?.email;
    const initials = source ? getInitials(source) : 'U';
    const avatarUrl = normalizeAvatarUrl(data?.avatarUrl);
    setProfileButtonAvatar(avatarUrl, initials);
    setProfilePreview(avatarUrl, initials);
    if (profileEmail) profileEmail.textContent = data?.email || '';
    localStorage.setItem('user', JSON.stringify(data));
  } catch (err) {
    console.error('Failed to load user profile', err);
  }
}

function initWs(token) {
  console.info("init ws ..");
  if (!token){ 
    console.error("token is null");
    return;
  }

  if (socket && socket.readyState !== WebSocket.CLOSED) {
    console.error("ws is closed");
    try {
      socket.close(1000, 'Re-initializing socket');
    } catch {}
  }

  const url = new URL(WS_BASE_URL);
  if (window.location.protocol === 'https:') {
    url.protocol = 'wss:';
  }
  url.searchParams.set('token', token);

  socket = new WebSocket(url.toString());

  socket.addEventListener('open', () => {
    console.log('WebSocket is open now.');
    flushPendingSocketActions();
    if (activeChatId) subscribeToChat(activeChatId);
  });

  socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      addMessage(payload);
    } catch (err) {
      console.error('Bad WS message', err, event.data);
    }
  });

  socket.addEventListener('error', (event) => {
    console.error('WebSocket error observed:', event);
  });
  socket.addEventListener('close', () => {
    console.warn('WebSocket closed');
  });
}

function ensureSocket(action) {
  if (!socket) {
    enqueueSocketAction(action);
    initWs(authToken);
    return;
  }

  switch (socket.readyState) {
    case WebSocket.OPEN:
      action();
      break;
    case WebSocket.CONNECTING:
      enqueueSocketAction(action);
      break;
    default:
      enqueueSocketAction(action);
      initWs(authToken);
  }
}

function enqueueSocketAction(action) {
  pendingSocketActions.push(action);
}

function flushPendingSocketActions() {
  while (pendingSocketActions.length) {
    const next = pendingSocketActions.shift();
    try {
      next?.();
    } catch (err) {
      console.error('Failed to run queued socket action', err);
    }
  }
}

function subscribeToChat(chatId) {
  if (!chatId) return;

  ensureSocket(() => {
    const payload = JSON.stringify({ type: 'subscribe', chatId: chatId });
    socket.send(payload);
  });
}

function sendMessage(chatId, content) {
  const trimmed = (content || '').trim();
  if (!chatId || !trimmed) return;

  ensureSocket(() => {
    const payload = JSON.stringify({ type: 'message', chatId: chatId, content: trimmed });
    socket.send(payload);
  });
}

async function init() {
  showStatus('Loading chats…');
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      throw new Error(`Missing auth token in localStorage (${TOKEN_KEY})`);
    }
    authToken = token;
    currentUserId = decodeJwt(token)?.userId || null;
    await loadCurrentUser(token);
    initWs(authToken);
    const res = await fetch(API_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(
        `Failed to load chats (${res.status} ${res.statusText})${text ? `: ${text}` : ''}`,
      );
    }

    const data = await res.json();
    // Expecting an array of { id, title, admins, members }
    if (!Array.isArray(data))
      throw new Error('Unexpected response format: expected an array');
    chats = data.map((c) => ({
      id: c.id,
      title: c.title || 'Untitled chat',
      avatarUrl: c.avatarUrl || null,
    }));
    filtered = chats.slice();
    
    renderList(filtered);
  } catch (err) {
    showError(err.message);
  }
}

function showStatus(msg) {
  list.innerHTML = `<div style="padding:12px 14px; color:#8b8f9c">${escapeHtml(msg)}</div>`;
}
function showError(msg) {
  list.innerHTML = `<div style="padding:12px 14px; color:#b91c1c; background:#fff1f2; border-radius:12px; margin:8px">${escapeHtml(msg)}</div>`;
}

function renderList(items) {
  list.innerHTML = '';
  if (items.length === 0) {
    showStatus('No chats');
    return;
  }
  
  items.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'chat-item' + (i === 0 ? ' active' : '');
    el.dataset.chatId = c.id;

    const initials = getInitials(c.title);
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    if (c.avatarUrl) {
      const img = document.createElement('img');
      img.src = normalizeAvatarUrl(c.avatarUrl);
      img.alt = initials;
      avatar.appendChild(img);
    } else {
      avatar.textContent = initials;
    }

    const main = document.createElement('div');
    main.className = 'ci-main';
    main.innerHTML = `
      <div class="ci-top"><span class="ci-name">${escapeHtml(
        c.title,
      )}</span><span class="ci-time"></span></div>
      <div class="ci-last" aria-hidden="true"></div>
    `;

    el.appendChild(avatar);
    el.appendChild(main);
    el.addEventListener('click', () => {
      document
        .querySelectorAll('.chat-item')
        .forEach((n) => n.classList.remove('active'));
      el.classList.add('active');
      loadMessagesForChat(c.id);
      loadChatDetails(c.id);
    });
    list.appendChild(el);
    if (i === 0) {
      loadMessagesForChat(c.id);
      loadChatDetails(c.id);
    }
  });
}



async function loadChatDetails(chatId) {
  const token = authToken || localStorage.getItem(TOKEN_KEY);
  if (!token) return;

  const res = await fetch(`${API_URL}/${encodeURIComponent(chatId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const fallback = chats.find((c) => c.id === chatId);
    const title = fallback?.title || 'Untitled chat';
    if (active_chat_title) active_chat_title.textContent = title;
    setChatHeaderAvatar(fallback?.avatarUrl || null, title);
    return;
  }

  const payload = await res.json();
  const title = payload?.title || 'Untitled chat';
  if (active_chat_title) active_chat_title.textContent = title;
  setChatHeaderAvatar(payload?.avatarUrl || null, title);

  chats = chats.map((c) =>
    c.id === chatId
      ? { ...c, title, avatarUrl: payload?.avatarUrl || c.avatarUrl || null }
      : c,
  );
}

async function loadMessagesForChat(chatId) {
  if (!chatId) return;
  activeChatId = chatId;
  if (activeChatId) subscribeToChat(activeChatId);

  const cached = messageCache.get(chatId) || [];

  if (cached.length != 0) {
    renderMessages(cached);
    return;
  }

  renderMessagesStatus('Loading messages…');

  const token = authToken || localStorage.getItem(TOKEN_KEY);
  if (!token) {
    renderMessagesError('Missing auth token. Please sign in again.');
    return;
  }

  try {
    const res = await fetch(
      `${API_URL}/${encodeURIComponent(chatId)}/messages`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      },
    );

    if (!res.ok) {
      const text = await safeText(res);
      throw new Error(
        `Failed to load messages (${res.status} ${res.statusText})${text ? `: ${text}` : ''}`,
      );
    }

    const payload = await res.json();

    const rawList = Array.isArray(payload) ? payload : [];
    const normalized = rawList
      .map((item) => normalizeMessagePayload(item))
      .filter((item) => item && item.type === 'chat:message');

    messageCache.set(chatId, normalized);
    if (activeChatId === chatId) {
      renderMessages(normalized);
    }
  } catch (err) {
    if (activeChatId === chatId) {
      renderMessagesError(err.message || 'Failed to load messages');
    }
  }
}

function renderMessages(list) {
  if (!messages) return;
  if (!Array.isArray(list) || list.length === 0) {
    renderMessagesStatus('No messages yet');
    return;
  }

  messages.innerHTML = '';
  messages.dataset.state = 'content';
  const frag = document.createDocumentFragment();

  list.forEach((raw) => {
    const normalized = normalizeMessagePayload(raw);
    if (!normalized || normalized.type !== 'chat:message') return;
    frag.appendChild(buildMessageRow(normalized));
  });

  messages.appendChild(frag);
  messages.scrollTop = messages.scrollHeight;
}

function renderMessagesStatus(text) {
  if (!messages) return;
  messages.dataset.state = 'status';
  messages.innerHTML = `<div style="padding:12px 14px; color:#8b8f9c">${escapeHtml(text)}</div>`;
}

function renderMessagesError(text) {
  if (!messages) return;
  messages.dataset.state = 'status';
  messages.innerHTML = `<div style="padding:12px 14px; color:#b91c1c; background:#fff1f2; border-radius:12px; margin:8px">${escapeHtml(text)}</div>`;
}

function formatMessageTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

search?.addEventListener('input', (e) => {
  const q = (e.target.value || '').toLowerCase();
  filtered = chats.filter((c) => (c.title || '').toLowerCase().includes(q));
  renderList(filtered);
});

function getInitials(title) {
  if (!title) return 'U';
  const parts = title.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

// --- Chat message UX (local echo) ---
function addMessage(message) {
  if (!messages) return;
  const normalized = normalizeMessagePayload(message);
  if (!normalized || !normalized.chatId) return;

  if (normalized.type === 'chat:system') {
    if (normalized.chatId === activeChatId) {
      renderSystemNotice(normalized.content, normalized.createdAt);
    }
    return;
  }

  const existing = messageCache.get(normalized.chatId) || [];
  messageCache.set(normalized.chatId, [...existing, normalized]);

  if (normalized.chatId !== activeChatId) return;

  if (messages.dataset.state === 'status') {
    messages.innerHTML = '';
    messages.dataset.state = 'content';
  }

  messages.appendChild(buildMessageRow(normalized));
  messages.scrollTop = messages.scrollHeight;
}

function renderSystemNotice(content, createdAt) {
  if (!messages) return;
  const text = (content || '').trim();
  if (!text) return;

  const time = formatMessageTime(createdAt);
  const row = document.createElement('div');
  row.className = 'row system';
  row.innerHTML = `
    <div class="bubble system">
      <div class="meta">${escapeHtml(time)}</div>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
  if (messages.dataset.state === 'status') {
    messages.innerHTML = '';
    messages.dataset.state = 'content';
  }
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function normalizeMessagePayload(raw) {
  if (!raw) return null;
  const type = raw.type || 'chat:message';
  const dropTypes = ['welcome', 'subscribed', 'unsubscribed', 'error'];
  if (dropTypes.includes(type)) return null;
  if (type === 'chat:system') {
    return {
      type,
      chatId: raw.chatId || raw.chat || activeChatId,
      content: raw.content || '',
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  const author = raw.author || {};
  const chatValue = raw.chatId || raw.chat || activeChatId;
  const chatId =
    typeof chatValue === 'object'
      ? chatValue?._id || chatValue?.id || chatValue?.chatId
      : chatValue;
  const resolvedChatId = chatId ? String(chatId) : null;
  const resolvedAuthorId = raw.authorId || author.id || author._id || null;

  return {
    type: 'chat:message',
    chatId: resolvedChatId,
    authorId: resolvedAuthorId ? String(resolvedAuthorId) : null,
    authorName: raw.authorName || author.name || 'Anonymous',
    authorAvatar: raw.authorAvatar || author.avatarUrl || null,
    content: raw.content ?? '',
    createdAt: raw.createdAt || raw.updatedAt || new Date().toISOString(),
  };
}

function buildMessageRow(message) {
  const row = document.createElement('div');
  const isMine =
    currentUserId &&
    message.authorId &&
    String(message.authorId) === String(currentUserId);

  row.className = 'row' + (isMine ? ' me' : '');

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `
    <strong>${escapeHtml(message.authorName)}</strong>
    <div class="meta">${escapeHtml(formatMessageTime(message.createdAt))}</div>
    <p>${escapeHtml(message.content)}</p>
  `;

  const initials = getInitials(message.authorName);
  const avatarSource = message.authorAvatar || (isMine ? currentUserProfile?.avatarUrl : null);

  if (!isMine) {
    row.appendChild(createAvatarElement(avatarSource, initials));
    row.appendChild(bubble);
  } else {
    row.appendChild(bubble);
    row.appendChild(createAvatarElement(avatarSource, initials));
  }

  return row;
}

function createAvatarElement(avatarUrl, fallbackText) {
  const node = document.createElement('div');
  node.className = 'avatar-sm';
  if (avatarUrl) {
    const img = document.createElement('img');
    const source = avatarUrl.startsWith('data:')
      ? avatarUrl
      : normalizeAvatarUrl(avatarUrl);
    img.src = source;
    img.alt = fallbackText || 'User avatar';
    node.appendChild(img);
  } else {
    node.textContent = fallbackText || 'U';
  }
  return node;
}

function handleSend() {
  const content = input?.value ?? '';
  if (!content.trim()) return;
  sendMessage(activeChatId, content);
  if (input) input.value = '';
}

send?.addEventListener('click', () => handleSend());
input?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

newChatBtn?.addEventListener('click', () => openNewChatModal());
createChatCancel?.addEventListener('click', () => closeNewChatModal());
newChatModal?.addEventListener('click', (e) => {
  if (e.target === newChatModal) closeNewChatModal();
});
createChatSave?.addEventListener('click', () => handleCreateChat());
logoutBtn?.addEventListener('click', () => handleLogout());
profileBtn?.addEventListener('click', () => openProfileModal());
profileCancel?.addEventListener('click', () => closeProfileModal());
profileModal?.addEventListener('click', (e) => {
  if (e.target === profileModal) closeProfileModal();
});
profileSave?.addEventListener('click', () => handleProfileSave());
profileAvatarInput?.addEventListener('change', (e) => handleAvatarFileChange(e));
chatAvatarInput?.addEventListener('change', (e) => handleChatAvatarFileChange(e));
chatTitleInput?.addEventListener('input', () => {
  if (!pendingChatAvatarData) {
    const initials = getInitials(chatTitleInput.value || 'Chat');
    setChatPreviewAvatar(null, initials);
  }
});

async function handleCreateChat() {
  const titleValue = chatTitleInput?.value?.trim();
  if (!titleValue) {
    setCreateChatError('Please enter a title');
    return;
  }

  const token = authToken || localStorage.getItem(TOKEN_KEY);
  if (!token) {
    setCreateChatError('Missing auth token. Please sign in.');
    return;
  }

  setCreateChatError('');
  try {
    createChatSave?.setAttribute('disabled', 'true');
    const body = {
      title: titleValue,
      participantIds: [],
    };
    if (pendingChatAvatarData) {
      body.avatarImage = pendingChatAvatarData;
    }
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await safeText(res);
      setCreateChatError(msg || 'Failed to create chat');
      return;
    }

    const payload = await res.json();
    const chatId = payload?.id || payload?._id;
    if (!chatId) {
      setCreateChatError('Chat created but response missing id');
      return;
    }

    const newChat = {
      id: chatId,
      title: payload?.title || titleValue,
      avatarUrl: payload?.avatarUrl || null,
    };

    chats = [newChat, ...chats.filter((c) => c.id !== chatId)];
    filtered = chats.slice();
    renderList(filtered);
    closeNewChatModal();
    messageCache.set(chatId, []);
    pendingChatAvatarData = null;
    if (chatAvatarInput) chatAvatarInput.value = '';
  } catch (err) {
    setCreateChatError(err.message || 'Failed to create chat');
  } finally {
    createChatSave?.removeAttribute('disabled');
  }
}

async function handleProfileSave() {
  const nameValue = profileNameInput?.value?.trim();
  if (!nameValue) {
    setProfileError('Please enter a name');
    return;
  }

  const token = authToken || localStorage.getItem(TOKEN_KEY);
  if (!token) {
    setProfileError('Missing auth token. Please sign in.');
    return;
  }

  setProfileError('');
  try {
    profileSave?.setAttribute('disabled', 'true');
    let uploadedAvatarUrl = currentUserProfile?.avatarUrl || null;
    if (pendingAvatarData) {
      uploadedAvatarUrl = await uploadAvatarImage(pendingAvatarData, token);
      pendingAvatarData = null;
      if (profileAvatarInput) profileAvatarInput.value = '';
    }

    const body = { name: nameValue };
    if (currentUserProfile?.age != null) body.age = currentUserProfile.age;

    const res = await fetch(PROFILE_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await safeText(res);
      setProfileError(msg || 'Failed to update profile');
      return;
    }

    const updated = await res.json();
    const baseProfile = currentUserProfile ? { ...currentUserProfile } : {};
    currentUserProfile = {
      ...baseProfile,
      ...updated,
      name: updated?.name || nameValue,
      avatarUrl: uploadedAvatarUrl || updated?.avatarUrl || baseProfile.avatarUrl,
    };

    localStorage.setItem('user', JSON.stringify(currentUserProfile));

    const source = currentUserProfile?.name || currentUserProfile?.email;
    const initials = source ? getInitials(source) : 'U';
    const finalAvatarUrl = normalizeAvatarUrl(currentUserProfile?.avatarUrl);
    setProfileButtonAvatar(finalAvatarUrl, initials);
    setProfilePreview(finalAvatarUrl, initials);
    if (profileEmail) profileEmail.textContent = currentUserProfile?.email || '';
    closeProfileModal();
  } catch (err) {
    setProfileError(err.message || 'Failed to update profile');
  } finally {
    profileSave?.removeAttribute('disabled');
  }
}

async function uploadAvatarImage(imageData, token) {
  const res = await fetch(AVATAR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({ image: imageData }),
  });

  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to upload avatar');
  }

  const payload = await res.json();
  return payload?.avatarUrl || null;
}

function handleAvatarFileChange(event) {
  const input = event.target;
  const file = input?.files?.[0];
  const initials = getInitials(
    currentUserProfile?.name || currentUserProfile?.email || 'User',
  );

  if (!file) {
    pendingAvatarData = null;
    setProfilePreview(normalizeAvatarUrl(currentUserProfile?.avatarUrl), initials);
    return;
  }

  if (!file.type.startsWith('image/')) {
    setProfileError('Please choose an image file');
    input.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setProfileError('Image must be smaller than 2MB');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result === 'string') {
      pendingAvatarData = result;
      setProfilePreview(result, initials);
      setProfileError('');
    }
  };
  reader.onerror = () => {
    setProfileError('Failed to read file');
    input.value = '';
  };
  reader.readAsDataURL(file);
}

function handleChatAvatarFileChange(event) {
  const input = event.target;
  const file = input?.files?.[0];
  const initials = getInitials(chatTitleInput?.value || 'Chat');

  if (!file) {
    pendingChatAvatarData = null;
    setChatPreviewAvatar(null, initials);
    return;
  }

  if (!file.type.startsWith('image/')) {
    setCreateChatError('Please choose an image file');
    input.value = '';
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    setCreateChatError('Image must be smaller than 2MB');
    input.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const result = reader.result;
    if (typeof result === 'string') {
      pendingChatAvatarData = result;
      setChatPreviewAvatar(result, initials);
      setCreateChatError('');
    }
  };
  reader.onerror = () => {
    setCreateChatError('Failed to read file');
    input.value = '';
  };
  reader.readAsDataURL(file);
}

function handleLogout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}

function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (s) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '\"': '&quot;',
        "'": '&#39;',
      })[s],
  );
}

function decodeJwt(token) {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const rem = base64.length % 4;
    const padded = base64.padEnd(base64.length + (rem ? 4 - rem : 0), '=');
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}
