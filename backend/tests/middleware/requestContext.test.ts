import { Request, Response, NextFunction } from 'express';
import { requestContext } from '../../src/middleware/requestContext';

describe('Request Context Middleware', () => {
  it('assigns a request id and response header', () => {
    const req = {
      header: jest.fn().mockReturnValue(undefined),
    } as Partial<Request> as Request;
    const res = {
      locals: {},
      setHeader: jest.fn(),
    } as Partial<Response> as Response;
    const next = jest.fn() as NextFunction;

    requestContext(req, res, next);

    expect(req.requestId).toMatch(/^req_[a-f0-9]+$/);
    expect(res.locals.requestId).toBe(req.requestId);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.requestId);
    expect(next).toHaveBeenCalled();
  });

  it('preserves inbound request ids', () => {
    const req = {
      header: jest.fn().mockReturnValue('client-request-id'),
    } as Partial<Request> as Request;
    const res = {
      locals: {},
      setHeader: jest.fn(),
    } as Partial<Response> as Response;
    const next = jest.fn() as NextFunction;

    requestContext(req, res, next);

    expect(req.requestId).toBe('client-request-id');
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', 'client-request-id');
  });
});
