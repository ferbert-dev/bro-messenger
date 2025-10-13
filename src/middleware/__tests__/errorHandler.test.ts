import { Request, Response } from 'express';
import errorHandler from '../errorHandler';
import { HttpError } from '../../utils/httpError';

describe('errorHandler middleware', () => {
  const createReq = (overrides: Partial<Request> = {}) =>
    ({ method: 'GET', path: '/path', ...overrides } as Request);

  const createRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  it('uses status from HttpError', () => {
    const err = new HttpError(418, 'I am a teapot');
    const res = createRes();
    errorHandler(err, createReq(), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(418);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'I am a teapot',
    });
  });

  it('falls back to 500 for generic errors', () => {
    const err = new Error('boom');
    const res = createRes();
    errorHandler(err, createReq({ method: 'POST' }), res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'boom',
    });
  });
});
