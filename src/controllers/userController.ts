import { Request, Response } from 'express';
import path from 'path';
import userService from '../services/userService';
import { HttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserResponseDto } from '../dtos/userResponse.dto';
import {
  USER_NOT_FOUND,
  NO_CONTENT,
  FAILED_TO_CREATE_USER,
} from '../common/constants';
import { IUserDoc } from '../models/userModel';
import fs from 'fs';
import { deleteFileIfExists, saveBase64Image } from '../utils/avatarStorage';

export const getUsers = async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  //dto
  const userDtos = users.map((user) => new UserResponseDto(user));
  res.json(userDtos);
};

export const createUser = async (req: Request, res: Response) => {
  console.log(req.body);
  const userData = req.body;
  const newUser = await userService.createUser(userData);

  if (!newUser) {
    throw new HttpError(400, FAILED_TO_CREATE_USER);
  }
  //dto
  const userDto = new UserResponseDto(newUser);
  res.status(201).json(userDto);
};

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const user: IUserDoc | null = await userService.getUserById(userId);
  if (!user) {
    throw new HttpError(404, USER_NOT_FOUND);
  }

  //dto
  const userDto = new UserResponseDto(user);
  res.json(userDto);
};

export const getUserById = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new HttpError(404, USER_NOT_FOUND);
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
    return res.status(404).json({ message: USER_NOT_FOUND });
  }
  //dto
  const userDto = new UserResponseDto(updatedUser);
  res.json(userDto);
};

export const deleteUserById = async (req: Request, res: Response) => {
  const userId = req.params.id;
  const deletedUser = await userService.deleteUserById(userId);
  if (!deletedUser) {
    return res.status(404).json({ message: USER_NOT_FOUND });
  }
  res.status(204).send(NO_CONTENT);
};

export const uploadMyAvatar = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const { image } = req.body as { image?: string };

  if (!image) {
    throw new HttpError(400, 'Image payload missing');
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    throw new HttpError(404, USER_NOT_FOUND);
  }

  try {
    const { relativePath } = saveBase64Image(image, userId ?? 'avatar');
    const previousAvatar = user.avatarUrl;
    user.avatarUrl = relativePath;
    await user.save();
    if (previousAvatar && previousAvatar !== relativePath) {
      deleteFileIfExists(previousAvatar);
    }
    res.json({ avatarUrl: relativePath });
  } catch (err: any) {
    throw new HttpError(400, err.message || 'Failed to save avatar');
  }
};

export const getMyAvatar = async (req: AuthRequest, res: Response) => {
  const userId = req.user?.userId;
  const user = await userService.getUserById(userId);
  if (!user) {
    throw new HttpError(404, USER_NOT_FOUND);
  }
  if (!user.avatarUrl) {
    throw new HttpError(404, 'Avatar not found');
  }

  const sanitized = user.avatarUrl.replace(/^\//, '');
  const absolutePath = path.join(process.cwd(), sanitized);
  if (!fs.existsSync(absolutePath)) {
    throw new HttpError(404, 'Avatar not found');
  }
  res.sendFile(absolutePath);
};
