const express = require('express');
const router = express.Router();
const { getArticles, getArticleById } = require('../controllers/articleController');
const { optionalAuth } = require('../middleware/auth');

/**
 * @swagger
 * tags:
 *   name: Articles
 *   description: Public article endpoints
 */

/**
 * @swagger
 * /api/articles:
 *   get:
 *     summary: Get all published articles (paginated)
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category (e.g. National, Technology, Sports)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search articles by title
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Articles per page
 *     responses:
 *       200:
 *         description: Paginated list of articles
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedArticles'
 *       500:
 *         description: Server error
 */
router.get('/', getArticles);

/**
 * @swagger
 * /api/articles/{id}:
 *   get:
 *     summary: Get a single article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article details (premium content may be truncated for non-subscribers)
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Article'
 *                 - type: object
 *                   properties:
 *                     isContentTruncated:
 *                       type: boolean
 *       404:
 *         description: Article not found
 */
router.get('/:id', optionalAuth, getArticleById);

module.exports = router;
