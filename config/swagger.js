const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital News Portal API',
      version: '1.0.0',
      description:
        'REST API documentation for the Digital News Portal — a full-stack MERN application with JWT authentication, role-based access control, premium content gating, OTP verification, subscriptions, and more.',
      contact: {
        name: 'Yash',
      },
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            name: { type: 'string', example: 'John Doe' },
            email: { type: 'string', example: 'john@example.com' },
            role: { type: 'string', enum: ['admin', 'employee', 'user'], example: 'user' },
            isSubscribed: { type: 'boolean', example: false },
            subscriptionPlan: { type: 'string', enum: ['none', 'premium', 'ads-free'], example: 'none' },
            isEmailVerified: { type: 'boolean', example: true },
            isBanned: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Article: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            title: { type: 'string', example: 'Breaking: New Tech Policy Announced' },
            content: { type: 'string', example: '<p>Full article content here...</p>' },
            category: { type: 'string', example: 'Technology' },
            imageUrl: { type: 'string', example: 'https://example.com/image.jpg' },
            isPremium: { type: 'boolean', example: false },
            status: { type: 'string', enum: ['draft', 'published'], example: 'published' },
            author: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            publishedAt: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        EPaper: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '665f1a2b3c4d5e6f7a8b9c0d' },
            title: { type: 'string', example: 'Daily Edition - March 28, 2026' },
            publishDate: { type: 'string', format: 'date' },
            pdfUrl: { type: 'string', example: 'https://example.com/paper.pdf' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        PaginatedArticles: {
          type: 'object',
          properties: {
            articles: {
              type: 'array',
              items: { $ref: '#/components/schemas/Article' },
            },
            currentPage: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 5 },
            totalArticles: { type: 'integer', example: 48 },
          },
        },
        PaginatedEPapers: {
          type: 'object',
          properties: {
            epapers: {
              type: 'array',
              items: { $ref: '#/components/schemas/EPaper' },
            },
            currentPage: { type: 'integer', example: 1 },
            totalPages: { type: 'integer', example: 3 },
            totalEPapers: { type: 'integer', example: 18 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Something went wrong' },
          },
        },
      },
    },
  },
  apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
