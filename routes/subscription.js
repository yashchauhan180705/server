const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  subscribe,
  getMySubscription,
  cancelSubscription,
  getPlans,
} = require('../controllers/subscriptionController');

/**
 * @swagger
 * tags:
 *   name: Subscription
 *   description: Subscription plans integration
 */

/**
 * @swagger
 * /api/subscription/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Subscription]
 *     responses:
 *       200:
 *         description: List of subscription plans with pricing
 */
router.get('/plans', getPlans);

/**
 * @swagger
 * /api/subscription/subscribe:
 *   post:
 *     summary: Activate a subscription (Bypasses payment)
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [plan]
 *             properties:
 *               plan:
 *                 type: string
 *                 example: premium
 *     responses:
 *       200:
 *         description: Subscription activated
 *       400:
 *         description: Invalid plan or already subscribed
 *       401:
 *         description: Not authenticated
 */
router.post('/subscribe', protect, subscribe);

/**
 * @swagger
 * /api/subscription/my-subscription:
 *   get:
 *     summary: Get current user's subscription details
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription details
 *       401:
 *         description: Not authenticated
 */
router.get('/my-subscription', protect, getMySubscription);

/**
 * @swagger
 * /api/subscription/cancel:
 *   delete:
 *     summary: Cancel current subscription
 *     tags: [Subscription]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled
 *       401:
 *         description: Not authenticated
 */
router.delete('/cancel', protect, cancelSubscription);

module.exports = router;
