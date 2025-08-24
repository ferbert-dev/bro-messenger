import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IUser extends Document {
  name: string;
  age?: number;
  email: string;
  password: string;
  role: 'admin' | 'user' | 'guest';
}

export interface IUserDoc extends IUser {
  _id: Types.ObjectId;
}

export type IUserCreate = IUser;

export type LoginUserData = {
  id: string;
  email: string;
  role: string;
};

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    age: { type: Number, required: false },
    password: { type: String, requered: true },
    email: { type: String, required: true, unique: true },
    role: { type: String, enum: ['admin', 'user', 'guest'], default: 'user' },
  },
  // This is useful for optimistic concurrency control
  // and to ensure that the document is not modified by another operation
  {
    versionKey: '__v', //  custom version key
    optimisticConcurrency: true, //  enable optimistic locking
  },
);

export const User = mongoose.model<IUser>('User', userSchema);
