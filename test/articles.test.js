const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

// Set test env vars
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';

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
const Article = require('../models/Article');

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

describe('Article Endpoints', () => {
  /**
   * Test: Get all published articles (public)
   */
  describe('GET /api/articles', () => {
    beforeEach(async () => {
      await Article.create([
        {
          title: 'Published Article 1',
          content: '<p>Content 1</p>',
          category: 'Technology',
          status: 'published',
          publishedAt: new Date(),
        },
        {
          title: 'Published Article 2',
          content: '<p>Content 2</p>',
          category: 'Sports',
          status: 'published',
          publishedAt: new Date(),
        },
        {
          title: 'Draft Article',
          content: '<p>Draft content</p>',
          category: 'National',
          status: 'draft',
        },
      ]);
    });

    it('should return only published articles with pagination', async () => {
      const res = await request(app).get('/api/articles');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('articles');
      expect(res.body).toHaveProperty('totalPages');
      expect(res.body).toHaveProperty('currentPage', 1);
      expect(res.body.articles.length).toBe(2);
      expect(res.body.totalArticles).toBe(2);
    });

    it('should filter articles by category', async () => {
      const res = await request(app).get('/api/articles?category=Technology');
      expect(res.statusCode).toBe(200);
      expect(res.body.articles.length).toBe(1);
      expect(res.body.articles[0].category).toBe('Technology');
    });

    it('should search articles by title', async () => {
      const res = await request(app).get('/api/articles?search=Article 1');
      expect(res.statusCode).toBe(200);
      expect(res.body.articles.length).toBe(1);
      expect(res.body.articles[0].title).toContain('Article 1');
    });

    it('should not include content field in list response', async () => {
      const res = await request(app).get('/api/articles');
      expect(res.statusCode).toBe(200);
      expect(res.body.articles[0]).not.toHaveProperty('content');
    });

    it('should respect pagination limit', async () => {
      const res = await request(app).get('/api/articles?limit=1&page=1');
      expect(res.statusCode).toBe(200);
      expect(res.body.articles.length).toBe(1);
      expect(res.body.totalPages).toBe(2);
    });
  });

  /**
   * Test: Get single article
   */
  describe('GET /api/articles/:id', () => {
    it('should return full article by ID', async () => {
      const article = await Article.create({
        title: 'Single Article',
        content: '<p>Full content here</p>',
        category: 'World',
        status: 'published',
        publishedAt: new Date(),
      });

      const res = await request(app).get(`/api/articles/${article._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.title).toBe('Single Article');
      expect(res.body.content).toBe('<p>Full content here</p>');
    });

    it('should return 404 for non-existent article ID', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app).get(`/api/articles/${fakeId}`);
      expect(res.statusCode).toBe(404);
    });

    it('should truncate premium article content for non-subscribers', async () => {
      const longContent = 'A'.repeat(1000);
      const article = await Article.create({
        title: 'Premium Article',
        content: longContent,
        category: 'Business',
        isPremium: true,
        status: 'published',
        publishedAt: new Date(),
      });

      const res = await request(app).get(`/api/articles/${article._id}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.isContentTruncated).toBe(true);
      expect(res.body.content.length).toBe(503);
    });
  });
});
