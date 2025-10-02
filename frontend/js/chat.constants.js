export const API_URL = 'http://localhost:3000/api/chats';
export const PROFILE_URL = 'http://localhost:3000/api/users/me';
export const USER_AVATAR_URL = 'http://localhost:3000/api/users/me/avatar';
export const WS_BASE_URL = 'ws://localhost:3000/ws';
export const TOKEN_KEY = 'authToken';
export const USER_KEY = 'user';

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

export const SOCKET_EVENTS = {
  welcome: 'welcome',
  subscribed: 'subscribed',
  unsubscribed: 'unsubscribed',
  error: 'error',
};
