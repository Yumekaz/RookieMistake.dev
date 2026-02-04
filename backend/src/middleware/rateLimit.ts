import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import config from '../config';
import { logger } from '../lib/logger';

// Skip rate limiting in test environment
const isTestEnv = process.env.NODE_ENV === 'test';

// Custom handler when rate limit is exceeded
const rateLimitHandler = (req: Request, res: Response): void => {
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
  });

  res.status(429).json({
    error: 'Too many requests',
    message: 'You have exceeded the rate limit. Please try again later.',
    retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
  });
};

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: {
    error: 'Too many requests',
    message: 'Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use default key generator (handles IPv6 properly)
  handler: rateLimitHandler,
  skip: (req: Request) => {
    return req.path === '/api/health' || isTestEnv;
  },
  validate: { xForwardedForHeader: false },
});

// Stricter rate limiter for analyze endpoint (more expensive operation)
export const analyzeLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxAnalyzeRequests,
  message: {
    error: 'Too many analysis requests',
    message: 'Code analysis is resource-intensive. Please wait before analyzing more code.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  validate: { xForwardedForHeader: false },
  handler: (req: Request, res: Response) => {
    logger.warn('Analyze rate limit exceeded', {
      ip: req.ip,
      codeLength: req.body?.code?.length || 0,
    });

    res.status(429).json({
      error: 'Too many analysis requests',
      message: 'Code analysis is resource-intensive. Please wait before analyzing more code.',
      retryAfter: Math.ceil(config.rateLimit.windowMs / 1000),
    });
  },
});

// Rate limiter for save endpoint
export const saveLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 20,
  message: {
    error: 'Too many save requests',
    message: 'Please wait before saving more snippets.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => isTestEnv,
  validate: { xForwardedForHeader: false },
});

export default {
  apiLimiter,
  analyzeLimiter,
  saveLimiter,
};
