import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import { saveSnippet, getSnippet } from '../db';
import { SaveRequest, SaveResponse, Language } from '../types';

const router = Router();

// Validate language parameter
function isValidLanguage(lang: unknown): lang is Language {
  return lang === 'javascript' || lang === 'typescript' || lang === 'python';
}

/**
 * POST /api/save
 * 
 * Saves a code snippet with analysis results.
 * 
 * Request body:
 * {
 *   code: string,
 *   language: "javascript" | "typescript" | "python",
 *   results: { mistakes: [...], score: number }
 * }
 * 
 * Response:
 * {
 *   id: string
 * }
 */
router.post('/save', (req: Request, res: Response) => {
  try {
    const { code, language, results } = req.body as SaveRequest;

    // Validate input
    if (!code || typeof code !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid "code" field',
      });
    }

    if (!isValidLanguage(language)) {
      return res.status(400).json({
        error: 'Invalid "language" field. Must be "javascript", "typescript", or "python"',
      });
    }

    if (!results || typeof results !== 'object') {
      return res.status(400).json({
        error: 'Missing or invalid "results" field',
      });
    }

    if (!Array.isArray(results.mistakes)) {
      return res.status(400).json({
        error: 'Invalid "results.mistakes" field. Must be an array',
      });
    }

    if (typeof results.score !== 'number') {
      return res.status(400).json({
        error: 'Invalid "results.score" field. Must be a number',
      });
    }

    // Limit code size
    if (code.length > 100000) {
      return res.status(400).json({
        error: 'Code too large. Maximum size is 100KB',
      });
    }

    // Generate unique ID
    const id = nanoid(10);

    // Save to database
    try {
      saveSnippet(id, code, language, results);
    } catch (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({
        error: 'Failed to save snippet',
      });
    }

    const response: SaveResponse = { id };
    return res.status(201).json(response);
  } catch (error) {
    console.error('Save error:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/snippet/:id
 * 
 * Retrieves a saved snippet by ID.
 * 
 * Response:
 * {
 *   id: string,
 *   code: string,
 *   language: string,
 *   results: { mistakes: [...], score: number },
 *   created_at: string
 * }
 */
router.get('/snippet/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Invalid snippet ID',
      });
    }

    // Retrieve from database
    const snippet = getSnippet(id);

    if (!snippet) {
      return res.status(404).json({
        error: 'Snippet not found',
      });
    }

    return res.json(snippet);
  } catch (error) {
    console.error('Retrieve error:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
