import { Router, Request, Response } from 'express';
import { parseCode } from '../../parser';
import { getDetectorsForLanguage } from '../../detectors';
import { generateExplanation } from '../../explainers';
import { Mistake, Language } from '../../types';
import { validateAnalyzeRequest, AnalyzeRequest } from '../../middleware/validation';
import { asyncHandler, BadRequestError } from '../../middleware/errorHandler';
import { analyzeLimiter } from '../../middleware/rateLimit';
import { logger, logAnalysis } from '../../lib/logger';
import { recordAnalysisMetric } from '../../lib/metrics';

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

    logger.info('Starting code analysis', {
      language,
      codeLength: code.length,
    });

    // Parse the code
    let tree;
    try {
      tree = parseCode(code, language as Language);
    } catch (parseError) {
      logger.warn('Code parsing failed', {
        language,
        error: parseError instanceof Error ? parseError.message : 'Unknown error',
      });
      throw new BadRequestError('Failed to parse code. Please check for syntax errors.');
    }

    // Get applicable detectors
    const applicableDetectors = getDetectorsForLanguage(language as Language);

    // Run all detectors
    const allMistakes: Mistake[] = [];
    let mistakeId = 1;

    for (const detector of applicableDetectors) {
      try {
        const detectorResults = detector.detect(code, language as Language, tree);

        for (const result of detectorResults) {
          // Generate explanation from template
          const { explanation, fix, codeExample } = generateExplanation(result.name, {
            ...result.ast_facts,
            language,
            certainty: result.certainty,
          });

          allMistakes.push({
            id: mistakeId++,
            name: result.name,
            line: result.line,
            column: result.column,
            severity: result.severity,
            certainty: result.certainty,
            confidence: result.confidence,
            scope: result.scope,
            message: result.message,
            ast_facts: result.ast_facts,
            explanation,
            fix,
            codeExample,
          });
        }
      } catch (detectorError) {
        // Log but don't fail the entire analysis
        logger.error('Detector failed', {
          detector: detector.name,
          error: detectorError instanceof Error ? detectorError.message : 'Unknown error',
        });
      }
    }

    // Sort mistakes by line number
    allMistakes.sort((a, b) => a.line - b.line || a.column - b.column);

    // Calculate score: max(0, 10 - number of mistakes)
    const score = Math.max(0, 10 - allMistakes.length);

    const duration = Date.now() - startTime;
    logAnalysis(language, code.length, allMistakes.length, duration);
    recordAnalysisMetric(language as string, allMistakes.length, duration);

    return res.json({
      mistakes: allMistakes,
      score,
    });
  })
);

export default router;
