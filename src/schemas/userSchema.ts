import { z } from 'zod';

export const userRegisterSchema = z.object({
  name: z.string().min(3, 'Name should be at least 3 characters long'),
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Password should be at least 8 characters long'),
});

export const userLoginSchema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Password should be at least 8 characters long'),
});
