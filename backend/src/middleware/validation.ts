import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { logger } from '../lib/logger';

// Language enum
export const languageSchema = z.enum(['javascript', 'typescript', 'python']);
export type Language = z.infer<typeof languageSchema>;

// Severity enum
export const severitySchema = z.enum(['error', 'warning', 'info']);
export type Severity = z.infer<typeof severitySchema>;

// Certainty enum
export const certaintySchema = z.enum(['definite', 'possible', 'heuristic']);
export type Certainty = z.infer<typeof certaintySchema>;

// Scope enum
export const scopeSchema = z.enum(['local', 'function', 'module']);
export type Scope = z.infer<typeof scopeSchema>;

// Mistake schema
export const mistakeSchema = z.object({
  id: z.number(),
  name: z.string(),
  line: z.number(),
  column: z.number(),
  severity: severitySchema,
  certainty: certaintySchema,
  confidence: z.number().min(0).max(1),
  scope: scopeSchema,
  message: z.string(),
  ast_facts: z.record(z.string(), z.unknown()),
  explanation: z.string(),
  fix: z.string(),
});

// Analysis results schema
export const analysisResultsSchema = z.object({
  mistakes: z.array(mistakeSchema),
  score: z.number().min(0).max(10),
});

// POST /api/analyze request body
export const analyzeRequestSchema = z.object({
  code: z
    .string()
    .min(1, 'Code cannot be empty')
    .max(config.api.maxCodeSize, `Code cannot exceed ${config.api.maxCodeSize} characters`),
  language: languageSchema,
});

export type AnalyzeRequest = z.infer<typeof analyzeRequestSchema>;

// POST /api/save request body
export const saveRequestSchema = z.object({
  code: z
    .string()
    .min(1, 'Code cannot be empty')
    .max(config.api.maxCodeSize, `Code cannot exceed ${config.api.maxCodeSize} characters`),
  language: languageSchema,
  results: analysisResultsSchema,
});

export type SaveRequest = z.infer<typeof saveRequestSchema>;

// GET /api/snippet/:id params
export const snippetParamsSchema = z.object({
  id: z
    .string()
    .min(1, 'Snippet ID is required')
    .max(50, 'Invalid snippet ID')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid snippet ID format'),
});

export type SnippetParams = z.infer<typeof snippetParamsSchema>;

// Validation middleware factory
export function validate<T extends z.ZodSchema>(
  schema: T,
  source: 'body' | 'params' | 'query' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = source === 'body' ? req.body : source === 'params' ? req.params : req.query;
      const result = schema.safeParse(data);

      if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));

        logger.warn('Validation failed', {
          path: req.path,
          errors,
        });

        res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
        return;
      }

      // Attach validated data to request
      if (source === 'body') {
        req.body = result.data;
      } else if (source === 'params') {
        req.params = result.data as Record<string, string>;
      } else {
        req.query = result.data as Record<string, string>;
      }

      next();
    } catch (error) {
      logger.error('Validation error', { error });
      res.status(500).json({
        error: 'Validation error',
        message: 'An unexpected error occurred during validation',
      });
    }
  };
}

// Convenience validators
export const validateAnalyzeRequest = validate(analyzeRequestSchema, 'body');
export const validateSaveRequest = validate(saveRequestSchema, 'body');
export const validateSnippetParams = validate(snippetParamsSchema, 'params');

export default {
  validate,
  validateAnalyzeRequest,
  validateSaveRequest,
  validateSnippetParams,
  schemas: {
    analyzeRequestSchema,
    saveRequestSchema,
    snippetParamsSchema,
    languageSchema,
    severitySchema,
    certaintySchema,
    scopeSchema,
    mistakeSchema,
    analysisResultsSchema,
  },
};
