// Fetch and render chats from backend; display only chat names in the sidebar
// Endpoint: GET /api/users/me/chats
// Auth: Bearer token from localStorage key "authToken"

const API_URL = 'http://localhost:3000/api/chats';
const PROFILE_URL = 'http://localhost:3000/api/users/me';
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
const profileBtn = document.getElementById('profileBtn');
const profileAvatar = document.getElementById('profileAvatar');
const profileModal = document.getElementById('profileModal');
const profileNameInput = document.getElementById('profileNameInput');
const profileEmail = document.getElementById('profileEmail');
const profileCancel = document.getElementById('profileCancel');
const profileSave = document.getElementById('profileSave');
const profileError = document.getElementById('profileError');
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
}

function resetCreateChatModal() {
  if (chatTitleInput) chatTitleInput.value = '';
  if (createChatError) createChatError.textContent = '';
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
  profileModal.classList.add('open');
  profileModal.setAttribute('aria-hidden', 'false');
  profileNameInput?.focus();
}

function closeProfileModal() {
  if (!profileModal) return;
  profileModal.classList.remove('open');
  profileModal.setAttribute('aria-hidden', 'true');
}

function setProfileError(message) {
  if (profileError) profileError.textContent = message || '';
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
    if (profileAvatar) profileAvatar.textContent = initials || 'U';
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

function handleSocketMessage(event) {
  try {
    const data = JSON.parse(event.data);
    if (data.type === 'message' && data.chatId) {
      const existing = messageCache.get(data.chatId) || [];
      messageCache.set(data.chatId, [...existing, data]);
      if (data.chatId === activeChatId) {
        renderMessages(messageCache.get(data.chatId));
      }
    }
  } catch (err) {
    console.error('Failed to parse WS message', err);
  }
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
    chats = data.map((c) => ({ id: c.id, title: c.title || 'Untitled chat' }));
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
    const initials = getInitials(c.title);
    el.innerHTML = `
      <div class="avatar" aria-hidden="true">${initials}</div>
      <div class="ci-main">
        <div class="ci-top"><span class="ci-name">${escapeHtml(c.title)}</span><span class="ci-time"></span></div>
        <div class="ci-last" aria-hidden="true"></div>
      </div>
    `;
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

  if (!res.ok) return; // add your own error handling

  const payload = await res.json();
  active_chat_title.textContent = payload?.title || 'Untitled chat';
  active_chat_image.textContent = getInitials(payload?.title);
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

    const data = Array.isArray(payload)
      ? payload
      : Array.isArray(payload)
        ? payload
        : [];

    messageCache.set(chatId, data);
    if (activeChatId === chatId) {
      renderMessages(data);
    }
  } catch (err) {
    if (activeChatId === chatId) {
      renderMessagesError(err.message || 'Failed to load messages');
    }
  }
}

function renderMessages(list) {
  if (!Array.isArray(list) || list.length === 0) {
    renderMessagesStatus('No messages yet');
    return;
  }

  messages.innerHTML = '';
  const frag = document.createDocumentFragment();

  list.forEach((msg) => {
    console.log(msg);
    const row = document.createElement('div');
    const authorObj = msg?.author || {};
    const authorId = msg?.authorId || authorObj?.id || authorObj?._id;
    const authorName = authorObj?.name || msg?.authorName || 'Anonymous';
    const timestamp = formatMessageTime(msg?.createdAt || msg?.updatedAt);

    const content = msg?.content ?? '';

    const isMine =
      currentUserId && authorId && String(authorId) === String(currentUserId);

    row.className = 'row' + (isMine ? ' me' : '');
    row.innerHTML = `
      <div class="bubble">
        <strong>${escapeHtml(authorName)}</strong>
        <div class="meta">${escapeHtml(timestamp)}</div>
        <p>${escapeHtml(content)}</p>
      </div>
    `;
    frag.appendChild(row);
  });

  messages.appendChild(frag);
  messages.scrollTop = messages.scrollHeight;
}

function renderMessagesStatus(text) {
  messages.innerHTML = `<div style="padding:12px 14px; color:#8b8f9c">${escapeHtml(text)}</div>`;
}

function renderMessagesError(text) {
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
  if (!title) return 'C';
  const parts = title.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

// --- Chat message UX (local echo) ---
function addMessage(message) {
  if (!message || !message.chatId || message.chatId !== activeChatId) return;

  if (message.type === 'chat:system') {
    renderSystemNotice(message.content, message.createdAt);
    return;
  }

  if (message.type !== 'chat:message') return;

  const trimmed = (message.content || '').trim();
  if (!trimmed) return;

  const createdAt = formatMessageTime(message.createdAt);
  const authorName = message.authorName || 'Unknown';

  const entry = {
    content: trimmed,
    createdAt,
    authorId: message.authorId,
    authorName,
    author: message.authorId ? { _id: message.authorId, name: authorName } : null,
  };
  const existing = messageCache.get(activeChatId) || [];
  messageCache.set(activeChatId, [...existing, entry]);

  const row = document.createElement('div');
  const isMine =
    currentUserId && message.authorId && String(message.authorId) === String(currentUserId);

  row.className = 'row' + (isMine ? ' me' : '');
  row.innerHTML = `
    <div class="bubble">
      <strong>${escapeHtml(authorName)}</strong>
      <div class="meta">${escapeHtml(createdAt)}</div>
      <p>${escapeHtml(trimmed)}</p>
    </div>
  `;

  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function renderSystemNotice(content, createdAt) {
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
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
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
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: titleValue,
        participantIds: [],
      }),
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
    };

    chats = [newChat, ...chats.filter((c) => c.id !== chatId)];
    filtered = chats.slice();
    renderList(filtered);
    closeNewChatModal();
    messageCache.set(chatId, []);
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
    };

    localStorage.setItem('user', JSON.stringify(currentUserProfile));

    const source = currentUserProfile?.name || currentUserProfile?.email;
    const initials = source ? getInitials(source) : 'U';
    if (profileAvatar) profileAvatar.textContent = initials || 'U';
    if (profileEmail) profileEmail.textContent = currentUserProfile?.email || '';
    closeProfileModal();
  } catch (err) {
    setProfileError(err.message || 'Failed to update profile');
  } finally {
    profileSave?.removeAttribute('disabled');
  }
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
