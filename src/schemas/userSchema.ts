import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(3, 'Name should be at least 3 characters long'),
  email: z.email('Invalid email'),
  age: z.number().min(18, 'Age must be at least 18'),
});