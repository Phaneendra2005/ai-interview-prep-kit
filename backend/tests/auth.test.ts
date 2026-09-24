import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

jest.setTimeout(900000);
import { app } from '../src/app';
import { User } from '../src/models/User';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
}, 300000); // 5 mins timeout for download

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('Auth Endpoints', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'password123' });
    
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@example.com');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('should isolate users so they cannot login with wrong credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test1@example.com', password: 'password123' });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test1@example.com', password: 'wrongpassword' });
    
    expect(res.status).toBe(401);
  });
});
