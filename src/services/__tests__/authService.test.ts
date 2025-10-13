import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authService from '../authService';

describe('authService', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
  });

  afterAll(() => {
    process.env.JWT_SECRET = originalSecret;
  });

  describe('createUserToken', () => {
    it('signs a token with id, email and role', async () => {
      const signSpy = jest
        .spyOn(jwt, 'sign')
        .mockReturnValue('signed-token' as any);

      const token = await authService.createUserToken({
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      });

      expect(token).toBe('signed-token');
      expect(signSpy).toHaveBeenCalledWith(
        { userId: 'user-1', email: 'user@example.com', role: 'user' },
        'test-secret',
        { expiresIn: '1d' },
      );

      signSpy.mockRestore();
    });
  });

  describe('comparePassword', () => {
    it('delegates to bcrypt.compare', async () => {
      const compareSpy = jest
        .spyOn(bcrypt as any, 'compare')
        .mockResolvedValue(true);

      const result = await authService.comparePassword('hash', 'plain');

      expect(result).toBe(true);
      expect(compareSpy).toHaveBeenCalledWith('hash', 'plain');

      compareSpy.mockRestore();
    });
  });

  describe('hashPassword', () => {
    it('hashes with salt rounds', async () => {
      const hashSpy = jest
        .spyOn(bcrypt as any, 'hash')
        .mockResolvedValue('hashed');

      const result = await authService.hashPassword('plain');

      expect(result).toBe('hashed');
      expect(hashSpy).toHaveBeenCalledWith('plain', 10);

      hashSpy.mockRestore();
    });
  });

  describe('verifyToken', () => {
    it('returns decoded payload when valid', () => {
      const payload = { userId: 'user-1' };
      const verifySpy = jest
        .spyOn(jwt, 'verify')
        .mockReturnValue(payload as any);

      const result = authService.verifyToken<typeof payload>('valid-token');

      expect(result).toEqual(payload);
      expect(verifySpy).toHaveBeenCalledWith('valid-token', 'test-secret');

      verifySpy.mockRestore();
    });

    it('throws when token verification fails', () => {
      jest.spyOn(jwt, 'verify').mockImplementation(() => {
        throw new Error('boom');
      });

      expect(() => authService.verifyToken('bad-token')).toThrow(
        'Token verification failed',
      );

      (jwt.verify as jest.Mock).mockRestore();
    });

    it('throws when payload is a string', () => {
      jest.spyOn(jwt, 'verify').mockReturnValue('not-object' as any);

      expect(() => authService.verifyToken('bad-token')).toThrow(
        'Token verification failed',
      );

      (jwt.verify as jest.Mock).mockRestore();
    });
  });
});
