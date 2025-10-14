import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { logger } from '../utils/logger';
import chatService from './chatService';
import { getMessagesByChatId } from './messageService';
import { IChat } from '../models/chatModel';
import { IMessage, Message } from '../models/messageModel';
import authService from './authService';
import userService from './userService';
import { IUser } from '@app/models/userModel';

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
  //chatId: string;
};

// ---- State ----
let wss: WebSocketServer | null = null;

// userId -> ws
const clients = new Map<string, WebSocket>();

//// chatId -> Set<userId>
//const chatParticipants = new Map<string, Set<string>>();

// (optional) if you allow multiple tabs per user, change to Map<string, Set<WebSocket>>
const userSockets = new Map<string, WebSocket>(); // userId -> ws
const userSubscriptions = new Map<string, Set<string>>(); // userId -> Set<chatId>
const chatSubscribers = new Map<string, Set<string>>(); // chatId -> Set<userId>

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

      // 2) Extract token (Authorization: Bearer xxx OR ?token=)
      const token = extractToken(req);
      if (!token) {
        logger.error('auth token is null');
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

      // 4) Accept upgrade and attach metadata
      wss!.handleUpgrade(req, socket, head, (ws) => {
        const meta: WsUserMeta = {
          userId: payload.userId,
          email: payload.email,
          role: payload.role,
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
    const { userId } = (ws as any).user as WsUserMeta;
    // one-socket-per-user (replace existing if reconnects)
    const prev = userSockets.get(userId);
    if (prev && prev !== ws) {
      try { 
        prev.close(1000, "Replaced by new connection"); 
      } catch {
      }
       userSockets.set(userId, ws);
    }
    safeSend(ws, JSON.stringify({ type: "welcome", userId }));

    // Incoming messages
    ws.on('message', async (buf) => {
 let msg: any;
      try { msg = JSON.parse(buf.toString()); } catch { return; }
      switch (msg.type) {
        case 'subscribe':
          if (!msg.chatId) return;
          await subscribeUserToChat(userId, msg.chatId, ws);
          break;

        case 'unsubscribe':
          if (!msg.chatId) return;
          await unsubscribeUserFromChat(userId, msg.chatId);
          break;

        case "message":
          if (!msg.chatId || typeof msg.content !== "string") return;
          await handleIncomingChatMessage(userId, msg.chatId, msg.content);
          break;

        default:
          logger.error('Ignore default' + msg);
          break;
      }
    });

    // Disconnect
    ws.on('close', () => {
      // remove this user from all subscribed chats
      const chats = userSubscriptions.get(userId);
      if (chats) {
        for (const chatId of chats) {
          removeFromMapSet(chatSubscribers, chatId, userId);
          void broadcastUserLeft(userId, chatId);
        }
      }
      userSubscriptions.delete(userId);
      userSockets.delete(userId);
      logger.info(`WS closed user=${userId}`);
    });
    // Errors
    ws.on('error', (e) =>
      logger.error(`WS error user=${userId}: ${String(e)}`),
    );
  });

  return wss;
}

export function getWss() {
  if (!wss)
    throw new Error('WS not initialized. Call initWebSocket(server) first.');
  return wss;
}

// ---- Messaging / subscription helpers ----
async function subscribeUserToChat(
  userId: string,
  chatId: string,
  ws: WebSocket,
) {
  const chat = await getChat(chatId);
  if (!chat) return safeSend(ws, errMsg("chat:not_found", chatId));
  if (!isChatParticipant(chat, userId)) return safeSend(ws, errMsg("chat:forbidden", chatId));

  addToMapSet(userSubscriptions, userId, chatId);
  addToMapSet(chatSubscribers, chatId, userId);

  safeSend(ws, JSON.stringify({ type: "subscribed", chatId }));
}

function unsubscribeUserFromChat(userId: string, chatId: string) {
  removeFromMapSet(userSubscriptions, userId, chatId);
  removeFromMapSet(chatSubscribers, chatId, userId);

  const ws = userSockets.get(userId);
  if (ws) safeSend(ws, JSON.stringify({ type: "unsubscribed", chatId }));
}

async function handleIncomingChatMessage(
  userId: string,
  chatId: string,
  content: string,
) {
  // ensure user is subscribed & a real member
  const subs = userSubscriptions.get(userId);
  if (!subs?.has(chatId)) {
    logger.error('Ignore message chat id ' + chatId);
    return;
  }
  //TODO save message parallel to db, do not need to wait
  const saved: IMessage = await saveMessage(userId, chatId, content);
  const populated = await saved.populate('author', 'name avatarUrl');
  const authorDoc = populated.author as any; // comes back as User doc
  const authorName = authorDoc?.name ?? null;
  const authorAvatar = authorDoc?.avatarUrl ?? null;
  const payload = JSON.stringify({
    type: 'chat:message',
    chatId,
    authorId: userId,
    authorName: authorName,
    authorAvatar,
    content: populated.content,
    createdAt: populated.createdAt,
  });
  // broadcast to all subscribers of this chat
  logger.info('broadcast to all' + payload);
  broadcastToChat(chatId, payload);
}

export function broadcastToChat(chatId: string, msg: string) {
  const userIds = chatSubscribers.get(chatId);
  if (!userIds?.size) return;

  for (const uid of userIds) {
    const ws = userSockets.get(uid);
    if (ws) {
      safeSend(ws, msg);
    }
  }
}

async function broadcastUserLeft(userId: string, chatId: string) {
  try {
    const user = await userService.getUserById(userId);
    const displayName = user?.name || user?.email || 'Someone';
    const systemMsg = JSON.stringify({
      type: 'chat:system',
      chatId,
      content: `${displayName} left the chat`,
      createdAt: new Date().toISOString(),
    });
    broadcastToChat(chatId, systemMsg);
  } catch (err) {
    logger.error(
      `Failed to broadcast leave message for user=${userId}`,
      err as any,
    );
  }
}

// ---- Utilities ---
export function broadcastAll(msg: string) {
  const server = getWss();
  for (const client of server.clients) safeSend(client, msg);
}

function errMsg(code: string, chatId?: string) {
  return JSON.stringify({
    type: 'error',
    code, // e.g. "chat:not_found"
    chatId, // optional, useful context
    timestamp: new Date().toISOString(),
  });
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
