import { Request, Response, NextFunction } from 'express';
import {
  validate,
  validateAnalyzeRequest,
  validateProjectAnalyzeRequest,
  validateProjectAnalysisParams,
  validateFindingFeedbackRequest,
  validateSnippetParams,
  analyzeRequestSchema,
  projectAnalyzeRequestSchema,
  findingFeedbackSchema,
  saveRequestSchema,
  snippetParamsSchema,
  projectAnalysisParamsSchema,
  recentSnippetsQuerySchema,
  compareQuerySchema,
} from '../../src/middleware/validation';

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock config
jest.mock('../../src/config', () => ({
  __esModule: true,
  default: {
    api: {
      maxCodeSize: 100000,
    },
  },
}));

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      params: {},
      query: {},
      path: '/test',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockNext = jest.fn();
  });

  describe('analyzeRequestSchema', () => {
    it('validates correct analyze request', () => {
      const result = analyzeRequestSchema.safeParse({
        code: 'const x = 1;',
        language: 'javascript',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty code', () => {
      const result = analyzeRequestSchema.safeParse({
        code: '',
        language: 'javascript',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid language', () => {
      const result = analyzeRequestSchema.safeParse({
        code: 'const x = 1;',
        language: 'ruby',
      });
      expect(result.success).toBe(false);
    });

    it('accepts all valid languages', () => {
      ['javascript', 'typescript', 'python'].forEach((lang) => {
        const result = analyzeRequestSchema.safeParse({
          code: 'x = 1',
          language: lang,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('saveRequestSchema', () => {
    it('validates correct save request', () => {
      const result = saveRequestSchema.safeParse({
        code: 'const x = 1;',
        language: 'javascript',
        results: {
          mistakes: [],
          score: 10,
        },
      });
      expect(result.success).toBe(true);
    });

    it('validates save request with mistakes', () => {
      const result = saveRequestSchema.safeParse({
        code: 'var x = 1;',
        language: 'javascript',
        results: {
          mistakes: [
            {
              id: 1,
              name: 'var_usage',
              line: 1,
              column: 0,
              severity: 'info',
              certainty: 'heuristic',
              confidence: 0.5,
              scope: 'function',
              message: 'Use let or const',
              ast_facts: { variable_names: ['x'] },
              explanation: 'Explanation here',
              fix: 'Fix here',
            },
          ],
          score: 9,
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing results', () => {
      const result = saveRequestSchema.safeParse({
        code: 'const x = 1;',
        language: 'javascript',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('snippetParamsSchema', () => {
    it('validates correct snippet ID', () => {
      const result = snippetParamsSchema.safeParse({
        id: 'abc123xyz',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty ID', () => {
      const result = snippetParamsSchema.safeParse({
        id: '',
      });
      expect(result.success).toBe(false);
    });

    it('rejects ID with invalid characters', () => {
      const result = snippetParamsSchema.safeParse({
        id: 'abc/123',
      });
      expect(result.success).toBe(false);
    });

    it('rejects ID with spaces', () => {
      const result = snippetParamsSchema.safeParse({
        id: 'abc 123',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('projectAnalyzeRequestSchema', () => {
    it('validates a project analysis request', () => {
      const result = projectAnalyzeRequestSchema.safeParse({
        profile: 'balanced',
        files: [
          {
            path: 'src/index.ts',
            code: 'const value = 1;',
            language: 'typescript',
          },
          {
            path: 'src/app.js',
            code: 'var x = 1;',
            language: 'javascript',
          },
        ],
      });

      expect(result.success).toBe(true);
    });

    it('rejects duplicate file paths', () => {
      const result = projectAnalyzeRequestSchema.safeParse({
        profile: 'focused',
        files: [
          {
            path: 'src/index.ts',
            code: 'const value = 1;',
            language: 'typescript',
          },
          {
            path: 'src/index.ts',
            code: 'const other = 2;',
            language: 'typescript',
          },
        ],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('findingFeedbackSchema', () => {
    it('validates a feedback request', () => {
      const result = findingFeedbackSchema.safeParse({
        analysisId: 'abc123xyz',
        findingId: 'finding-1',
        status: 'good_catch',
      });

      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = findingFeedbackSchema.safeParse({
        analysisId: 'abc123xyz',
        findingId: 'finding-1',
        status: 'maybe',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('query schemas', () => {
    it('validates recent snippets query', () => {
      const result = recentSnippetsQuerySchema.safeParse({ limit: '15' });
      expect(result.success).toBe(true);
      expect(result.success && result.data.limit).toBe(15);
    });

    it('validates compare query', () => {
      const result = compareQuerySchema.safeParse({
        baseId: 'abc123',
        targetId: 'xyz789',
      });
      expect(result.success).toBe(true);
    });

    it('validates project analysis params', () => {
      const result = projectAnalysisParamsSchema.safeParse({ id: 'abc123' });
      expect(result.success).toBe(true);
    });
  });

  describe('validate middleware', () => {
    it('passes valid body to next', () => {
      mockReq.body = { code: 'const x = 1;', language: 'javascript' };
      
      validateAnalyzeRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('returns 400 for invalid body', () => {
      mockReq.body = { code: '', language: 'javascript' };

      validateAnalyzeRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.any(Array),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('validates params correctly', () => {
      mockReq.params = { id: 'valid123' };

      validateSnippetParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('passes valid project analysis body to next', () => {
      mockReq.body = {
        profile: 'balanced',
        files: [
          {
            path: 'src/index.ts',
            code: 'const value = 1;',
            language: 'typescript',
          },
        ],
      };

      validateProjectAnalyzeRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validates project analysis params correctly', () => {
      mockReq.params = { id: 'valid123' };

      validateProjectAnalysisParams(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('validates finding feedback body correctly', () => {
      mockReq.body = {
        analysisId: 'valid123',
        findingId: 'finding-1',
        status: 'false_positive',
      };

      validateFindingFeedbackRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('rejects invalid params', () => {
      mockReq.params = { id: '' };

      validateSnippetParams(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('custom validate function', () => {
    it('validates query parameters', () => {
      const querySchema = snippetParamsSchema;
      const validator = validate(querySchema, 'query');
      
      mockReq.query = { id: 'test123' };
      
      validator(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
