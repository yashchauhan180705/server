const express = require('express');
const router = express.Router();
const { getEPapers } = require('../controllers/epaperController');

/**
 * @swagger
 * tags:
 *   name: E-Papers
 *   description: Public e-paper archive endpoints
 */

/**
 * @swagger
 * /api/epapers:
 *   get:
 *     summary: Get all e-paper editions (paginated)
 *     tags: [E-Papers]
 *     parameters:
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
 *         description: E-papers per page
 *     responses:
 *       200:
 *         description: Paginated list of e-paper editions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PaginatedEPapers'
 *       500:
 *         description: Server error
 */
router.get('/', getEPapers);

module.exports = router;
