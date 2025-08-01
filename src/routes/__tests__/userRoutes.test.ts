import request from 'supertest';
import app from '../../app'; // don't use .listen() in this app file

describe('User Routes - ordered integration test', () => {
  const newUser = { name: 'Igor', age: 30, email: 'igor@example.com' };
  let userId: string;

  test('should create, fetch, and reject duplicate user and delete', async () => {
    // 1. Create user
    const createRes = await request(app)
      .post('/api/users')
      .send(newUser)
      .expect(201); 

    expect(createRes.body.name).toBe(newUser.name);
    userId = createRes.body._id;

    // 2. Get users
    const getRes = await request(app).get('/api/users').expect(200);
    expect(getRes.body.length).toBeGreaterThan(0);
    expect(getRes.body[0].email).toBe(newUser.email);

    // 3. Try to create same user again (should fail due to unique email)
    const duplicateRes = await request(app)
      .post('/api/users')
      .send(newUser)
      .expect(409); // Use 409 if your service returns it for duplicates

    // Accept both your raw DB error or custom error message
    expect(
      duplicateRes.body.message.toLowerCase()
    ).toMatch(/email|duplicate/);
    expect(duplicateRes.body.message).toContain("Email already exists");

    const deleteRes = await request(app)
      .delete(`/api/users/${userId}`)
      .expect(204);

    expect(deleteRes.body).toEqual({}); // Expect empty body on successful delete
    expect(deleteRes.status).toBe(204);
  });

  test('should fail when sending invalid data', async () => {
    const badRes = await request(app)
      .post('/api/users')
      .send({ name: '', age: -1 })
      .expect(400);

    expect(badRes.body.message.toLowerCase()).toContain('validation');
  });
});
