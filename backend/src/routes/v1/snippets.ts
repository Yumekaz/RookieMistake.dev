import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { saveSnippet, getSnippet, getRecentSnippets, compareSnippets } from '../../db';
import { AnalyzeResponse, Language } from '../../types';
import {
  validateSaveRequest,
  validateSnippetParams,
  validateRecentSnippetsQuery,
  validateCompareQuery,
  SaveRequest,
  RecentSnippetsQuery,
  CompareQuery,
} from '../../middleware/validation';
import { asyncHandler, NotFoundError } from '../../middleware/errorHandler';
import { saveLimiter } from '../../middleware/rateLimit';
import { logger } from '../../lib/logger';

const router = Router();

router.post(
  '/save',
  saveLimiter,
  validateSaveRequest,
  asyncHandler(async (req: Request, res: Response) => {
    const { code, language, results } = req.body as SaveRequest;
    const id = nanoid(10);
    const requestId = req.requestId;

    logger.info('Saving snippet', {
      requestId,
      id,
      language,
      codeLength: code.length,
      mistakeCount: results.mistakes.length,
    });

    saveSnippet(id, code, language as Language, results as unknown as AnalyzeResponse);

    logger.info('Snippet saved successfully', { id });

    return res.status(201).json({ id });
  })
);

router.get(
  '/snippet/:id',
  validateSnippetParams,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const requestId = req.requestId;

    logger.info('Retrieving snippet', { id, requestId });

    const snippet = getSnippet(id);

    if (!snippet) {
      logger.warn('Snippet not found', { id, requestId });
      throw new NotFoundError('Snippet not found');
    }

    logger.info('Snippet retrieved successfully', { id, requestId });

    return res.json(snippet);
  })
);

router.get(
  '/snippets/recent',
  validateRecentSnippetsQuery,
  asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as RecentSnippetsQuery;
    const snippets = getRecentSnippets(limit);

    return res.json({
      snippets,
      total: snippets.length,
    });
  })
);

router.get(
  '/compare',
  validateCompareQuery,
  asyncHandler(async (req: Request, res: Response) => {
    const { baseId, targetId } = req.query as unknown as CompareQuery;
    const comparison = compareSnippets(baseId, targetId);

    if (!comparison) {
      throw new NotFoundError('One or both snippets were not found');
    }

    return res.json(comparison);
  })
);

export default router;
