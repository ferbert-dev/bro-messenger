import jwt from 'jsonwebtoken';
import { LoginUserData } from '../models/userModel';
import bcrypt from 'bcryptjs';
export async function createUserToken(data: LoginUserData) : Promise<string> {
  const JWT_SECRET = process.env.JWT_SECRET!;
  return jwt.sign(
      {
        userId: data.id,
        email: data.email,
        role: data.role, 
      },
      JWT_SECRET,
      { expiresIn: '1d' },
    );
};

export async function comparePassword(current: string, input: string) : Promise<boolean> {
  return await bcrypt.compare(current, input);
};

export async function hashPassword(input: string) : Promise<String> {
  return await bcrypt.hash(input, 10);
}; 

export function verifyToken<T>(token: string): T {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);

    if (typeof decoded === "string") {
      throw new Error("Invalid token payload");
    }

    return decoded as T;
  } catch (err) {
    throw new Error("Token verification failed");
  }
}

export const authService = {
  createUserToken,
  comparePassword,
  hashPassword,
  verifyToken
};




export default authService;