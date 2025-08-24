import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import chatService from './chatService';
import { getMessagesByChatId } from './messageService';
import { IChat } from '../models/chatModel';
import { IMessage, Message } from '../models/messageModel';
import authService from './authService';

// ---- Types ----
type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};

type WsUserMeta = {
  userId: string;
  email?: string;
  role?: string;
  chatId: string;
};

// ---- State ----
let wss: WebSocketServer | null = null;

// userId -> ws
const clients = new Map<string, WebSocket>();

// chatId -> Set<userId>
const chatParticipants = new Map<string, Set<string>>();

// ---- Public API ----
export function initWebSocket(server: Server, path = '/ws') {
  // Create WS server in "noServer" mode — we'll gate upgrades manually
  wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', async (req, socket, head) => {
    try {
      const url = new URL(req.url || '', 'http://localhost');
      if (url.pathname !== path) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.destroy();
        return;
      }
      // 1) Extract params
      const chatId = url.searchParams.get('chatId');
      if (!chatId) {
        socket.write('HTTP/1.1 400 Bad Request\r\n\r\nchatId is required');
        socket.destroy();
        return;
      }

      // 2) Extract token (Authorization: Bearer xxx OR ?token=)
      const token = extractToken(req);
      if (!token) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n10');
        socket.destroy();
        return;
      }

      // 3) Verify JWT
      const payload: JwtPayload = authService.verifyToken<JwtPayload>(token);
      if (!payload?.userId) {
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }

      // 4) Check chat exists & membership
      const chat = await getChat(chatId);
      if (!chat) {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\nChat not found');
        socket.destroy();
        return;
      }
      if (!isChatParticipant(chat, payload.userId)) {
        socket.write('HTTP/1.1 403 Forbidden\r\n\r\nNot a member of this chat');
        socket.destroy();
        return;
      }

      // 5) Accept upgrade and attach metadata
      wss!.handleUpgrade(req, socket, head, (ws) => {
        const meta: WsUserMeta = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
          chatId,
        };
        (ws as any).user = meta; // attach metadata for later
        wss!.emit('connection', ws, req);
      });
    } catch (err) {
      logger.info(err);
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
    }
  });

  // Normal WS usage after connection accepted
  wss.on('connection', async (ws: WebSocket) => {
    const user = (ws as any).user as WsUserMeta;
    const { userId, chatId } = user;

    // Track connections
    clients.set(userId, ws);
    addToMapSet(chatParticipants, chatId, userId);
    logger.info(`🔌 WS connected: user=${userId} chat=${chatId}`);

    // Optional: greet
    safeSend(ws, JSON.stringify({ type: 'welcome', chatId }));

    const messages = await getAllMessages(chatId);
    messages?.forEach((m) => {
      safeSend(
        ws,
        JSON.stringify({
          type: 'chat:message',
          chatId,
          author: m.author,
          content: m.content,
          createdAt: m.createdAt,
        }),
      );
    });

    // Incoming messages
    ws.on('message', async (buf) => {
      const text = buf.toString();
      logger.info(`WS msg from ${userId} (${chatId}): ${text}`);

      // Save the message to DB
      const saved: IMessage = await saveMessage(userId, chatId, text);

      // Broadcast to all members of this chat
      broadcastToChat(
        chatId,
        JSON.stringify({
          type: 'chat:message',
          chatId,
          authorId: userId,
          content: saved.content,
          createdAt: saved.createdAt,
        }),
      );
    });

    // Disconnect
    ws.on('close', () => {
      clients.delete(userId);
      removeFromMapSet(chatParticipants, chatId, userId);
      logger.info(`❌ WS disconnected: user=${userId} chat=${chatId}`);
    });

    // Errors
    ws.on('error', (error) => {
      logger.error(`WS error for user=${userId}: ${String(error)}`);
    });
  });

  return wss;
}

export function getWss() {
  if (!wss)
    throw new Error('WS not initialized. Call initWebSocket(server) first.');
  return wss;
}

export function broadcastAll(msg: string) {
  const server = getWss();
  for (const client of server.clients) safeSend(client, msg);
}

// Send to all sockets in one chat
export function broadcastToChat(chatId: string, msg: string) {
  const userIds = chatParticipants.get(chatId);
  if (!userIds?.size) return;

  for (const userId of userIds) {
    const ws = clients.get(userId);
    if (ws) safeSend(ws, msg);
  }
}

// ---- Internals ----
function isChatParticipant(chat: IChat, userId: string): boolean {
  return chat.participants.some((p) => p.equals(userId));
}

async function getChat(id: string): Promise<IChat | null> {
  // Make sure this returns a hydrated doc or lean consistently
  return chatService.getChatById(id); // adjust if your service returns lean
}

async function getAllMessages(chatId: string): Promise<IMessage[] | null> {
  return await getMessagesByChatId(chatId);
}

function addToMapSet(
  map: Map<string, Set<string>>,
  key: string,
  value: string,
) {
  let set = map.get(key);
  if (!set) {
    set = new Set<string>();
    map.set(key, set);
  }
  set.add(value);
}

function removeFromMapSet(
  map: Map<string, Set<string>>,
  key: string,
  value: string,
) {
  map.get(key)?.delete(value);
}

function safeSend(ws: WebSocket, msg: string) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(msg);
  }
}

async function saveMessage(
  authorId: string,
  chatId: string,
  content: string,
): Promise<IMessage> {
  // If your Message model returns a document, this is fine;
  // If you need plain JSON, call .toObject() after create()
  return await Message.create({ author: authorId, chat: chatId, content });
}

// Token extractor supporting Authorization, Sec-WebSocket-Protocol, ?token=, Cookie
function extractToken(req: import('http').IncomingMessage): string | null {
  // Authorization: Bearer
  const auth = req.headers['authorization'];
  if (typeof auth === 'string' && auth.startsWith('Bearer '))
    return auth.slice(7);

  // Sec-WebSocket-Protocol (first value)
  const proto = req.headers['sec-websocket-protocol'];
  if (typeof proto === 'string' && proto.trim().length > 0) {
    return proto.split(',')[0].trim();
  }

  // Query ?token=
  const url = new URL(req.url || '', 'http://localhost');
  const fromQuery = url.searchParams.get('token');
  if (fromQuery) return fromQuery;

  // Cookie token=
  const cookie = req.headers.cookie;
  if (cookie) {
    const match = cookie.match(/(?:^|;\s*)token=([^;]+)/);
    if (match) return decodeURIComponent(match[1]);
  }
  return null;
}
