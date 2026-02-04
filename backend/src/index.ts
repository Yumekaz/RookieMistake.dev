import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

// Config must be imported first
import config, { validateConfig } from './config';

// Validate configuration on module load
validateConfig();

// Middleware
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler, requestTimer } from './middleware/errorHandler';

// Routes
import v1Router from './routes/v1';
import analyzeRouter from './routes/analyze';
import snippetsRouter from './routes/snippets';

// Utilities
import { initParser } from './parser';
import { initDatabase } from './db';
import { logger } from './lib/logger';
import swaggerSpec from './swagger';

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Request timing (must be first)
app.use(requestTimer);

// CORS configuration
app.use(
  cors({
    origin: config.corsOrigins,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Global rate limiting
app.use('/api', apiLimiter);

// API Documentation (Swagger UI)
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'RookieMistakes.dev API Docs',
}));

// Swagger JSON endpoint
app.get('/api/docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.nodeEnv,
  });
});

// API v1 routes (versioned)
app.use('/api/v1', v1Router);

// Legacy routes (backwards compatibility)
app.use('/api/analyze', analyzeRouter);
app.use('/api', snippetsRouter);

// 404 handler
app.use(notFoundHandler);

// Centralized error handler (must be last)
app.use(errorHandler);

// Initialize function for both parser and database
export async function initializeApp(): Promise<void> {
  logger.info('Initializing application...');

  try {
    await Promise.all([initParser(), initDatabase()]);
    logger.info('Application initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize application', { error });
    throw error;
  }
}

// Graceful shutdown handler
function gracefulShutdown(signal: string): void {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  process.exit(0);
}

// Start server (only if this file is run directly)
if (require.main === module) {
  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Initialize parser and database before starting server
  initializeApp()
    .then(() => {
      app.listen(config.port, () => {
        logger.info(`🚀 RookieMistakes API running on http://localhost:${config.port}`);
        logger.info(`   Environment: ${config.nodeEnv}`);
        logger.info(`   API Docs: http://localhost:${config.port}/api/docs`);
        logger.info(`   Health: http://localhost:${config.port}/api/health`);
        logger.info(`   Analyze: POST http://localhost:${config.port}/api/v1/analyze`);
        logger.info(`   Save: POST http://localhost:${config.port}/api/v1/save`);
        logger.info(`   Get: GET http://localhost:${config.port}/api/v1/snippet/:id`);

        // Console output for development
        if (config.isDevelopment) {
          console.log(`\n🚀 RookieMistakes API running on http://localhost:${config.port}`);
          console.log(`   📚 API Docs: http://localhost:${config.port}/api/docs`);
          console.log(`   ❤️  Health: http://localhost:${config.port}/api/health\n`);
        }
      });
    })
    .catch((err) => {
      logger.error('Failed to start server', { error: err });
      console.error('Failed to initialize:', err);
      process.exit(1);
    });
}

export default app;
