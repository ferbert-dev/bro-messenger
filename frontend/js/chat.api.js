import {
  API_URL,
  PROFILE_URL,
  USER_AVATAR_URL,
} from './chat.constants.js';
import { safeText } from './chat.utils.js';

export async function loadCurrentUser(token) {
  const res = await fetch(PROFILE_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to load profile');
  }
  return res.json();
}

export async function fetchChats(token) {
  const res = await fetch(API_URL, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to load chats');
  }
  return res.json();
}

export async function fetchChatDetails(token, chatId) {
  const res = await fetch(`${API_URL}/${encodeURIComponent(chatId)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to load chat');
  }
  return res.json();
}

export async function fetchChatMessages(token, chatId) {
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
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to load messages');
  }
  return res.json();
}

export async function createChat(token, payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to create chat');
  }
  return res.json();
}

export async function updateProfile(token, payload) {
  const res = await fetch(PROFILE_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to update profile');
  }
  return res.json();
}

export async function uploadUserAvatar(token, image) {
  const res = await fetch(USER_AVATAR_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    body: JSON.stringify({ image }),
  });
  if (!res.ok) {
    const msg = await safeText(res);
    throw new Error(msg || 'Failed to upload avatar');
  }
  return res.json();
}
