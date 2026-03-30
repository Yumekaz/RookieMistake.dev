import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import {
  compareProjectAnalyses,
  getProjectAnalysis,
  getRecentProjectAnalyses,
  saveProjectAnalysis,
} from '../../db';
import {
  validateProjectAnalyzeRequest,
  validateProjectAnalysisParams,
  validateProjectCompareQuery,
  validateRecentProjectAnalysesQuery,
  ProjectAnalyzeRequest,
  ProjectAnalysisParams,
  ProjectCompareQuery,
  RecentProjectAnalysesQuery,
} from '../../middleware/validation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { analyzeLimiter } from '../../middleware/rateLimit';
import { logger } from '../../lib/logger';
import { analyzeProject } from '../../lib/projectAnalysis';

const router = Router();

router.post(
  '/analyze',
  analyzeLimiter,
  validateProjectAnalyzeRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const requestBody = req.body as ProjectAnalyzeRequest;
    const analysisId = nanoid(10);
    const requestId = req.requestId;
    const startTime = Date.now();

    logger.info('Starting project analysis', {
      requestId,
      analysisId,
      profile: requestBody.profile,
      fileCount: requestBody.files.length,
    });

    const analysis = analyzeProject(analysisId, requestBody);
    saveProjectAnalysis(analysisId, requestBody, analysis);

    const duration = Date.now() - startTime;

    logger.info('Project analysis completed', {
      requestId,
      analysisId,
      profile: requestBody.profile,
      fileCount: requestBody.files.length,
      findingCount: analysis.summary.findingCount,
      parseErrorCount: analysis.summary.parseErrorCount,
      duration: `${duration}ms`,
    });

    return res.status(201).json(analysis);
  })
);

router.get(
  '/recent',
  validateRecentProjectAnalysesQuery,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as RecentProjectAnalysesQuery;
    const requestId = req.requestId;

    logger.info('Retrieving recent project analyses', {
      requestId,
      limit,
    });

    return res.json(getRecentProjectAnalyses(limit));
  })
);

router.get(
  '/compare',
  validateProjectCompareQuery,
  asyncHandler(async (req: Request, res: Response) => {
    const { baseId, targetId } = req.query as unknown as ProjectCompareQuery;
    const requestId = req.requestId;

    logger.info('Comparing project analyses', {
      requestId,
      baselineAnalysisId: baseId,
      candidateAnalysisId: targetId,
    });

    const comparison = compareProjectAnalyses(baseId, targetId);

    if (!comparison) {
      throw new NotFoundError('Project analysis not found');
    }

    return res.json(comparison);
  })
);

router.get(
  '/:id',
  validateProjectAnalysisParams,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params as unknown as ProjectAnalysisParams;
    const requestId = req.requestId;

    logger.info('Retrieving project analysis', {
      requestId,
      analysisId: id,
    });

    const analysis = getProjectAnalysis(id);

    if (!analysis) {
      logger.warn('Project analysis not found', {
        requestId,
        analysisId: id,
      });
      throw new NotFoundError('Project analysis not found');
    }

    return res.json(analysis);
  })
);

export default router;
