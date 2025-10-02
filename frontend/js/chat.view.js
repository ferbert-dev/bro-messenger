import { DOM } from './chat.dom.js';
import { state } from './chat.state.js';
import {
  escapeHtml,
  getInitials,
  formatMessageTime,
  normalizeAvatarUrl,
} from './chat.utils.js';

export function showStatus(message) {
  if (!DOM.list) return;
  DOM.list.innerHTML = `<div style="padding:12px 14px; color:#8b8f9c">${escapeHtml(
    message,
  )}</div>`;
}

export function showError(message) {
  if (!DOM.list) return;
  DOM.list.innerHTML = `<div style="padding:12px 14px; color:#b91c1c; background:#fff1f2; border-radius:12px; margin:8px">${escapeHtml(
    message,
  )}</div>`;
}

export function renderChatList(onSelect) {
  if (!DOM.list) return;
  const items = state.filteredChats;
  DOM.list.innerHTML = '';
  if (!items.length) {
    showStatus('No chats');
    return;
  }

  items.forEach((chat, index) => {
    const el = document.createElement('div');
    el.className = 'chat-item' + (index === 0 ? ' active' : '');
    el.dataset.chatId = chat.id;

    const initials = getInitials(chat.title);
    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.setAttribute('aria-hidden', 'true');
    if (chat.avatarUrl) {
      const img = document.createElement('img');
      img.src = normalizeAvatarUrl(chat.avatarUrl);
      img.alt = initials;
      avatar.appendChild(img);
    } else {
      avatar.textContent = initials;
    }

    const main = document.createElement('div');
    main.className = 'ci-main';
    main.innerHTML = `
      <div class="ci-top"><span class="ci-name">${escapeHtml(
        chat.title,
      )}</span><span class="ci-time"></span></div>
      <div class="ci-last" aria-hidden="true"></div>
    `;

    el.appendChild(avatar);
    el.appendChild(main);
    el.addEventListener('click', () => onSelect?.(chat.id));
    DOM.list.appendChild(el);
  });
}

export function highlightChat(chatId) {
  document
    .querySelectorAll('.chat-item')
    .forEach((node) => node.classList.remove('active'));
  const active = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
  if (active) active.classList.add('active');
}

export function resetCreateChatModal(initials = 'CH') {
  if (DOM.chatTitleInput) DOM.chatTitleInput.value = '';
  if (DOM.createChatError) DOM.createChatError.textContent = '';
  if (DOM.chatAvatarInput) DOM.chatAvatarInput.value = '';
  setChatPreviewAvatar(null, initials);
}

export function setCreateChatError(message) {
  if (DOM.createChatError) DOM.createChatError.textContent = message || '';
}

export function updateChatHeader(title, avatarUrl) {
  if (DOM.activeChatTitle) DOM.activeChatTitle.textContent = title;
  if (!DOM.activeChatImage) return;
  DOM.activeChatImage.innerHTML = '';
  DOM.activeChatImage.style.backgroundImage = '';
  const initials = getInitials(title);
  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = normalizeAvatarUrl(avatarUrl);
    img.alt = initials;
    DOM.activeChatImage.appendChild(img);
  } else {
    DOM.activeChatImage.textContent = initials;
  }
}

export function renderMessages(chatId) {
  if (!DOM.messages) return;
  const list = state.messageCache.get(chatId) || [];
  if (!list.length) {
    renderMessagesStatus('No messages yet');
    return;
  }
  DOM.messages.innerHTML = '';
  DOM.messages.dataset.state = 'content';
  const frag = document.createDocumentFragment();
  list.forEach((message) => {
    const row = buildMessageRow(message);
    if (row) frag.appendChild(row);
  });
  DOM.messages.appendChild(frag);
  DOM.messages.scrollTop = DOM.messages.scrollHeight;
}

export function renderMessagesStatus(text) {
  if (!DOM.messages) return;
  DOM.messages.dataset.state = 'status';
  DOM.messages.innerHTML = `<div style="padding:12px 14px; color:#8b8f9c">${escapeHtml(
    text,
  )}</div>`;
}

export function renderMessagesError(text) {
  if (!DOM.messages) return;
  DOM.messages.dataset.state = 'status';
  DOM.messages.innerHTML = `<div style="padding:12px 14px; color:#b91c1c; background:#fff1f2; border-radius:12px; margin:8px">${escapeHtml(
    text,
  )}</div>`;
}

