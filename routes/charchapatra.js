const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadImage } = require('../middleware/multerConfig');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
  getApprovedCharchaPatra,
  submitCharchaPatra,
} = require('../controllers/charchapatraController');

// GET /api/charchapatra — Public, get approved submissions
router.get('/', getApprovedCharchaPatra);

// POST /api/charchapatra — Authenticated, submit new charcha patra
router.post('/', protect, uploadLimiter, uploadImage.single('image'), submitCharchaPatra);

module.exports = router;
