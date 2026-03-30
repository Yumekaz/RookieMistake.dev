import { Router, Request, Response } from 'express';
import { Language } from '../../types';
import { validateAnalyzeRequest, AnalyzeRequest } from '../../middleware/validation';
import { asyncHandler, BadRequestError } from '../../middleware/errorHandler';
import { analyzeLimiter } from '../../middleware/rateLimit';
import { logger, logAnalysis } from '../../lib/logger';
import { recordAnalysisMetric } from '../../lib/metrics';
import { analyzeSingleFile } from '../../lib/projectAnalysis';

const router = Router();

/**
 * POST /api/v1/analyze
 *
 * Analyzes code for common mistakes using AST-based detection.
 */
router.post(
  '/',
  analyzeLimiter,
  validateAnalyzeRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { code, language } = req.body as AnalyzeRequest;
    const requestId = req.requestId;

    logger.info('Starting code analysis', {
      requestId,
      language,
      codeLength: code.length,
    });

    try {
      const analysis = analyzeSingleFile(code, language as Language);
      const duration = Date.now() - startTime;
      logAnalysis(language, code.length, analysis.mistakes.length, duration);
      recordAnalysisMetric(language as string, analysis.mistakes.length, duration);

      return res.json(analysis);
    } catch (parseError) {
      logger.warn('Code parsing failed', {
        requestId,
        language,
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
      });
      throw new BadRequestError('Failed to parse code. Please check for syntax errors.');
    }
  })
);

export default router;
