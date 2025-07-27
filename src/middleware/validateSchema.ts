import { Request, Response, NextFunction } from 'express';
import { ZodType } from 'zod';
import { HttpError } from '../utils/httpError';

export const validateSchema = (schema: ZodType<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const message = result.error.issues.map((e) => e.message).join(', ');
      return next(new HttpError(400, `Validation failed: ${message}`));
    }

    req.body = result.data; // <- data is now type-safe and parsed
    next();
  };
};