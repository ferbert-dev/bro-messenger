import { z } from 'zod';
import { validateSchema } from '../validateSchema';
import { HttpError } from '../../utils/httpError';

describe('validateSchema middleware', () => {
  const schema = z.object({ name: z.string().min(2) });

  const createRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('passes through when data is valid', () => {
    const req: any = { body: { name: 'Igor' } };
    const res = createRes();
    const next = jest.fn();

    validateSchema(schema)(req, res as any, next);

    expect(req.body).toEqual({ name: 'Igor' });
    expect(next).toHaveBeenCalledWith();
  });

  it('passes HttpError to next when invalid', () => {
    const req: any = { body: { name: 'I' } };
    const res = createRes();
    const next = jest.fn();

    validateSchema(schema)(req, res as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(HttpError));
    const error = (next as jest.Mock).mock.calls[0][0] as HttpError;
    expect(error.message).toContain('Validation failed');
    expect(error.statusCode).toBe(400);
  });
});
