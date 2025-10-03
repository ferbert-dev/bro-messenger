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

const TIME_FORMATTER_24H = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DATE_TIME_FORMATTER_24H = new Intl.DateTimeFormat(undefined, {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DAY_DIVIDER_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function formatMessageTime(value) {
  const date = parseDate(value);
  if (!date) return '—';
  const now = new Date();
  if (isSameDay(date, now)) {
    return TIME_FORMATTER_24H.format(date);
  }
  return DATE_TIME_FORMATTER_24H.format(date);
}

export function getMessageDayLabel(value) {
  const date = parseDate(value);
  if (!date) return null;
  const now = new Date();
  if (isSameDay(date, now)) return 'Today';
  return DAY_DIVIDER_FORMATTER.format(date);
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

export function dataUrlToBytes(dataUrl) {
  if (!dataUrl) return 0;
  const parts = dataUrl.split(',');
  if (parts.length < 2) return 0;
  const base64 = parts[1];
  const padding = (base64.match(/=+$/) || [''])[0].length;
  return Math.floor(base64.length * 0.75) - padding;
}

export async function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Failed to read file'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = dataUrl;
  });
}

function drawToCanvas(img, scale) {
  const canvas = document.createElement('canvas');
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

function tryGenerate(canvas, mime, quality) {
  let dataUrl;
  try {
    dataUrl = quality != null ? canvas.toDataURL(mime, quality) : canvas.toDataURL(mime);
  } catch (err) {
    return null;
  }
  return { dataUrl, bytes: dataUrlToBytes(dataUrl), mime };
}

export async function compressImageToLimit(file, maxBytes = MAX_IMAGE_BYTES) {
  const baseDataUrl = await readFileAsDataUrl(file);
  if (!baseDataUrl) throw new Error('Unable to read file');
  if (file.size <= maxBytes) return baseDataUrl;

  const image = await loadImage(baseDataUrl);
  const preferredMime = file.type && file.type.startsWith('image/') ? file.type : 'image/jpeg';
  const scales = [1, 0.85, 0.7, 0.55, 0.45, 0.35];
  for (const scale of scales) {
    const canvas = drawToCanvas(image, scale);
    const attempts = [];
    if (preferredMime && preferredMime !== 'image/png') {
      attempts.push({ mime: preferredMime, qualities: [0.92, 0.8, 0.7, 0.6, 0.5, 0.4] });
    } else {
      attempts.push({ mime: 'image/png', qualities: [null] });
      attempts.push({ mime: 'image/jpeg', qualities: [0.92, 0.8, 0.7, 0.6, 0.5, 0.4] });
    }

    for (const attempt of attempts) {
      for (const quality of attempt.qualities) {
        const result = tryGenerate(canvas, attempt.mime, quality);
        if (!result) continue;
        if (result.bytes <= maxBytes) {
          return result.dataUrl;
        }
      }
    }
  }

  throw new Error('Image is too large to compress to the required size');
}
