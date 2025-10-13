const API_PROTOCOL = window.location.protocol === 'https:' ? 'https:' : 'http:';
const API_HOSTNAME = window.location.hostname || 'localhost';
const API_BASE = `${API_PROTOCOL}//${API_HOSTNAME}:3000`;
const WS_PROTOCOL = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

export const API_URL = `${API_BASE}/api/chats`;
export const PROFILE_URL = `${API_BASE}/api/users/me`;
export const USER_AVATAR_URL = `${API_BASE}/api/users/me/avatar`;
export const WS_BASE_URL = `${WS_PROTOCOL}//${API_HOSTNAME}:3000/ws`;
export const TOKEN_KEY = 'authToken';
export const USER_KEY = 'user';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export const SOCKET_EVENTS = {
  welcome: 'welcome',
  subscribed: 'subscribed',
  unsubscribed: 'unsubscribed',
  error: 'error',
};
