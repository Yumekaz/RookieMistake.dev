import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const nodeEnvSchema = z.enum(['development', 'test', 'production']);
const logLevelSchema = z.enum(['error', 'warn', 'info', 'debug', 'silly']);

const envSchema = z
  .object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3001),
    NODE_ENV: nodeEnvSchema.default('development'),
    DB_PATH: z.string().min(1).default(path.resolve(__dirname, '../data/snippets.db')),
    CORS_ORIGIN: z.string().min(1).default('http://localhost:3000'),
    CORS_ORIGINS: z.string().optional(),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1000).default(900000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
    RATE_LIMIT_ANALYZE_MAX: z.coerce.number().int().positive().default(30),
    LOG_LEVEL: logLevelSchema.default('info'),
    LOG_DIR: z.string().min(1).default(path.resolve(__dirname, '../logs')),
    MAX_CODE_SIZE: z.coerce.number().int().min(1).max(1000000).default(100000),
    API_VERSION: z.string().min(1).default('v1'),
  });

export interface AppConfig {
  port: number;
  nodeEnv: z.infer<typeof nodeEnvSchema>;
  isProduction: boolean;
  isDevelopment: boolean;
  dbPath: string;
  corsOrigin: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    maxAnalyzeRequests: number;
  };
  logging: {
    level: z.infer<typeof logLevelSchema>;
    dir: string;
  };
  api: {
    maxCodeSize: number;
    version: string;
  };
}

function buildCorsOrigins(origin: string, origins?: string): string[] {
  const values = (origins || origin)
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return Array.from(new Set(values.length > 0 ? values : [origin]));
}

function parseEnv(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => {
        const field = issue.path.join('.') || 'env';
        return `${field}: ${issue.message}`;
      })
      .join('\n');

    throw new Error(`Configuration errors:\n${issues}`);
  }

  const corsOrigins = buildCorsOrigins(parsed.data.CORS_ORIGIN, parsed.data.CORS_ORIGINS);

  const config: AppConfig = {
    port: parsed.data.PORT,
    nodeEnv: parsed.data.NODE_ENV,
    isProduction: parsed.data.NODE_ENV === 'production',
    isDevelopment: parsed.data.NODE_ENV !== 'production',
    dbPath: parsed.data.DB_PATH,
    corsOrigin: corsOrigins[0],
    corsOrigins,
    rateLimit: {
      windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
      maxRequests: parsed.data.RATE_LIMIT_MAX,
      maxAnalyzeRequests: parsed.data.RATE_LIMIT_ANALYZE_MAX,
    },
    logging: {
      level: parsed.data.LOG_LEVEL,
      dir: parsed.data.LOG_DIR,
    },
    api: {
      maxCodeSize: parsed.data.MAX_CODE_SIZE,
      version: parsed.data.API_VERSION,
    },
  };

  validateDerivedConfig(config);
  return config;
}

function validateDerivedConfig(config: AppConfig): void {
  const errors: string[] = [];

  if (config.corsOrigins.length === 0) {
    errors.push('CORS_ORIGINS must resolve to at least one origin');
  }

  if (config.rateLimit.windowMs < 1000) {
    errors.push('RATE_LIMIT_WINDOW_MS must be at least 1000ms');
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}

export const config = parseEnv();

export function validateConfig(): void {
  validateDerivedConfig(config);
}

export default config;
