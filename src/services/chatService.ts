import { HttpError } from '../utils/httpError';
import { Chat, IChat } from '../models/chatModel';
import { Types } from 'mongoose';
import { ensureObjectId } from '../utils/objectIdValidator';
import { User } from '../models/userModel';

export const getAllChats = async () => {
  return await Chat.find();
};

export const getMyChats = (userIdRaw: string): Promise<IChat[]> => {
  const id = ensureObjectId(userIdRaw);
  return Chat.find({ $or: [{ admins: id }, { participants: id }] });
};

export async function createChat(data: CreateChatRequest): Promise<IChat> {
  try {
    const title = data.title ?? 'New Chat';
    const adminIds: Types.ObjectId[] = [ensureObjectId(data.adminId)];
    const participantIds: Types.ObjectId[] = data.participantIds.map((id) =>
      ensureObjectId(id),
    );
    // ensure admin <= participants
    const allParticipants = Array.from(
      new Set([...participantIds.map(String), ...adminIds.map(String)]),
    ).map((id) => new Types.ObjectId(id));

    return Chat.create({
      title,
      admins: adminIds,
      participants: allParticipants,
    });
  } catch (err) {
    // Pass other errors up
    throw err;
  }
}

export async function addParticipant(
  chatIdRaw: string,
  userIdRaw: string,
): Promise<IChat> {
  const chatId = ensureObjectId(chatIdRaw);
  const userId = ensureObjectId(userIdRaw);

  const userExists = User.exists({ _id: userId }); // fast existence check
  if (!userExists) throw new HttpError(404, 'USER_NOT_FOUND');

  // 1) Load the chat doc
  const chat = await Chat.findById(chatId);
  if (!chat) throw new Error('Chat not found');

  // 2) Add only if missing (ObjectId equality!)
  if (!chat.participants.some((p) => p.equals(userId))) {
    chat.participants.push(userId);
  }

  // 3) Save (triggers pre('save') hooks, validation, etc.)
  await chat.save();
  // 4) Populate and return
  await chat.populate('participants', 'name email');
  return chat;
}

export async function removeParticipant(
  chatIdRaw: string,
  userIdRaw: string,
): Promise<IChat> {
  const chatId = ensureObjectId(chatIdRaw);
  const userId = ensureObjectId(userIdRaw);

  const chat = await Chat.findById(chatId);
  if (!chat) throw new Error('CHAT_NOT_FOUND');

  // 2) Remove user from participants and admins
  // `pull` removes all matching entries (handles duplicates if any)
  chat.participants.pull(userId);
  chat.admins.pull(userId);
  // 3) Save (runs validation + pre('save') middleware)
  await chat.save();
  return chat.populate('participants', 'name email');
}

export async function getChatById(chatIdRaw: string): Promise<IChat | null> {
  const chatId = ensureObjectId(chatIdRaw);
  const chat = await Chat.findById(chatId);
  return chat;
}

export const chatService = {
  getMyChats,
  addParticipant,
  removeParticipant,
  createChat,
  getChatById,
};

export default chatService;
