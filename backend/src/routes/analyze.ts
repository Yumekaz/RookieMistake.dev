import { Router, Request, Response } from 'express';
import { parseCode } from '../parser';
import { getDetectorsForLanguage } from '../detectors';
import { generateExplanation } from '../explainers';
import { AnalyzeRequest, AnalyzeResponse, Mistake, Language } from '../types';
import { logger, logAnalysis, logError } from '../lib/logger';

const router = Router();

// Validate language parameter
function isValidLanguage(lang: unknown): lang is Language {
  return lang === 'javascript' || lang === 'typescript' || lang === 'python';
}

/**
 * POST /api/analyze
 * 
 * Analyzes code for common mistakes.
 * 
 * Request body:
 * {
 *   code: string,
 *   language: "javascript" | "typescript" | "python"
 * }
 * 
 * Response:
 * {
 *   mistakes: [...],
 *   score: number
 * }
 */
router.post('/', (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    const { code, language } = req.body as AnalyzeRequest;

    // Validate input
    if (!code || typeof code !== 'string') {
      logger.warn('Analysis request missing code', { hasCode: !!code });
      return res.status(400).json({
        error: 'Missing or invalid "code" field',
      });
    }

    if (!isValidLanguage(language)) {
      logger.warn('Analysis request with invalid language', { language });
      return res.status(400).json({
        error: 'Invalid "language" field. Must be "javascript", "typescript", or "python"',
      });
    }

    // Limit code size
    if (code.length > 100000) {
      logger.warn('Code size exceeded', { size: code.length });
      return res.status(400).json({
        error: 'Code too large. Maximum size is 100KB',
      });
    }

    logger.debug('Starting analysis', { language, codeLength: code.length });

    // Parse the code
    let tree;
    try {
      tree = parseCode(code, language);
    } catch (parseError) {
      logger.warn('Code parsing failed', { language, error: String(parseError) });
      return res.status(400).json({
        error: 'Failed to parse code. Please check for syntax errors.',
        details: String(parseError),
      });
    }

    // Get applicable detectors
    const applicableDetectors = getDetectorsForLanguage(language);

    // Run all detectors
    const allMistakes: Mistake[] = [];
    let mistakeId = 1;

    for (const detector of applicableDetectors) {
      try {
        const detectorResults = detector.detect(code, language, tree);

        for (const result of detectorResults) {
          // Generate explanation from template
          const { explanation, fix } = generateExplanation(result.name, {
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
          });
        }
      } catch (detectorError) {
        // Log but don't fail the entire analysis
        logError(detectorError instanceof Error ? detectorError : new Error(String(detectorError)), {
          detector: detector.name,
          language,
        });
      }
    }

    // Sort mistakes by line number
    allMistakes.sort((a, b) => a.line - b.line || a.column - b.column);

    // Calculate score: max(0, 10 - number of mistakes)
    const score = Math.max(0, 10 - allMistakes.length);

    const response: AnalyzeResponse = {
      mistakes: allMistakes,
      score,
    };

    // Log analysis completion
    logAnalysis(language, code.length, allMistakes.length, Date.now() - startTime);

    return res.json(response);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), { route: 'analyze' });
    return res.status(500).json({
      error: 'Internal server error during analysis',
    });
  }
});

export default router;
