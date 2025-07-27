import request from 'supertest';
import app from '../../app'

describe('GET /', () => {
  it('should return 200 and status page', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('I am alive');
  });
});