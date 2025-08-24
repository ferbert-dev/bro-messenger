import { Types } from 'mongoose';
import { HttpError } from './httpError';

export const ensureObjectId = (id: string | Types.ObjectId) => {
  if (!Types.ObjectId.isValid(id)) throw new HttpError(404, 'Invalid ObjectId');
  return new Types.ObjectId(id);
};
