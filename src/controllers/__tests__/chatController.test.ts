import { Response } from 'express';
import * as chatController from '../chatController';
import chatService from '../../services/chatService';
import { getMessagesByChatId } from '../../services/messageService';
import { AuthRequest } from '../../middleware/authMiddleware';
import { HttpError } from '../../utils/httpError';
import {
  CHAT_NOT_FOUND,
  FAILED_TO_CREATE_CHAT,
  YOU_ARE_NOT_ADMIN,
} from '../../common/constants';
import { saveBase64Image, deleteFileIfExists } from '../../utils/avatarStorage';
import fs from 'fs';

jest.mock('../../services/chatService');
jest.mock('../../services/messageService');
jest.mock('../../utils/avatarStorage');
jest.mock('fs');

const mockedChatService = chatService as jest.Mocked<typeof chatService>;
const mockedMessageService = getMessagesByChatId as jest.Mock;
const mockedSaveImage = saveBase64Image as jest.Mock;
const mockedDeleteFile = deleteFileIfExists as jest.Mock;
const mockedExistsSync = fs.existsSync as jest.Mock;

const createResponse = () => {
  const res = {} as Response;
  (res as any).status = jest.fn().mockReturnValue(res);
  (res as any).json = jest.fn().mockReturnValue(res);
  (res as any).send = jest.fn().mockReturnValue(res);
  (res as any).sendFile = jest.fn().mockReturnValue(res);
  return res;
};

const makeObjectId = (value: string) => ({
  equals: (input: string) => input === value,
});

