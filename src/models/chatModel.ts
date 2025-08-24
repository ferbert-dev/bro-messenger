import mongoose, { Schema, Document, Types, HydratedDocument } from 'mongoose';

export interface IChat extends Document {
  title: string;
  admins: Types.Array<Types.ObjectId>;
  participants: Types.Array<Types.ObjectId>;
  isGroup: boolean;
}

const chatSchema = new Schema<IChat>(
  {
    title: { type: String, required: true },
    isGroup: { type: Boolean, default: true },
    admins: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User', // must match the model name
        index: true,
      },
    ],
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],
    //messages: [
    //  {
    //    type: Schema.Types.ObjectId,
    //    ref: "Message", // must match the model name
    //  }
    //],
  },
  // This is useful for optimistic concurrency control
  // and to ensure that the document is not modified by another operation
  {
    versionKey: '__v', //  custom version key
    optimisticConcurrency: true, //  enable optimistic locking
    timestamps: true, // auto adds createdAt & updatedAt
  },
);

chatSchema.pre('save', function (this: HydratedDocument<IChat>, next) {
  // Build a unique set of participant + admin IDs
  const set = new Set<string>(this.participants.map((id) => id.toString()));
  for (const a of this.admins) set.add(a.toString());

  // Reassign as ObjectIds; cast to keep TS happy (Mongoose will wrap it)
  this.participants = Array.from(set).map(
    (id) => new Types.ObjectId(id),
  ) as unknown as Types.Array<Types.ObjectId>;

  next();
});
export const Chat = mongoose.model<IChat>('Chat', chatSchema);
