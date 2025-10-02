import { state } from './chat.state.js';
import { getInitials } from './chat.utils.js';

const DROPPED_TYPES = new Set(['welcome', 'subscribed', 'unsubscribed', 'error']);

export function normalizeMessagePayload(raw) {
  if (!raw) return null;
  const type = raw.type || 'chat:message';
  if (DROPPED_TYPES.has(type)) return null;

  if (type === 'chat:system') {
    const chatId = resolveChatId(raw.chatId || raw.chat);
    return {
      type,
      chatId: chatId || state.activeChatId,
      content: raw.content || '',
      createdAt: raw.createdAt || new Date().toISOString(),
    };
  }

  const author = raw.author || {};
  const chatId = resolveChatId(raw.chatId || raw.chat);
  const authorId = resolveAuthorId(raw.authorId || author.id || author._id);
  return {
    type: 'chat:message',
    chatId: chatId || state.activeChatId,
    authorId,
    authorName: raw.authorName || author.name || 'Anonymous',
    authorAvatar: raw.authorAvatar || author.avatarUrl || null,
    content: raw.content ?? '',
    createdAt: raw.createdAt || raw.updatedAt || new Date().toISOString(),
  };
}

function resolveChatId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value?._id || value?.id || value?.chatId || null;
}

function resolveAuthorId(value) {
  if (!value) return null;
  return String(value);
}

export function cacheMessage(message) {
  if (!message?.chatId) return;
  const current = state.messageCache.get(message.chatId) || [];
  state.messageCache.set(message.chatId, [...current, message]);
}

export function setMessages(chatId, list) {
  state.messageCache.set(chatId, list);
}

export function clearMessages(chatId) {
  state.messageCache.delete(chatId);
}
