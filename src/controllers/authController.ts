import { Request, Response, NextFunction } from 'express';
import userService from '../services/userService';
import { User, IUser } from '../models/userModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { USER_CREATED_MESSAGE } from '../common/constants';

export const registerUser = async (req: Request, res: Response) => {
  const role = 'user';
  const newUser: IUser = req.body as IUser;
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
  const user: IUser | null = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists for security reasons
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // 2. Compare the password (hashed)
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  // 3. Create JWT token
  const token = jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role, // Include role for authorization
    },
    process.env.JWT_SECRET!, 
    { expiresIn: '1d' },
  );

  // 4. Respond with token (and user info if you like, but never password)
  res.json({
    token,
    user: {
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
};
