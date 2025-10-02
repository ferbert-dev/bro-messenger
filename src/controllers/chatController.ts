import { Response } from 'express';
import chatService from '../services/chatService';
import {getMessagesByChatId} from '../services/messageService';
import { HttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  CHAT_NOT_FOUND,
  FAILED_TO_CREATE_CHAT,
  YOU_ARE_NOT_ADMIN,
  YOU_ARE_NOT_MEMEBER,
} from '../common/constants';
import { ChatResponseDto } from '../dtos/chatResponse.dto';

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

export const getAllChats = async (
  req: AuthRequest,
  res: Response,
) => {
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
  res.status(200).json(chat);
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
  const createdChat = await chatService.createChat(chatData);

  if (!createdChat) {
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
