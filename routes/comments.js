const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getComments,
  createComment,
  reportComment,
} = require('../controllers/commentController');

/**
 * @swagger
 * tags:
 *   name: Comments
 *   description: Article comment endpoints
 */

/**
 * @swagger
 * /api/articles/{id}/comments:
 *   get:
 *     summary: Get active comments for an article
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     responses:
 *       200:
 *         description: List of comments
 *   post:
 *     summary: Post a new comment on an article
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content:
 *                 type: string
 *                 example: Great article!
 *     responses:
 *       201:
 *         description: Comment created
 *       401:
 *         description: Not authenticated
 */
router.get('/articles/:id/comments', getComments);
router.post('/articles/:id/comments', protect, createComment);

/**
 * @swagger
 * /api/comments/{id}/report:
 *   post:
 *     summary: Report a comment
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment reported
 *       401:
 *         description: Not authenticated
 */
router.post('/comments/:id/report', protect, reportComment);

module.exports = router;
