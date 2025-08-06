const rateLimit = require('express-rate-limit');

// Basic rate limiter middleware
exports.rateLimiter = (maxRequests, windowMinutes) => {
  return rateLimit({
    windowMs: windowMinutes * 60 * 1000, // Time window in milliseconds
    max: maxRequests, // Max requests per window
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false, // Disable legacy headers
    handler: (req, res) => {
      res.status(429).json({
        success: false,
        message: `Too many requests, please try again after ${windowMinutes} minutes`
      });
    }
  });
};

// Specialized limiters for different routes
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100
});

exports.authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20
});