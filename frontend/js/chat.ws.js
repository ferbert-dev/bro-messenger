import { WS_BASE_URL } from './chat.constants.js';
import { state } from './chat.state.js';

const RECONNECT_DELAY_MS = 1500;

let messageHandler = null;
let reconnectTimer = null;

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

function clearReconnectTimer() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer || !state.authToken) return;
  if (state.socket && state.socket.readyState === WebSocket.OPEN) return;

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initSocket();
  }, RECONNECT_DELAY_MS);
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

  clearReconnectTimer();

  const url = new URL(WS_BASE_URL, window.location.href);
  if (window.location.protocol === 'https:') {
    url.protocol = 'wss:';
  }
  url.searchParams.set('token', state.authToken);

  const ws = new WebSocket(url.toString());
  state.socket = ws;

  ws.addEventListener('open', () => {
    if (state.socket !== ws) return;
    clearReconnectTimer();
    flushQueue();
    if (state.activeChatId) subscribeToChat(state.activeChatId);
  });

  ws.addEventListener('message', (event) => {
    if (state.socket !== ws) return;
    try {
      const payload = JSON.parse(event.data);
      messageHandler?.(payload);
    } catch (err) {
      console.error('Bad WS message', err, event.data);
    }
  });

  ws.addEventListener('error', (event) => {
    if (state.socket !== ws) return;
    console.error('WebSocket error observed:', event);
    scheduleReconnect();
  });

  ws.addEventListener('close', () => {
    if (state.socket === ws) {
      state.socket = null;
      scheduleReconnect();
    }
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
