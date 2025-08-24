import { Message, IMessage } from '../models/messageModel';
import { ensureObjectId } from '../utils/objectIdValidator';

export async function getMessagesByChatId(
  chatIdRaw: string,
): Promise<IMessage[] | null> {
  const chatId = ensureObjectId(chatIdRaw);
  const messages = await Message.find({ chat: chatId })
    .populate('author', 'name')
    .sort({ createdAt: 1 });
  return messages;
}

export async function saveByChatAndAuthorId(
  chatIdRaw: string,
  authorIdRow: string,
  contentRow: string,
): Promise<IMessage | null> {
  const chatId = ensureObjectId(chatIdRaw);
  const authorId = ensureObjectId(authorIdRow);
  const content = contentRow.toString;

  return Message.create({
    content: content,
    chat: chatId,
    author: authorId,
  });
}
