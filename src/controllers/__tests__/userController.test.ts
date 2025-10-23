import { Request, Response } from 'express';
import * as userController from '.././userController'; // Adjust path if needed
import userService from '../../services/userService';
import { HttpError } from '../../utils/httpError';
import { USER_NOT_FOUND } from '../../common/constants';
import { AuthRequest } from '../../middleware/authMiddleware';
import * as avatarStorage from '../../utils/avatarStorage';
import fs from 'fs';

jest.mock('../../services/userService');
jest.mock('../../utils/avatarStorage', () => ({
  deleteFileIfExists: jest.fn(),
  saveBase64Image: jest
    .fn()
    .mockResolvedValue({ relativePath: '/uploads/new-avatar.png' }),
}));
jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  (res as any).sendFile = jest.fn().mockReturnValue(res);
  return res;
}

describe('User Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // 🔇 Suppress error output
  });

  describe('getUsers', () => {
    it('should return users as JSON', async () => {
      const users = [
        {
          name: 'Igor',
          email: 'igor@example.com',
          role: 'user',
          id: '321435146fdsf',
        },
      ];

      (userService.getAllUsers as jest.Mock).mockResolvedValue(users);
      const req = {} as Request; // No params needed for this method
      const res = mockResponse();

      await userController.getUsers(req, res);

      expect(userService.getAllUsers).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(users);
    });
  });

  describe('createUser', () => {
    it('should create a user and return 201', async () => {
      const userData = {
        name: 'Igor',
        email: 'igor@example.com',
        role: 'user',
        id: '321435146fdsf',
      };
      const createdUser = { ...userData, id: '12345' };
      (userService.createUser as jest.Mock).mockResolvedValue(createdUser);
      const req = { body: userData } as unknown as Request;
      const res = mockResponse();

      await userController.createUser(req, res);

      expect(userService.createUser).toHaveBeenCalledWith(userData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdUser);
    });

    it('should throw HttpError if creation fails', async () => {
      (userService.createUser as jest.Mock).mockResolvedValue(null);
      const req = { body: { name: 'Test' } } as unknown as Request;
      const res = mockResponse();

      await expect(userController.createUser(req, res)).rejects.toThrow(
        HttpError,
      );
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const user = {
        name: 'Igor',
        email: 'igor@example.com',
        role: 'user',
        id: '321435146fdsf',
      };
      (userService.getUserById as jest.Mock).mockResolvedValue(user);

      const req = { params: { id: '1' } } as unknown as Request;
      const res = mockResponse();

      await userController.getUserById(req, res);

      expect(userService.getUserById).toHaveBeenCalledWith('1');
      expect(res.json).toHaveBeenCalledWith(user);
    });

    it('should throw HttpError if not found', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);
      const req = { params: { id: '2' } } as unknown as Request;
      const res = mockResponse();

      await expect(userController.getUserById(req, res)).rejects.toThrow(
        HttpError,
      );
    });
  });

  describe('updateUserById', () => {
    it('should update and return user', async () => {
      const updatedUser = { id: '1', name: 'Updated' };
      (userService.updateUserById as jest.Mock).mockResolvedValue(updatedUser);

      const req = {
        user: { userId: '1' },
        body: { name: 'Updated' },
      } as unknown as Request;
      const res = mockResponse();

      await userController.updateUserById(req as AuthRequest, res);

      expect(userService.updateUserById).toHaveBeenCalledWith('1', {
        name: 'Updated',
      });
      expect(res.json).toHaveBeenCalledWith(updatedUser);
    });

    it('should return 404 if user not found', async () => {
      (userService.updateUserById as jest.Mock).mockResolvedValue(null);
      const req = {
        params: { id: '999' },
        body: { name: 'XSER' },
      } as unknown as Request;
      const res = mockResponse();

      await userController.updateUserById(req as AuthRequest, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: USER_NOT_FOUND });
    });
  });

  describe('deleteUserById', () => {
    it('should delete user and return 204', async () => {
      (userService.deleteUserById as jest.Mock).mockResolvedValue({ id: '1' });
      const req = { params: { id: '1' } } as unknown as Request;
      const res = mockResponse();

      await userController.deleteUserById(req, res);

      expect(userService.deleteUserById).toHaveBeenCalledWith('1');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('should return 404 if user not found', async () => {
      (userService.deleteUserById as jest.Mock).mockResolvedValue(null);
      const req = { params: { id: '1' } } as unknown as Request;
      const res = mockResponse();

      await userController.deleteUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: USER_NOT_FOUND });
    });
  });

  describe('uploadMyAvatar', () => {
    it('saves new avatar and removes previous', async () => {
      const saveMock = jest.fn().mockResolvedValue(undefined);
      (userService.getUserById as jest.Mock).mockResolvedValue({
        avatarUrl: '/uploads/old.png',
        save: saveMock,
      });

      const req = {
        user: { userId: 'u-1' },
        body: { image: 'data:image/png;base64,abc' },
      } as AuthRequest;
      const res = mockResponse();

      await userController.uploadMyAvatar(req, res);

      expect(avatarStorage.saveBase64Image).toHaveBeenCalled();
      expect(saveMock).toHaveBeenCalled();
      expect(avatarStorage.deleteFileIfExists).toHaveBeenCalledWith(
        '/uploads/old.png',
      );
      expect(res.json).toHaveBeenCalledWith({
        avatarUrl: '/uploads/new-avatar.png',
      });
    });

    it('throws when image missing', async () => {
      const req = {
        user: { userId: 'u-1' },
        body: {},
      } as AuthRequest;
      const res = mockResponse();

      await expect(userController.uploadMyAvatar(req, res)).rejects.toThrow(
        HttpError,
      );
    });

    it('throws when user not found', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);
      const req = {
        user: { userId: 'missing' },
        body: { image: 'data' },
      } as AuthRequest;
      const res = mockResponse();

      await expect(userController.uploadMyAvatar(req, res)).rejects.toThrow(
        USER_NOT_FOUND,
      );
    });
  });

  describe('getMyAvatar', () => {
    const existsSync = fs.existsSync as jest.Mock;

    it('sends file when avatar exists on disk', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue({
        avatarUrl: '/uploads/avatar.png',
      });
      existsSync.mockReturnValue(true);

      const req = { user: { userId: 'u-1' } } as AuthRequest;
      const res = mockResponse();

      await userController.getMyAvatar(req, res);

      expect(res.sendFile).toHaveBeenCalled();
    });

    it('throws when avatar missing', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue({
        avatarUrl: null,
      });
      const req = { user: { userId: 'u-1' } } as AuthRequest;
      const res = mockResponse();

      await expect(userController.getMyAvatar(req, res)).rejects.toThrow(
        'Avatar not found',
      );
    });

    it('throws when file not found on disk', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue({
        avatarUrl: '/uploads/avatar.png',
      });
      existsSync.mockReturnValue(false);
      const req = { user: { userId: 'u-1' } } as AuthRequest;
      const res = mockResponse();

      await expect(userController.getMyAvatar(req, res)).rejects.toThrow(
        'Avatar not found',
      );
    });

    it('throws when user not found', async () => {
      (userService.getUserById as jest.Mock).mockResolvedValue(null);
      const req = { user: { userId: 'missing' } } as AuthRequest;
      const res = mockResponse();

      await expect(userController.getMyAvatar(req, res)).rejects.toThrow(
        USER_NOT_FOUND,
      );
    });
  });
});
