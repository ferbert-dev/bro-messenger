import { WS_BASE_URL } from './chat.constants.js';
import { state } from './chat.state.js';

let messageHandler = null;

function enqueue(action) {
  state.pendingSocketActions.push(action);
}

function flushQueue() {
  while (state.pendingSocketActions.length) {
    const action = state.pendingSocketActions.shift();
    try {
      action?.();
    } catch (err) {
      console.error('Failed to run queued socket action', err);
    }
  }
}

function ensureSocket(action) {
  if (!state.socket) {
    enqueue(action);
    initSocket(messageHandler);
    return;
  }

  switch (state.socket.readyState) {
    case WebSocket.OPEN:
      action();
      break;
    case WebSocket.CONNECTING:
      enqueue(action);
      break;
    default:
      enqueue(action);
      initSocket(messageHandler);
  }
}

export function initSocket(onMessage) {
  if (onMessage) {
    messageHandler = onMessage;
  }
  if (!state.authToken) return;

  if (state.socket && state.socket.readyState !== WebSocket.CLOSED) {
    try {
      state.socket.close(1000, 'Re-initializing socket');
    } catch {}
  }

  const url = new URL(WS_BASE_URL, window.location.href);
  if (window.location.protocol === 'https:') {
    url.protocol = 'wss:';
  }
  url.searchParams.set('token', state.authToken);

  state.socket = new WebSocket(url.toString());

  state.socket.addEventListener('open', () => {
    flushQueue();
    if (state.activeChatId) subscribeToChat(state.activeChatId);
  });

  state.socket.addEventListener('message', (event) => {
    try {
      const payload = JSON.parse(event.data);
      messageHandler?.(payload);
    } catch (err) {
      console.error('Bad WS message', err, event.data);
    }
  });

  state.socket.addEventListener('error', (event) => {
    console.error('WebSocket error observed:', event);
  });
  state.socket.addEventListener('close', () => {
    console.warn('WebSocket closed');
  });
}

export function subscribeToChat(chatId) {
  if (!chatId) return;
  ensureSocket(() => {
    const payload = JSON.stringify({ type: 'subscribe', chatId });
    state.socket.send(payload);
  });
}

export function sendChatMessage(chatId, content) {
  const trimmed = (content || '').trim();
  if (!chatId || !trimmed) return;

  ensureSocket(() => {
    const payload = JSON.stringify({ type: 'message', chatId, content: trimmed });
    state.socket.send(payload);
  });
}
