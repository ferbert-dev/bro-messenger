import { MAX_IMAGE_BYTES } from './chat.constants.js';

export function escapeHtml(str) {
  return String(str).replace(
    /[&<>"']/g,
    (s) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[s],
  );
}

export function getInitials(title) {
  if (!title) return 'U';
  const parts = title.trim().split(/\s+/).slice(0, 2);
  return parts
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function formatMessageTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export async function safeText(res) {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export function normalizeAvatarUrl(url) {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return `${window.location.protocol}${url}`;
  if (url.startsWith('/')) return `${window.location.origin}${url}`;
  return `${window.location.origin}/${url}`;
}

export function isImageFile(file) {
  return file && file.type.startsWith('image/');
}

export function validateFileSize(file) {
  return file.size <= MAX_IMAGE_BYTES;
}
