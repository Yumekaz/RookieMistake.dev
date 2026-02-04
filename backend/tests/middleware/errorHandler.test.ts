import { Request, Response, NextFunction } from 'express';
import {
  ApiError,
  BadRequestError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  InternalError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from '../../src/middleware/errorHandler';

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  },
  logError: jest.fn(),
}));

describe('Error Handler Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      method: 'GET',
      path: '/test',
      ip: '127.0.0.1',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      setHeader: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('Custom Error Classes', () => {
    it('creates ApiError with correct properties', () => {
      const error = new ApiError('Test error', 400);
      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });

    it('creates BadRequestError with 400 status', () => {
      const error = new BadRequestError('Bad request');
      expect(error.statusCode).toBe(400);
    });

    it('creates NotFoundError with 404 status', () => {
      const error = new NotFoundError('Not found');
      expect(error.statusCode).toBe(404);
    });

    it('creates ValidationError with details', () => {
      const details = [{ field: 'code', message: 'Required' }];
      const error = new ValidationError('Validation failed', details);
      expect(error.statusCode).toBe(400);
      expect(error.details).toEqual(details);
    });

    it('creates RateLimitError with retryAfter', () => {
      const error = new RateLimitError('Too many requests', 120);
      expect(error.statusCode).toBe(429);
      expect(error.retryAfter).toBe(120);
    });

    it('creates InternalError with isOperational false', () => {
      const error = new InternalError('Internal error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });
  });

  describe('errorHandler', () => {
    it('handles ApiError correctly', () => {
      const error = new BadRequestError('Invalid input');
      
      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'BadRequestError',
          message: 'Invalid input',
          statusCode: 400,
        })
      );
    });

    it('handles generic Error as 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
        })
      );
    });

    it('sets Retry-After header for RateLimitError', () => {
      const error = new RateLimitError('Too many requests', 60);

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Retry-After', 60);
    });

    it('includes requestId in response', () => {
      const error = new BadRequestError('Test');

      errorHandler(error, mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: expect.stringMatching(/^req_\d+_[a-z0-9]+$/),
        })
      );
    });
  });

  describe('notFoundHandler', () => {
    it('creates NotFoundError for unknown route', () => {
      const req = {
        method: 'POST',
        path: '/unknown',
        ip: '127.0.0.1',
      } as Request;

      notFoundHandler(req, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 404,
          message: 'Route POST /unknown not found',
        })
      );
    });
  });

  describe('asyncHandler', () => {
    it('passes successful result through', async () => {
      const handler = asyncHandler(async (_req, res) => {
        res.json({ success: true });
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('catches async errors and passes to next', async () => {
      const testError = new Error('Async error');
      const handler = asyncHandler(async () => {
        throw testError;
      });

      await handler(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(testError);
    });
  });
});
