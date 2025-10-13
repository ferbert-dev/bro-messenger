import { authenticateToken, authenticateAdminToken } from '../authMiddleware';
import jwt from 'jsonwebtoken';

const createRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('authenticateToken', () => {
  const verifySpy = jest.spyOn(jwt, 'verify');

  beforeEach(() => {
    verifySpy.mockReset();
  });

  it('returns 401 when header missing', () => {
    const req: any = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when verification fails', () => {
    const req: any = {
      headers: { authorization: 'Bearer token' },
    };
    const res = createRes();
    const next = jest.fn();

    verifySpy.mockImplementation((_token, _secret, cb: any) =>
      cb(new Error('bad')),
    );

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
  });

  it('returns 403 when ids mismatch', () => {
    const req: any = {
      headers: { authorization: 'Bearer token' },
      params: { id: 'target-user' },
      user: { userId: 'different' },
    };
    const res = createRes();
    const next = jest.fn();

    verifySpy.mockImplementation((_token, _secret, cb: any) =>
      cb(null, { userId: 'different' }),
    );

    authenticateToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden: Not your account',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next with decoded user when successful', () => {
    const req: any = {
      headers: { authorization: 'Bearer token' },
      params: { id: 'user-1' },
      user: { userId: 'user-1' },
    };
    const res = createRes();
    const next = jest.fn();

    verifySpy.mockImplementation((_token, _secret, cb: any) =>
      cb(null, { userId: 'user-1' }),
    );

    authenticateToken(req, res, next);

    expect(req.user).toEqual({ userId: 'user-1' });
    expect(next).toHaveBeenCalled();
  });
});

describe('authenticateAdminToken', () => {
  const verifySpy = jest.spyOn(jwt, 'verify');

  beforeEach(() => {
    verifySpy.mockReset();
  });

  it('returns 401 when token missing', () => {
    const req: any = { headers: {} };
    const res = createRes();
    const next = jest.fn();

    authenticateAdminToken(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
  });

  it('returns 403 when verification fails', () => {
    const req: any = { headers: { authorization: 'Bearer token' } };
    const res = createRes();
    const next = jest.fn();

    verifySpy.mockImplementation((_token, _secret, cb: any) =>
      cb(new Error('bad')),
    );

    authenticateAdminToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
  });

  it('returns 403 when user not admin', () => {
    const req: any = {
      headers: { authorization: 'Bearer token' },
      user: { role: 'user' },
    };
    const res = createRes();
    const next = jest.fn();

    verifySpy.mockImplementation((_token, _secret, cb: any) =>
      cb(null, { role: 'user' }),
    );

    authenticateAdminToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Forbidden: You do not have permisions',
    });
  });

  it('allows admin through', () => {
    const req: any = {
      headers: { authorization: 'Bearer token' },
      user: { role: 'admin' },
    };
    const res = createRes();
    const next = jest.fn();

    verifySpy.mockImplementation((_token, _secret, cb: any) =>
      cb(null, { role: 'admin' }),
    );

    authenticateAdminToken(req, res, next);

    expect(req.user).toEqual({ role: 'admin' });
    expect(next).toHaveBeenCalled();
  });
});