describe('chatController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllChatsForUserById', () => {
    it('returns mapped chats', async () => {
      mockedChatService.getMyChats.mockResolvedValue([
        {
          _id: 'chat1',
          title: 'General',
          admins: [
            { _id: 'admin1', name: 'Admin', email: 'admin@example.com' },
          ],
          participants: [
            { _id: 'user1', name: 'User', email: 'user@example.com' },
          ],
        } as any,
      ]);

      const req = { user: { userId: 'user1' } } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.getAllChatsForUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith([
        {
          id: 'chat1',
          title: 'General',
          avatarUrl: undefined,
          admins: [
            {
              id: 'admin1',
              name: 'Admin',
              email: 'admin@example.com',
              avatarUrl: undefined,
            },
          ],
          members: [
            {
              id: 'user1',
              name: 'User',
              email: 'user@example.com',
              avatarUrl: undefined,
            },
          ],
        },
      ]);
    });
  });

  describe('getChatById', () => {
    it('returns chat dto', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        _id: 'chat1',
        title: 'General',
        admins: [],
        participants: [],
      } as any);
      const req = {
        params: { chatId: 'chat1' },
        user: { userId: 'u1' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.getChatById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'chat1', title: 'General' }),
      );
    });

    it('throws when chat missing', async () => {
      mockedChatService.getChatById.mockResolvedValue(null);
      const req = {
        params: { chatId: 'missing' },
        user: { userId: 'u1' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.getChatById(req, res)).rejects.toThrow(
        CHAT_NOT_FOUND,
      );
    });
  });

  describe('getChatMessagesById', () => {
    it('returns messages for chat', async () => {
      mockedChatService.getChatById.mockResolvedValue({ _id: 'chat1' } as any);
      mockedMessageService.mockResolvedValue(['message']);
      const req = {
        params: { chatId: 'chat1' },
        user: { userId: 'u1' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.getChatMessagesById(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(['message']);
    });

    it('throws 404 when chat missing', async () => {
      mockedChatService.getChatById.mockResolvedValue(null);
      const req = {
        params: { chatId: 'missing' },
        user: { userId: 'u1' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(
        chatController.getChatMessagesById(req, res),
      ).rejects.toThrow(CHAT_NOT_FOUND);
    });
  });

  describe('createChat', () => {
    it('creates chat without avatar image', async () => {
      mockedChatService.createChat.mockResolvedValue({
        _id: 'chat1',
        title: 'Room',
        admins: [],
        participants: [],
      } as any);
      const req = {
        user: { userId: 'admin1' },
        body: { title: 'Room', participantIds: ['p1'] },
      } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.createChat(req, res);

      expect(mockedChatService.createChat).toHaveBeenCalledWith({
        title: 'Room',
        participantIds: ['p1'],
        adminId: 'admin1',
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'chat1', title: 'Room' }),
      );
    });

    it('saves avatar image and cleans up on success', async () => {
      mockedSaveImage.mockResolvedValue({ relativePath: '/uploads/chat.png' });
      mockedChatService.createChat.mockResolvedValue({
        _id: 'chat1',
        title: 'Room',
        admins: [],
        participants: [],
      } as any);
      const req = {
        user: { userId: 'admin1' },
        body: { title: 'Room', avatarImage: 'data:image/png;base64,abc' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.createChat(req, res);

      expect(mockedSaveImage).toHaveBeenCalled();
      expect(mockedChatService.createChat).toHaveBeenCalledWith({
        title: 'Room',
        adminId: 'admin1',
        participantIds: [],
        avatarUrl: '/uploads/chat.png',
      });
      expect(mockedDeleteFile).not.toHaveBeenCalled();
    });

    it('removes saved avatar when creation fails', async () => {
      mockedSaveImage.mockResolvedValue({ relativePath: '/uploads/chat.png' });
      mockedChatService.createChat.mockResolvedValue(null as any);
      const req = {
        user: { userId: 'admin1' },
        body: { title: 'Room', avatarImage: 'data:image/png;base64,abc' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.createChat(req, res)).rejects.toThrow(
        new HttpError(400, FAILED_TO_CREATE_CHAT),
      );
      expect(mockedDeleteFile).toHaveBeenCalledWith('/uploads/chat.png');
    });

    it('throws when avatar saving fails', async () => {
      mockedSaveImage.mockRejectedValue(new Error('Invalid chat avatar image'));
      const req = {
        user: { userId: 'admin1' },
        body: { title: 'Room', avatarImage: 'bad' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.createChat(req, res)).rejects.toThrow(
        'Invalid chat avatar image',
      );
    });
  });

  describe('addMemberByIdToTheChat', () => {
    it('adds member when requester is admin', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        admins: [makeObjectId('admin1')],
      } as any);
      mockedChatService.addMember.mockResolvedValue({
        _id: 'chat1',
        title: 'Room',
        admins: [],
        participants: [],
      } as any);
      const req = {
        params: { chatId: 'chat1' },
        user: { userId: 'admin1' },
        body: { userId: 'new-user' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.addMemberByIdToTheChat(req, res);

      expect(mockedChatService.addMember).toHaveBeenCalledWith(
        'chat1',
        'new-user',
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('throws when chat missing', async () => {
      mockedChatService.getChatById.mockResolvedValue(null);
      const req = {
        params: { chatId: 'missing' },
        user: { userId: 'admin1' },
        body: { userId: 'new-user' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(
        chatController.addMemberByIdToTheChat(req, res),
      ).rejects.toThrow(CHAT_NOT_FOUND);
    });

    it('throws when requester not admin', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        admins: [makeObjectId('other')],
      } as any);
      const req = {
        params: { chatId: 'chat1' },
        user: { userId: 'non-admin' },
        body: { userId: 'new-user' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(
        chatController.addMemberByIdToTheChat(req, res),
      ).rejects.toThrow(YOU_ARE_NOT_ADMIN);
    });
  });

  describe('removeMemberByIdFromTheChat', () => {
    it('removes member when admin', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        admins: [makeObjectId('admin1')],
      } as any);
      mockedChatService.removeMember.mockResolvedValue({
        _id: 'chat1',
        title: 'Room',
        admins: [],
        participants: [],
      } as any);
      const req = {
        params: { chatId: 'chat1', userId: 'remove-me' },
        user: { userId: 'admin1' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.removeMemberByIdFromTheChat(req, res);

      expect(mockedChatService.removeMember).toHaveBeenCalledWith(
        'chat1',
        'remove-me',
      );
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('throws when chat missing', async () => {
      mockedChatService.getChatById.mockResolvedValue(null);
      const req = {
        params: { chatId: 'missing', userId: 'remove' },
        user: { userId: 'admin1' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(
        chatController.removeMemberByIdFromTheChat(req, res),
      ).rejects.toThrow(CHAT_NOT_FOUND);
    });

    it('throws when not admin', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        admins: [makeObjectId('other')],
      } as any);
      const req = {
        params: { chatId: 'chat1', userId: 'remove' },
        user: { userId: 'non-admin' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(
        chatController.removeMemberByIdFromTheChat(req, res),
      ).rejects.toThrow(YOU_ARE_NOT_ADMIN);
    });
  });

  describe('uploadChatAvatar', () => {
    it('updates avatar when admin', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        admins: [
          {
            toString: () => 'admin1',
          },
        ],
        avatarUrl: '/uploads/old.png',
      } as any);
      mockedSaveImage.mockResolvedValue({ relativePath: '/uploads/chat.png' });
      const req = {
        params: { chatId: 'chat1' },
        user: { userId: 'admin1' },
        body: { image: 'data:image/png;base64,abc' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.uploadChatAvatar(req, res);

      expect(mockedSaveImage).toHaveBeenCalled();
      expect(mockedChatService.updateChatAvatar).toHaveBeenCalledWith(
        'chat1',
        '/uploads/chat.png',
      );
      expect(mockedDeleteFile).toHaveBeenCalledWith('/uploads/old.png');
    });

    it('throws when image missing', async () => {
      const req = {
        params: { chatId: 'chat1' },
        user: { userId: 'admin1' },
        body: {},
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.uploadChatAvatar(req, res)).rejects.toThrow(
        'Image payload missing',
      );
    });

    it('throws when chat missing', async () => {
      mockedChatService.getChatById.mockResolvedValue(null);
      const req = {
        params: { chatId: 'missing' },
        user: { userId: 'admin1' },
        body: { image: 'data' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.uploadChatAvatar(req, res)).rejects.toThrow(
        CHAT_NOT_FOUND,
      );
    });

    it('throws when requester not admin', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        admins: [{ toString: () => 'other' }],
      } as any);
      const req = {
        params: { chatId: 'chat1' },
        user: { userId: 'non-admin' },
        body: { image: 'data' },
      } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.uploadChatAvatar(req, res)).rejects.toThrow(
        YOU_ARE_NOT_ADMIN,
      );
    });
  });

  describe('getChatAvatar', () => {
    it('sends avatar when file exists', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        avatarUrl: '/uploads/chat.png',
      } as any);
      mockedExistsSync.mockReturnValue(true);

      const req = { params: { chatId: 'chat1' } } as unknown as AuthRequest;
      const res = createResponse();

      await chatController.getChatAvatar(req, res);

      expect(res.sendFile).toHaveBeenCalled();
    });

    it('throws when chat missing', async () => {
      mockedChatService.getChatById.mockResolvedValue(null);
      const req = { params: { chatId: 'missing' } } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.getChatAvatar(req, res)).rejects.toThrow(
        'Avatar not found',
      );
    });

    it('throws when file missing', async () => {
      mockedChatService.getChatById.mockResolvedValue({
        avatarUrl: '/uploads/chat.png',
      } as any);
      mockedExistsSync.mockReturnValue(false);

      const req = { params: { chatId: 'chat1' } } as unknown as AuthRequest;
      const res = createResponse();

      await expect(chatController.getChatAvatar(req, res)).rejects.toThrow(
        'Avatar not found',
      );
    });
  });
});
