import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { saveSnippet, getSnippet } from '../../db';
import { Language, AnalyzeResponse } from '../../types';
import {
  validateSaveRequest,
  validateSnippetParams,
  SaveRequest,
} from '../../middleware/validation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { saveLimiter } from '../../middleware/rateLimit';
import { logger } from '../../lib/logger';

const router = Router();

/**
 * POST /api/v1/save
 *
 * Saves a code snippet with analysis results.
 */
router.post(
  '/save',
  saveLimiter,
  validateSaveRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, language, results } = req.body as SaveRequest;

    // Generate unique ID
    const id = nanoid(10);

    logger.info('Saving snippet', {
      id,
      language,
      codeLength: code.length,
      mistakeCount: results.mistakes.length,
    });

    // Save to database - cast results to AnalyzeResponse
    saveSnippet(id, code, language as Language, results as unknown as AnalyzeResponse);

    logger.info('Snippet saved successfully', { id });

    return res.status(201).json({ id });
  })
);

/**
 * GET /api/v1/snippet/:id
 *
 * Retrieves a saved snippet by ID.
 */
router.get(
  '/snippet/:id',
  validateSnippetParams,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    logger.info('Retrieving snippet', { id });

    // Retrieve from database
    const snippet = getSnippet(id);

    if (!snippet) {
      logger.warn('Snippet not found', { id });
      throw new NotFoundError('Snippet not found');
    }

    logger.info('Snippet retrieved successfully', { id });

    return res.json(snippet);
  })
);

export default router;
