import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../utils/httpError';

const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const status = err instanceof HttpError ? err.statusCode : 500;

  console.error(`[${req.method}] ${req.path} - ${err.message}`);

  res.status(status).json({
    success: false,
    message: err.message || 'Something went wrong',
  });
};

export default errorHandler;