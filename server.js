const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load env variables FIRST (before anything reads process.env)
dotenv.config();

const connectDB = require('./config/db');
const { setupSecurity } = require('./middleware/security');
const { generalLimiter } = require('./middleware/rateLimiter');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Use custom DNS servers if configured (fixes Atlas SRV lookup on some networks)
const dns = require('dns');
const customDnsServers = (process.env.DNS_SERVERS || '')
  .split(',')
  .map((server) => server.trim())
  .filter(Boolean);

if (customDnsServers.length > 0) {
  dns.setServers(customDnsServers);
  console.log(`Using custom DNS servers: ${customDnsServers.join(', ')}`);
}

const app = express();

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

const allowedOrigins = (process.env.CLIENT_URLS || process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

console.log('Environment CLIENT_URL:', process.env.CLIENT_URL);
console.log('Environment CLIENT_URLS:', process.env.CLIENT_URLS);
console.log('Allowed CORS origins:', allowedOrigins);

const corsOptions = {
  origin(origin, callback) {
    console.log('CORS request from origin:', origin);
    // Allow non-browser clients and same-origin requests.
    if (!origin) return callback(null, true);
    
    // If no origins configured, allow all (for initial setup)
    if (allowedOrigins.length === 0) {
      console.log('No CLIENT_URL configured - allowing all origins');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS blocked for origin:', origin);
    console.log('Allowed origins are:', allowedOrigins);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600,
};

// IMPORTANT: Apply CORS BEFORE security middleware
app.use(cors(corsOptions));

// Manual CORS headers as fallback
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Setup security middleware
setupSecurity(app);

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
if (process.env.SERVE_LOCAL_UPLOADS !== 'false') {
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
}

// API Documentation (Swagger UI)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'News Portal API Documentation',
}));

// Apply general rate limiting
app.use('/api', generalLimiter);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));
app.use('/api/epapers', require('./routes/epapers'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/subscription', require('./routes/subscription'));
app.use('/api', require('./routes/comments'));
app.use('/api/charchapatra', require('./routes/charchapatra'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'News Portal API is running' });
});

// Handle multer errors
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File too large. Maximum size allowed is 10MB for PDFs and 5MB for images.' });
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({ message: err.message });
  }
  if (err.message && err.message.includes('Cloudinary is not configured')) {
    return res.status(500).json({ message: err.message });
  }
  if (err.message && /cloudinary|cloud_name|api key|signature/i.test(err.message)) {
    return res.status(500).json({
      message: `Cloudinary upload failed: ${err.message}`,
    });
  }
  next(err);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

// Only start listening when run directly (not during tests)
if (require.main === module) {
  const startServer = async () => {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  };

  startServer();
}

module.exports = app;
