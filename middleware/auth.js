const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if user is banned
      if (req.user.isBanned) {
        return res.status(403).json({ message: 'Your account has been banned. Contact support.' });
      }

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Not authorized, token expired',
          code: 'TOKEN_EXPIRED',
        });
      }

      if (error.name === 'JsonWebTokenError' || error.name === 'NotBeforeError') {
        return res.status(401).json({
          message: 'Not authorized, token invalid',
          code: 'TOKEN_INVALID',
        });
      }

      return res.status(401).json({
        message: 'Not authorized, token failed',
        code: 'TOKEN_FAILED',
      });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

// Optional auth - attaches user if token exists, but doesn't block
const optionalAuth = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch (error) {
      // Token invalid, continue without user
    }
  }

  next();
};

// Admin or Employee middleware — allows both roles access
const adminOrEmployee = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'employee')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin or Employee only.' });
  }
};

// Admin only middleware for delete operations
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

module.exports = { protect, optionalAuth, adminOrEmployee, adminOnly };

