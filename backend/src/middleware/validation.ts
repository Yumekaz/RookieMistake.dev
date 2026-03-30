import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import config from '../config';
import { logger } from '../lib/logger';

// Language enum
export const languageSchema = z.enum(['javascript', 'typescript', 'python']);
export type Language = z.infer<typeof languageSchema>;

// Analysis profile enum
export const analysisProfileSchema = z.enum(['balanced', 'focused', 'strict']);
export type AnalysisProfile = z.infer<typeof analysisProfileSchema>;

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

// Shared identifier schema
export const snippetIdSchema = z
  .string()
  .min(1, 'Snippet ID is required')
  .max(50, 'Invalid snippet ID')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid snippet ID format');

export const projectFileSchema = z.object({
  path: z.string().min(1, 'File path is required').max(260, 'File path is too long'),
  code: z
    .string()
    .min(1, 'File code cannot be empty')
    .max(config.api.maxCodeSize, `File code cannot exceed ${config.api.maxCodeSize} characters`),
  language: languageSchema,
});

export const projectAnalyzeRequestSchema = z
  .object({
    profile: analysisProfileSchema.default('balanced'),
    files: z.array(projectFileSchema).min(1, 'At least one file is required').max(20, 'Too many files'),
  })
  .superRefine((value, ctx) => {
    const seen = new Set<string>();

    value.files.forEach((file, index) => {
      const key = file.path.trim().toLowerCase();
      if (seen.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Duplicate file paths are not allowed',
          path: ['files', index, 'path'],
        });
        return;
      }

      seen.add(key);
    });
  });

export type ProjectAnalyzeRequest = z.infer<typeof projectAnalyzeRequestSchema>;

export const findingFeedbackStatusSchema = z.enum(['good_catch', 'false_positive']);
export type FindingFeedbackStatus = z.infer<typeof findingFeedbackStatusSchema>;

export const findingFeedbackSchema = z.object({
  analysisId: snippetIdSchema,
  findingId: z.string().min(1, 'Finding ID is required').max(100, 'Invalid finding ID'),
  status: findingFeedbackStatusSchema,
  note: z.string().max(500, 'Note is too long').optional(),
});

export type FindingFeedbackRequest = z.infer<typeof findingFeedbackSchema>;

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

export const snippetParamsSchema = z.object({
  id: snippetIdSchema,
});

export type SnippetParams = z.infer<typeof snippetParamsSchema>;

export const projectAnalysisParamsSchema = z.object({
  id: snippetIdSchema,
});

export type ProjectAnalysisParams = z.infer<typeof projectAnalysisParamsSchema>;

export const recentSnippetsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type RecentSnippetsQuery = z.infer<typeof recentSnippetsQuerySchema>;

export const compareQuerySchema = z.object({
  baseId: snippetIdSchema,
  targetId: snippetIdSchema,
});

export type CompareQuery = z.infer<typeof compareQuerySchema>;

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
export const validateProjectAnalyzeRequest = validate(projectAnalyzeRequestSchema, 'body');
export const validateSaveRequest = validate(saveRequestSchema, 'body');
export const validateSnippetParams = validate(snippetParamsSchema, 'params');
export const validateProjectAnalysisParams = validate(projectAnalysisParamsSchema, 'params');
export const validateFindingFeedbackRequest = validate(findingFeedbackSchema, 'body');
export const validateRecentSnippetsQuery = validate(recentSnippetsQuerySchema, 'query');
export const validateCompareQuery = validate(compareQuerySchema, 'query');

export default {
  validate,
  validateAnalyzeRequest,
  validateProjectAnalyzeRequest,
  validateSaveRequest,
  validateSnippetParams,
  validateProjectAnalysisParams,
  validateFindingFeedbackRequest,
  validateRecentSnippetsQuery,
  validateCompareQuery,
  schemas: {
    analyzeRequestSchema,
    projectAnalyzeRequestSchema,
    saveRequestSchema,
    snippetParamsSchema,
    projectAnalysisParamsSchema,
    snippetIdSchema,
    recentSnippetsQuerySchema,
    compareQuerySchema,
    findingFeedbackSchema,
    languageSchema,
    analysisProfileSchema,
    severitySchema,
    certaintySchema,
    scopeSchema,
    mistakeSchema,
    analysisResultsSchema,
    projectFileSchema,
    findingFeedbackStatusSchema,
  },
};
