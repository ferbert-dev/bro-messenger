import { Request, Response } from 'express';
import userService from '../services/userService';
import { HttpError } from '../utils/httpError';
import { AuthRequest } from '../middleware/authMiddleware';
import { UserResponseDto } from '../dtos/userResponse.dto';
import {USER_NOT_FOUND, NO_CONTENT, FAILED_TO_CREATE_USER
} from '../common/constants'
import { IUserDoc } from '../models/userModel';

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
  const user : IUserDoc | null = await userService.getUserById(userId);
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