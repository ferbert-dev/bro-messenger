const ORIGIN = window.location.origin.replace(/\/$/, '');

const resolveOverride = (key) =>
  typeof window !== 'undefined' && window[key]
    ? String(window[key]).replace(/\/$/, '')
    : null;

const resolvedApiBase =
  resolveOverride('__API_BASE_URL__') ||
  resolveOverride('API_BASE_URL') ||
  `${ORIGIN}/api`;

const resolvedWsBase =
  resolveOverride('__WS_BASE_URL__') ||
  resolveOverride('WS_BASE_URL') ||
  `${ORIGIN.replace(/^http/, 'ws')}/ws`;

export const API_BASE_URL = resolvedApiBase.replace(/\/$/, '');
export const WS_BASE_URL = resolvedWsBase.replace(/\/$/, '');

export const API_URL = `${API_BASE_URL}/chats`;
export const PROFILE_URL = `${API_BASE_URL}/users/me`;
export const USER_AVATAR_URL = `${API_BASE_URL}/users/me/avatar`;
export const TOKEN_KEY = 'authToken';
export const USER_KEY = 'user';
export const UPLOADS_BASE_URL = `${ORIGIN}/uploads`;
export const CHAT_AVATAR_URL = (chatId) =>
  `${API_BASE_URL}/chats/${encodeURIComponent(chatId)}/avatar`;

if (typeof window !== 'undefined') {
  window.__API_BASE_URL__ = API_BASE_URL;
  window.__WS_BASE_URL__ = WS_BASE_URL;
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export const SOCKET_EVENTS = {
  welcome: 'welcome',
  subscribed: 'subscribed',
  unsubscribed: 'unsubscribed',
  error: 'error',
};
