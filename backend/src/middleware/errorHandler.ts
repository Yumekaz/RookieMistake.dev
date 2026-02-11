import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { recordRequestMetric, recordErrorMetric } from '../lib/metrics';
import config from '../config';

// Custom error class with status code
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad request') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends ApiError {
  details: unknown;

  constructor(message: string = 'Validation failed', details?: unknown) {
    super(message, 400);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export class RateLimitError extends ApiError {
  retryAfter: number;

  constructor(message: string = 'Too many requests', retryAfter: number = 60) {
    super(message, 429);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class InternalError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500, false);
    this.name = 'InternalError';
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
  stack?: string;
  requestId?: string;
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 404 handler for unknown routes
export function notFoundHandler(req: Request, res: Response, next: NextFunction): void {
  const error = new NotFoundError(`Route ${req.method} ${req.path} not found`);
  next(error);
}

// Main error handler middleware
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = generateRequestId();

  // Determine status code
  const statusCode = err instanceof ApiError ? err.statusCode : 500;

  // Record metrics
  const duration = Date.now() - (req.startTime || Date.now());
  recordRequestMetric(statusCode, duration, req.path);
  
  if (statusCode >= 400) {
    recordErrorMetric(statusCode >= 500 ? 'server_error' : 'client_error', req.path);
  }

  // Log the error
  const logData = {
    requestId,
    method: req.method,
    path: req.path,
    statusCode,
    error: err.message,
    stack: err.stack,
    ip: req.ip,
  };

  if (statusCode >= 500) {
    logger.error('Server error', logData);
  } else if (statusCode >= 400) {
    logger.warn('Client error', logData);
  }

  // Build error response
  const response: ErrorResponse = {
    error: err.name || 'Error',
    message: err.message || 'An unexpected error occurred',
    statusCode,
    requestId,
  };

  // Add details for validation errors
  if (err instanceof ValidationError && err.details) {
    response.details = err.details;
  }

  // Add stack trace in development
  if (config.isDevelopment && err.stack) {
    response.stack = err.stack;
  }

  // Set retry-after header for rate limit errors
  if (err instanceof RateLimitError) {
    res.setHeader('Retry-After', err.retryAfter);
  }

  // Send response
  res.status(statusCode).json(response);
}

// Async handler wrapper to catch async errors
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Extend Express Request type to include startTime
declare global {
  namespace Express {
    interface Request {
      startTime?: number;
    }
  }
}

// Request timing middleware
export function requestTimer(req: Request, res: Response, next: NextFunction): void {
  req.startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - req.startTime!;
    
    // Record metrics for successful requests (errors are recorded in errorHandler)
    if (res.statusCode < 400) {
      recordRequestMetric(res.statusCode, duration, req.path);
    }
    
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}

export default {
  ApiError,
  BadRequestError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  InternalError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
  requestTimer,
};
