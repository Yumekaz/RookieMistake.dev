import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // Database
  dbPath: process.env.DB_PATH || path.resolve(__dirname, '../data/snippets.db'),

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    maxAnalyzeRequests: parseInt(process.env.RATE_LIMIT_ANALYZE_MAX || '30', 10),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    dir: process.env.LOG_DIR || path.resolve(__dirname, '../logs'),
  },

  // API
  api: {
    maxCodeSize: parseInt(process.env.MAX_CODE_SIZE || '100000', 10), // 100KB
    version: process.env.API_VERSION || 'v1',
  },
} as const;

// Validate required config
export function validateConfig(): void {
  const errors: string[] = [];

  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (config.rateLimit.windowMs < 1000) {
    errors.push('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

export default config;
