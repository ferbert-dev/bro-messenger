import { Request, Response } from 'express';
import userService from '../services/userService';
import chatService from '../services/chatService';
import { HttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserResponseDto } from '../dtos/userResponse.dto';

export const getUsers = async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  //dto
  const userDtos = users.map((user) => new UserResponseDto(user));
  res.json(userDtos);
};

export const getMyChats = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const chats = await chatService.getMyChats(userId);
  console.log('chats: ' + chats);
  //dto
  //const userDtos = users.map((user) => new UserResponseDto(user));
  res.json(chats);
};

export const createChat = async (req: AuthRequest, res: Response) => {
  console.log(req.body);
  const userId = req.user?.userId;
  const chatData: CreateChatRequest = req.body;
  chatData.adminId = userId;
  const newChat = await chatService.createChat(chatData);

  if (!newChat) {
    throw new HttpError(400, 'FAILED_TO_CREATE_CHAT');
  }
  //dto
  //const userDto = new UserResponseDto(newUser);
  res.status(201).json(newChat);
};

export const createUser = async (req: Request, res: Response) => {
  console.log(req.body);
  const userData = req.body;
  const newUser = await userService.createUser(userData);

  if (!newUser) {
    throw new HttpError(400, 'Failed to create user');
  }
  //dto
  const userDto = new UserResponseDto(newUser);
  res.status(201).json(userDto);
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  //dto
  const userDto = new UserResponseDto(user);
  res.json(userDto);
};

export const getUserById = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found');
  }

  //dto
  const userDto = new UserResponseDto(user);
  res.json(userDto);
};

export const updateUserById = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const userData = req.body;
  const updatedUser = await userService.updateUserById(userId, userData);
  if (!updatedUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  //dto
  const userDto = new UserResponseDto(updatedUser);
  res.json(userDto);
};

export const deleteUserById = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const deletedUser = await userService.deleteUserById(userId);
  if (!deletedUser) {
    return res.status(404).json({ message: 'User not found' });
  }
  res.status(204).send('Deleted');
};

export const getChatById = async (req: AuthRequest, res: Response) => {
  const chatId = req.params.chatId;
  const userId = req.user?.userId;
  const chat = await chatService.getChatById(chatId);
  if (!chat) {
    throw new HttpError(404, 'CHAT_NOT_ FOUND');
  }
  if (!chat.participants.some((p) => p.equals(userId))) {
    throw new HttpError(403, 'You are not in this chat');
  }

  //dto
  res.json(chat);
};

export const addPartticipantsToChatById = async (
  req: AuthRequest,
  res: Response,
) => {
  const chatId = req.params.chatId;
  const newUserId = req.body.userId;

  const userId = req.user?.userId;
  const chat = await chatService.getChatById(chatId);
  if (!chat) {
    throw new HttpError(404, 'CHAT_NOT_ FOUND');
  }
  if (!chat.admins.some((p) => p.equals(userId))) {
    throw new HttpError(403, 'You are not admin in this chat');
  }
  const result = await chatService.addParticipant(chatId, newUserId);

  //dto
  res.status(201).json(result);
};

export const removeParticipantsFromChatById = async (
  req: AuthRequest,
  res: Response,
) => {
  const chatId = req.params.chatId;
  const userIdtoRemove = req.params.userId;

  const userId = req.user?.userId;
  const chat = await chatService.getChatById(chatId);

  if (!chat) {
    throw new HttpError(404, 'CHAT_NOT_ FOUND');
  }
  if (!chat.admins.some((p) => p.equals(userId))) {
    throw new HttpError(403, 'You are not admin in this chat');
  }

  const result = await chatService.removeParticipant(chatId, userIdtoRemove);

  //dto
  res.status(204).json(result);
};
