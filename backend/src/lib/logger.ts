import winston from 'winston';
import path from 'path';
import fs from 'fs';
import config from '../config';

// Ensure logs directory exists
const logsDir = config.logging.dir;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  defaultMeta: { service: 'rookie-mistakes-api' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),

    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (config.isDevelopment) {
  logger.add(
    new winston.transports.Console({
      format: consoleFormat,
    })
  );
}

// Request logging helper
export function logRequest(req: {
  method: string;
  path: string;
  ip?: string;
  body?: unknown;
}): void {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    bodySize: req.body ? JSON.stringify(req.body).length : 0,
  });
}

// Response logging helper
export function logResponse(
  method: string,
  path: string,
  statusCode: number,
  duration: number
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  logger.log(level, 'Request completed', {
    method,
    path,
    statusCode,
    duration: `${duration}ms`,
  });
}

// Error logging helper
export function logError(error: Error, context?: Record<string, unknown>): void {
  logger.error('Error occurred', {
    error: error.message,
    stack: error.stack,
    ...context,
  });
}

// Analysis logging helper
export function logAnalysis(
  language: string,
  codeLength: number,
  mistakeCount: number,
  duration: number
): void {
  logger.info('Code analysis completed', {
    language,
    codeLength,
    mistakeCount,
    duration: `${duration}ms`,
  });
}

export default logger;
