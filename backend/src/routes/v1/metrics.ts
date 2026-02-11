import { Router, Request, Response } from 'express';
import { metrics } from '../../lib/metrics';
import { asyncHandler } from '../../middleware/errorHandler';

const router = Router();

/**
 * GET /api/v1/metrics
 *
 * Returns current application metrics including:
 * - Request counts and latencies
 * - Error rates
 * - Analysis statistics
 * - Uptime
 *
 * Authentication: None (consider adding API key for production)
 */
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    const metricsData = metrics.getMetrics();
    
    res.json({
      success: true,
      data: metricsData,
      timestamp: new Date().toISOString(),
    });
  })
);

/**
 * GET /api/v1/metrics/health
 *
 * Returns health status based on metrics
 */
router.get(
  '/health',
  asyncHandler(async (_req: Request, res: Response) => {
    const health = metrics.getHealth();
    
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: health.status !== 'unhealthy',
      data: health,
      timestamp: new Date().toISOString(),
    });
  })
);

export default router;
