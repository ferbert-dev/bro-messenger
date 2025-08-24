import { Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import { IUserDoc, IUserCreate, LoginUserData } from '../models/userModel';
import {
  USER_CREATED_MESSAGE,
  INVALID_EMAIL_OR_PASSWORD,
} from '../common/constants';
import authService from '../services/authService';

export const registerUser = async (req: Request, res: Response) => {
  const role = 'user';
  const newUser: IUserCreate = req.body as IUserCreate;
  // ... check if user exists, hash password, save user
  const savedUser = await userService.createUser(newUser);

  res.status(201).json({ message: USER_CREATED_MESSAGE });
};

export const loginUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { email, password } = req.body;

  // 1. Find user by email
  const user: IUserDoc | null = await userService.getOneByEmail(email);

  if (!user) {
    // Don't reveal if user exists for security reasons
    return res.status(401).json({ message: INVALID_EMAIL_OR_PASSWORD });
  }

  // 2. Compare the password (hashed)
  const isMatch = authService.comparePassword(user.password, password);

  if (!isMatch) {
    return res.status(401).json({ message: INVALID_EMAIL_OR_PASSWORD });
  }

  // 3. Create JWT token
  const loginUser: LoginUserData = {
    id: user._id.toString(),
    email: user.email!,
    role: user.role!,
  };
  // 3. Create JWT token

  const token = await authService.createUserToken(loginUser);

  // 4. Respond with token and user info
  res.json({
    token,
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
};
