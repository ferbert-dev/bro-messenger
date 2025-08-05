import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { HttpError } from '../utils/httpError';

export const validateObjectId = (paramName: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new HttpError(400, `Invalid ${paramName}: ${id}`));
    }
    next();
  };
};
