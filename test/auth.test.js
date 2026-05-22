const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test env vars before importing app
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.OTP_EXPIRY_MINUTES = '5';

// Mock modules that cause issues in tests
jest.mock('../config/db', () => jest.fn());
jest.mock('../middleware/security', () => ({
  setupSecurity: jest.fn(),
}));
jest.mock('../middleware/rateLimiter', () => ({
  generalLimiter: (req, res, next) => next(),
  authLimiter: (req, res, next) => next(),
  otpLimiter: (req, res, next) => next(),
  uploadLimiter: (req, res, next) => next(),
}));

const app = require('../server');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

describe('Auth Endpoints', () => {
  /**
   * Test: Health check
   */
  it('GET /api/health — should return status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  /**
   * Test: Register a new user
   */
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      // First create an OTP record for the user
      const OTP = require('../models/OTP');
      await OTP.create({
        email: 'testuser@example.com',
        otp: '123456',
        purpose: 'register',
        isVerified: true,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Test User',
          email: 'testuser@example.com',
          password: 'Password@123',
          otp: '123456',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('email', 'testuser@example.com');
      expect(res.body).toHaveProperty('name', 'Test User');
    });

    it('should reject duplicate email', async () => {
      await User.create({
        name: 'Existing User',
        email: 'duplicate@example.com',
        password: 'Password@123',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'New User',
          email: 'duplicate@example.com',
          password: 'Password@123',
          otp: '123456',
        });

      expect(res.statusCode).toBe(400);
    });
  });

  /**
   * Test: Login
   */
  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      const user = new User({
        name: 'Login User',
        email: 'loginuser@example.com',
        password: 'Password@123',
        isEmailVerified: true,
      });
      await user.save();

      const OTP = require('../models/OTP');
      await OTP.create({
        email: 'loginuser@example.com',
        otp: '123456',
        purpose: 'login',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
    });

    it('should login with correct credentials and return tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'Password@123',
          otp: '123456'
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.email).toBe('loginuser@example.com');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'loginuser@example.com',
          password: 'Wrong@123',
          otp: '123456'
        });

      expect(res.statusCode).toBe(401);
    });

    it('should reject login for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password@123',
          otp: '123456'
        });

      // It will fail Validation if otp is missing, but here it has otp. 
      // It hits the controller and returns 401 User not found.
      expect(res.statusCode).toBe(401);
    });
  });

  /**
   * Test: Get current user profile
   */
  describe('GET /api/auth/me', () => {
    it('should return 401 without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
    });

    it('should return user profile with valid token', async () => {
      const user = new User({
        name: 'Profile User',
        email: 'profileuser@example.com',
        password: 'Password@123',
        isEmailVerified: true,
      });
      await user.save();

      const OTP = require('../models/OTP');
      await OTP.create({
        email: 'profileuser@example.com',
        otp: '123456',
        purpose: 'login',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'profileuser@example.com',
          password: 'Password@123',
          otp: '123456'
        });

      const token = loginRes.body.accessToken;

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBe('profileuser@example.com');
    });
  });
});
