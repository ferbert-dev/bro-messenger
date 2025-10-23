import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import chatService from '../services/chatService';
import { getMessagesByChatId } from '../services/messageService';
import { HttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  CHAT_NOT_FOUND,
  FAILED_TO_CREATE_CHAT,
  YOU_ARE_NOT_ADMIN,
  YOU_ARE_NOT_MEMEBER,
} from '../common/constants';
import { ChatResponseDto } from '../dtos/chatResponse.dto';
import { deleteFileIfExists, saveBase64Image } from '../utils/avatarStorage';

export const getAllChatsForUserById = async (
  req: AuthRequest,
  res: Response,
) => {
  const userId = req.user?.userId;
  const chats = await chatService.getMyChats(userId);

  //dto
  const chatDtos = chats.map((chat) => new ChatResponseDto(chat));
  res.status(200).json(chatDtos);
};

export const getAllChats = async (req: AuthRequest, res: Response) => {
  const chats = await chatService.getAllChats();

  //dto
  const chatDtos = chats.map((chat) => new ChatResponseDto(chat));
  res.status(200).json(chatDtos);
};

export const getChatById = async (req: AuthRequest, res: Response) => {
  const chatId = req.params.chatId;
  const userId = req.user?.userId;
  const chat = await chatService.getChatById(chatId);
  if (!chat) {
    throw new HttpError(404, CHAT_NOT_FOUND);
  }
  //if (!chat.participants.some((p) => p.equals(userId))) {
  //  throw new HttpError(403, YOU_ARE_NOT_MEMEBER);
  //}

  //dto
  const dto = new ChatResponseDto(chat);
  res.status(200).json(dto);
};

export const getChatMessagesById = async (req: AuthRequest, res: Response) => {
  const chatId = req.params.chatId;
  const userId = req.user?.userId;
  const chat = await chatService.getChatById(chatId);
  if (!chat) {
    throw new HttpError(404, CHAT_NOT_FOUND);
  }
  // TODO implement check after add memeber to the chat feature
  //if (!chat.participants.some((p) => p.equals(userId))) {
  //  throw new HttpError(403, YOU_ARE_NOT_MEMEBER);
  //}

  //dto
  const dto = await getMessagesByChatId(chatId);
  res.status(200).json(dto);
};

export const createChat = async (req: AuthRequest, res: Response) => {
  console.log(req.body);
  const userId = req.user?.userId;
  const chatData: CreateChatRequest = req.body;
  chatData.adminId = userId;
  chatData.participantIds = Array.isArray(chatData.participantIds)
    ? chatData.participantIds
    : [];

  if (chatData.avatarImage) {
    try {
      const { relativePath } = await saveBase64Image(
        chatData.avatarImage,
        `chat-${userId}`,
      );
      chatData.avatarUrl = relativePath;
    } catch (err: any) {
      throw new HttpError(400, err.message || 'Invalid chat avatar image');
    }
    delete chatData.avatarImage;
  }

  let createdChat;
  try {
    createdChat = await chatService.createChat(chatData);
  } catch (err) {
    if (chatData.avatarUrl) {
      deleteFileIfExists(chatData.avatarUrl);
    }
    throw err;
  }

  if (!createdChat) {
    if (chatData.avatarUrl) {
      deleteFileIfExists(chatData.avatarUrl);
    }
    throw new HttpError(400, FAILED_TO_CREATE_CHAT);
  }

  //dto
  const dto = new ChatResponseDto(createdChat);
  res.status(201).json(dto);
};

export const addMemberByIdToTheChat = async (
  req: AuthRequest,
  res: Response,
) => {
  const chatId = req.params.chatId;
  const newUserId = req.body.userId;

  const userId = req.user?.userId;
  const chat = await chatService.getChatById(chatId);
  if (!chat) {
    throw new HttpError(404, CHAT_NOT_FOUND);
  }
  if (!chat.admins.some((p) => p.equals(userId))) {
    throw new HttpError(403, YOU_ARE_NOT_ADMIN);
  }
  const updatedChat = await chatService.addMember(chatId, newUserId);

  //dto
  const dto = new ChatResponseDto(updatedChat);
  res.status(201).json(dto);
};

export const removeMemberByIdFromTheChat = async (
  req: AuthRequest,
  res: Response,
) => {
  const chatId = req.params.chatId;
  const userIdtoRemove = req.params.userId;

  const userId = req.user?.userId;
  const chat = await chatService.getChatById(chatId);

  if (!chat) {
    throw new HttpError(404, CHAT_NOT_FOUND);
  }
  if (!chat.admins.some((p) => p.equals(userId))) {
    throw new HttpError(403, YOU_ARE_NOT_ADMIN);
  }

  const updatedChat = await chatService.removeMember(chatId, userIdtoRemove);

  //dto
  const dto = new ChatResponseDto(updatedChat);
  res.status(204).json(dto);
};

export const uploadChatAvatar = async (req: AuthRequest, res: Response) => {
  const chatId = req.params.chatId;
  const userId = req.user?.userId;
  const { image } = req.body as { image?: string };

  if (!image) {
    throw new HttpError(400, 'Image payload missing');
  }

  const chat = await chatService.getChatById(chatId);
  if (!chat) {
    throw new HttpError(404, CHAT_NOT_FOUND);
  }

  if (!chat.admins?.some((admin: any) => admin?.toString() === userId)) {
    throw new HttpError(403, YOU_ARE_NOT_ADMIN);
  }

  const previousAvatar = chat.avatarUrl;
  try {
    const { relativePath } = await saveBase64Image(image, `chat-${chatId}`);
    await chatService.updateChatAvatar(chatId, relativePath);
    if (previousAvatar && previousAvatar !== relativePath) {
      deleteFileIfExists(previousAvatar);
    }
    res.json({ avatarUrl: relativePath });
  } catch (err: any) {
    throw new HttpError(400, err.message || 'Failed to save avatar');
  }
};

export const getChatAvatar = async (req: AuthRequest, res: Response) => {
  const chatId = req.params.chatId;
  const chat = await chatService.getChatById(chatId);
  if (!chat || !chat.avatarUrl) {
    throw new HttpError(404, 'Avatar not found');
  }

  const sanitized = chat.avatarUrl.replace(/^\//, '');
  const absolutePath = path.join(process.cwd(), sanitized);
  if (!fs.existsSync(absolutePath)) {
    throw new HttpError(404, 'Avatar not found');
  }
  res.sendFile(absolutePath);
};
