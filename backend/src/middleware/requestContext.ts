import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    startTime?: number;
    requestId?: string;
  }

  interface Locals {
    requestId?: string;
  }
}

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const inboundRequestId = req.header('x-request-id')?.trim();
  const requestId = inboundRequestId || `req_${randomUUID().replace(/-/g, '')}`;

  req.requestId = requestId;
  res.locals.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}

export default requestContext;
