const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Setup security middleware
const setupSecurity = (app) => {
  // Set security HTTP headers - configure to allow CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
      // Don't override CORS headers
      crossOriginOpenerPolicy: false,
    })
  );

  // Sanitize data against NoSQL injection
  app.use(mongoSanitize());

  // Prevent XSS attacks - sanitize user input
  app.use((req, res, next) => {
    if (req.body) {
      for (let key in req.body) {
        if (typeof req.body[key] === 'string') {
          req.body[key] = req.body[key]
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        }
      }
    }
    next();
  });

  // Add custom security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

module.exports = { setupSecurity };
