import { Request, Response } from 'express';
import * as userController from '.././userController'; // Adjust path if needed
import userService from '../../services/userService';
import { HttpError } from '../../utils/httpError';

// Mocks
jest.mock('../../services/userService');

function mockResponse(): Response {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

describe('User Controller', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return users as JSON', async () => {
      const users = [{ name: 'Igor', age: 30, email: 'igor@example.com' }];

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
      const userData = { name: 'Igor', age: 30, email: 'igor@example.com' };
      const createdUser = { ...userData, id: '12345', __v: 0 };
      (userService.createUser as jest.Mock).mockResolvedValue(createdUser);
      const req = { body: userData} as unknown as Request;
      const res = mockResponse();

      await userController.createUser(req, res);

      expect(userService.createUser).toHaveBeenCalledWith(userData);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(createdUser);
    });

    it('should throw HttpError if creation fails', async () => {
      (userService.createUser as jest.Mock).mockResolvedValue(null);
      const req = { body: { name: 'Test'} } as unknown as Request;
      const res = mockResponse();

      await expect(userController.createUser(req, res))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('getUserById', () => {
    it('should return user if found', async () => {
      const user = { id: '1', name: 'Igor', age: 30, email: 'igor@example.com' };
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

      await expect(userController.getUserById(req, res))
        .rejects
        .toThrow(HttpError);
    });
  });

  describe('updateUserById', () => {
    it('should update and return user', async () => {
      const updatedUser = { id: '1', name: 'Updated' };
      (userService.updateUserById as jest.Mock).mockResolvedValue(updatedUser);

      const req = { params: { id: '1' }, body: { name: 'Updated' } } as unknown as Request;
      const res = mockResponse();

      await userController.updateUserById(req, res);

      expect(userService.updateUserById).toHaveBeenCalledWith('1', { name: 'Updated' });
      expect(res.json).toHaveBeenCalledWith(updatedUser);
    });

    it('should return 404 if user not found', async () => {
      (userService.updateUserById as jest.Mock).mockResolvedValue(null);
      const req = { params: { id: '999' }, body: { name: 'XSER' } } as unknown as Request;
      const res = mockResponse();

      await userController.updateUserById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
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
      expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
    });
  });
});