import request from 'supertest';
import app from '../../app'; // don't use .listen() in this app file
import { IUser, User } from '../../models/userModel'; // Mongoose model
import { authHeader } from './utils/auth';
import {
  USER_CREATED_MESSAGE,
  EMAIL_ALREADY_EXISTS,
} from '../../common/constants';
describe('User Routes - ordered integration test', () => {
  let token: string;
  const newUserData = {
    name: 'Igor',
    password: '12345678',
    email: 'igor@example.com',
  };

  beforeAll(async () => {
    await request(app).post('/api/auth/register').send(newUserData).expect(201);
    const res = await request(app)
      .post('/api/auth/login')
      .send(newUserData)
      .expect(200);
    token = res.body.token;
  });

  test('should get profile and set all posible properties like age and name', async () => {
    // 3. get user profile
    const getProfileRes = await request(app)
      .get('/api/users/me')
      .set(authHeader(token))
      .expect(200);

    const id = getProfileRes.body.id;
    console.log(id);
    const storedBeforeChange = await User.findById(id);

    // 4. get user profile
    const setAllPropertiesUserData = {
      id: '1231435',
      age: 123,
      role: 'admin',
      name: 'Igor Super',
      password: '87654321',
      email: 'anton@example.com',
      v: '100',
    };

    const getSetProfileRes = await request(app)
      .put('/api/users/me')
      .set(authHeader(token))
      .send(setAllPropertiesUserData)
      .expect(200);

    const storedAfterChange = await User.findById(id);

    console.log(getProfileRes);
    console.log(storedBeforeChange!);
    console.log(storedAfterChange!.id);

    expect(storedAfterChange?.id).toBe(storedBeforeChange?.id);
    expect(storedAfterChange?.password).toBe(storedBeforeChange?.password);
    expect(storedAfterChange?.email).toBe(storedBeforeChange?.email);
    expect(storedAfterChange?.role).toBe(storedBeforeChange?.role);
    expect(storedAfterChange?.__v).toBe(storedBeforeChange!!.__v + 1);

    //changes in the dto
    expect(getSetProfileRes.body._id).toBe(getProfileRes.body._id);
    expect(getSetProfileRes.body.role).toBe(getProfileRes.body.role);
    expect(getSetProfileRes.body.email).toBe(getProfileRes.body.email);
    expect(getSetProfileRes.body.name).toBe(setAllPropertiesUserData.name);

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(newUserData)
      .expect(409);

    expect(registerRes?.body.message).toContain(EMAIL_ALREADY_EXISTS);
  });
});