export function appendSystemNotice(content, createdAt) {
  if (!DOM.messages) return;
  if (DOM.messages.dataset.state === 'status') {
    DOM.messages.innerHTML = '';
    DOM.messages.dataset.state = 'content';
  }
  const text = (content || '').trim();
  if (!text) return;
  const row = document.createElement('div');
  row.className = 'row system';
  row.innerHTML = `
    <div class="bubble system">
      <div class="meta">${escapeHtml(formatMessageTime(createdAt))}</div>
      <p>${escapeHtml(text)}</p>
    </div>
  `;
  DOM.messages.appendChild(row);
  DOM.messages.scrollTop = DOM.messages.scrollHeight;
}

export function appendMessageRow(message) {
  if (!DOM.messages) return;
  if (DOM.messages.dataset.state === 'status') {
    DOM.messages.innerHTML = '';
    DOM.messages.dataset.state = 'content';
  }
  const row = buildMessageRow(message);
  if (row) {
    DOM.messages.appendChild(row);
    DOM.messages.scrollTop = DOM.messages.scrollHeight;
  }
}

function buildMessageRow(message) {
  if (!message || message.type !== 'chat:message') return null;

  const isMine =
    state.currentUserId &&
    message.authorId &&
    String(message.authorId) === String(state.currentUserId);

  const row = document.createElement('div');
  row.className = 'row' + (isMine ? ' me' : '');

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  bubble.innerHTML = `
    <strong>${escapeHtml(message.authorName || 'Anonymous')}</strong>
    <div class="meta">${escapeHtml(formatMessageTime(message.createdAt))}</div>
    <p>${escapeHtml(message.content || '')}</p>
  `;

  const avatarNode = createAvatarElement(
    message.authorAvatar ||
      (isMine ? state.currentUserProfile?.avatarUrl : null),
    message.authorName,
  );

  if (!isMine) {
    row.appendChild(avatarNode);
    row.appendChild(bubble);
  } else {
    row.appendChild(bubble);
    row.appendChild(avatarNode);
  }

  return row;
}

export function createAvatarElement(avatarUrl, fallbackName) {
  const node = document.createElement('div');
  node.className = 'avatar-sm';
  const initials = getInitials(fallbackName || 'User');
  if (avatarUrl) {
    const img = document.createElement('img');
    img.src = normalizeAvatarUrl(avatarUrl);
    img.alt = initials;
    node.appendChild(img);
  } else {
    node.textContent = initials;
  }
  return node;
}

export function setProfileButtonAvatar(avatarUrl, initials) {
  if (!DOM.profileBtn || !DOM.profileAvatar) return;
  if (avatarUrl) {
    DOM.profileBtn.classList.add('has-image');
    const normalized = normalizeAvatarUrl(avatarUrl);
    DOM.profileBtn.style.backgroundImage = `url("${normalized.replace(/"/g, '\\"')}")`;
    DOM.profileAvatar.textContent = '';
  } else {
    DOM.profileBtn.classList.remove('has-image');
    DOM.profileBtn.style.backgroundImage = '';
    DOM.profileAvatar.textContent = initials || 'U';
  }
}

export function setProfilePreview(imageSrc, initials) {
  if (!DOM.profileAvatarPreview) return;
  DOM.profileAvatarPreview.innerHTML = '';
  DOM.profileAvatarPreview.style.backgroundImage = '';
  if (imageSrc) {
    const img = document.createElement('img');
    img.src = normalizeAvatarUrl(imageSrc);
    img.alt = 'Avatar preview';
    DOM.profileAvatarPreview.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = initials || 'U';
    DOM.profileAvatarPreview.appendChild(span);
  }
}

export function setChatPreviewAvatar(imageSrc, initials) {
  if (!DOM.chatAvatarPreview) return;
  DOM.chatAvatarPreview.innerHTML = '';
  DOM.chatAvatarPreview.style.backgroundImage = '';
  if (imageSrc) {
    const img = document.createElement('img');
    img.src = normalizeAvatarUrl(imageSrc);
    img.alt = 'Chat avatar preview';
    DOM.chatAvatarPreview.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.textContent = initials || 'CH';
    DOM.chatAvatarPreview.appendChild(span);
  }
}

export function resetProfileModal(profile) {
  if (DOM.profileNameInput)
    DOM.profileNameInput.value = profile?.name || profile?.email || '';
  if (DOM.profileEmail)
    DOM.profileEmail.textContent = profile?.email || '';
  if (DOM.profileAvatarInput) DOM.profileAvatarInput.value = '';
  setProfileError('');
  const initials = getInitials(profile?.name || profile?.email || 'User');
  setProfilePreview(profile?.avatarUrl || null, initials);
}

export function setProfileError(message) {
  if (DOM.profileError) DOM.profileError.textContent = message || '';
}
