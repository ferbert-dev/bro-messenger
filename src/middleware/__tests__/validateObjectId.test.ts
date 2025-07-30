import { validateObjectId } from '../validateObjectId';
import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../../utils/httpError';

describe('validateObjectId middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { params: {} };
    res = {};
    next = jest.fn();
  });

  it('should call next() if ObjectId is valid', () => {
    req.params = { id: '60c72b2f9e1d4c2f88c5b8e9' };

    const middleware = validateObjectId('id');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(); // no error passed
  });

  it('should call next(err) if ObjectId is invalid', () => {
    req.params = { id: 'invalid-object-id' };

    const middleware = validateObjectId('id');
    middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    const error = (next as jest.Mock).mock.calls[0][0];
    expect(error.message).toContain('Invalid id');
    expect(error.statusCode).toBe(400);
  });
});
