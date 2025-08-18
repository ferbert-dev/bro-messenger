import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  content: string;
  author: mongoose.Types.ObjectId;
  chat: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    content: { type: String, required: true },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User', // must match the model name
      required: true,
    },
    chat: {
      type: Schema.Types.ObjectId,
      ref: 'Chat', // must match the model name
      required: true,
    },
  },
  // This is useful for optimistic concurrency control
  // and to ensure that the document is not modified by another operation
  {
    versionKey: '__v', //  custom version key
    optimisticConcurrency: true, //  enable optimistic locking
    timestamps: true, // auto adds createdAt & updatedAt
  },
);

export const Message = mongoose.model<IMessage>('Message', messageSchema);
