import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateAdminToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(
    token,
    process.env.JWT_SECRET || 'your_jwt_secret',
    (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });

      const userRolle = req.user?.role;

      if (userRolle !== 'admin') {
        return res
          .status(403)
          .json({ message: 'Forbidden: You do not have permisions' });
      }

      req.user = user;

      next();
    },
  );
};

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ message: 'No token provided' });

  jwt.verify(
    token,
    process.env.JWT_SECRET || 'your_jwt_secret',
    (err, user) => {
      if (err) return res.status(403).json({ message: 'Invalid token' });

      const userIdFromToken = req.user?.userId;
      const userIdFromParams = req.params.id;

      if (userIdFromToken !== userIdFromParams) {
        return res.status(403).json({ message: 'Forbidden: Not your account' });
      }
      req.user = user;
      next();
    },
  );
};
