import swaggerJsdoc from 'swagger-jsdoc';
import { config } from './config';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RookieMistakes.dev API',
      version: '1.0.0',
      description: `
AST-based code analysis API that detects common junior developer mistakes.

## Features
- Supports JavaScript, TypeScript, and Python
- Detects 10 common coding mistakes
- Deterministic analysis (no AI/ML)
- Save and share code snippets

## Rate Limits
- General API: ${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 60000} minutes
- Analysis endpoint: ${config.rateLimit.maxAnalyzeRequests} requests per ${config.rateLimit.windowMs / 60000} minutes
      `,
      contact: {
        name: 'API Support',
        url: 'https://github.com/rookiemistakes/rookiemistakes.dev',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.rookiemistakes.dev',
        description: 'Production server',
      },
    ],
    tags: [
      {
        name: 'Analysis',
        description: 'Code analysis endpoints',
      },
      {
        name: 'Snippets',
        description: 'Snippet storage endpoints',
      },
      {
        name: 'Health',
        description: 'Health check endpoints',
      },
    ],
    components: {
      schemas: {
        Language: {
          type: 'string',
          enum: ['javascript', 'typescript', 'python'],
          description: 'Programming language',
          example: 'javascript',
        },
        Severity: {
          type: 'string',
          enum: ['error', 'warning', 'info'],
          description: 'Severity level of the mistake',
          example: 'warning',
        },
        Certainty: {
          type: 'string',
          enum: ['definite', 'possible', 'heuristic'],
          description: 'Certainty of the mistake',
          example: 'possible',
        },
        Scope: {
          type: 'string',
          enum: ['local', 'function', 'module'],
          description: 'Scope affected by the mistake',
          example: 'function',
        },
        AstFacts: {
          type: 'object',
          description: 'Structured facts extracted from the AST',
          additionalProperties: true,
          example: {
            operator: '==',
            left_text: 'x',
            right_text: '5',
          },
        },
        Mistake: {
          type: 'object',
          required: [
            'id',
            'name',
            'line',
            'column',
            'severity',
            'certainty',
            'confidence',
            'scope',
            'message',
            'ast_facts',
            'explanation',
            'fix',
          ],
          properties: {
            id: {
              type: 'integer',
              description: 'Unique identifier within the analysis',
              example: 1,
            },
            name: {
              type: 'string',
              description: 'Detector name',
              example: 'double_equals',
            },
            line: {
              type: 'integer',
              description: 'Line number (1-indexed)',
              example: 5,
            },
            column: {
              type: 'integer',
              description: 'Column number (0-indexed)',
              example: 8,
            },
            severity: {
              $ref: '#/components/schemas/Severity',
            },
            certainty: {
              $ref: '#/components/schemas/Certainty',
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence score from 0 to 1',
              example: 0.85,
            },
            scope: {
              $ref: '#/components/schemas/Scope',
            },
            message: {
              type: 'string',
              description: 'Human-readable error message',
              example: "Use '===' instead of '=='",
            },
            ast_facts: {
              $ref: '#/components/schemas/AstFacts',
            },
            explanation: {
              type: 'string',
              description: 'Detailed explanation of the issue',
              example: "Using '==' performs type coercion which can lead to unexpected results.",
            },
            fix: {
              type: 'string',
              description: 'Suggested fix',
              example: "Replace '==' with '===' for strict equality comparison.",
            },
          },
        },
        AnalyzeRequest: {
          type: 'object',
          required: ['code', 'language'],
          properties: {
            code: {
              type: 'string',
              description: 'Source code to analyze',
              maxLength: 100000,
              example: 'if (x == 5) { console.log("found"); }',
            },
            language: {
              $ref: '#/components/schemas/Language',
            },
          },
        },
        AnalyzeResponse: {
          type: 'object',
          required: ['mistakes', 'score'],
          properties: {
            mistakes: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Mistake',
              },
            },
            score: {
              type: 'integer',
              minimum: 0,
              maximum: 10,
              description: 'Code quality score (10 - number of mistakes, minimum 0)',
              example: 8,
            },
          },
        },
        SaveRequest: {
          type: 'object',
          required: ['code', 'language', 'results'],
          properties: {
            code: {
              type: 'string',
              description: 'Source code',
              maxLength: 100000,
            },
            language: {
              $ref: '#/components/schemas/Language',
            },
            results: {
              $ref: '#/components/schemas/AnalyzeResponse',
            },
          },
        },
        SaveResponse: {
          type: 'object',
          required: ['id'],
          properties: {
            id: {
              type: 'string',
              description: 'Unique snippet ID',
              example: 'abc123xyz',
            },
          },
        },
        SnippetResponse: {
          type: 'object',
          required: ['id', 'code', 'language', 'results', 'created_at'],
          properties: {
            id: {
              type: 'string',
              description: 'Snippet ID',
            },
            code: {
              type: 'string',
              description: 'Source code',
            },
            language: {
              $ref: '#/components/schemas/Language',
            },
            results: {
              $ref: '#/components/schemas/AnalyzeResponse',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          required: ['error', 'message'],
          properties: {
            error: {
              type: 'string',
              description: 'Error type',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                  },
                  message: {
                    type: 'string',
                  },
                },
              },
            },
            requestId: {
              type: 'string',
              description: 'Unique request ID for debugging',
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              example: 'ok',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
            },
            version: {
              type: 'string',
              example: '1.0.0',
            },
          },
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad request - validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFound: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        RateLimited: {
          description: 'Too many requests',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
          headers: {
            'Retry-After': {
              description: 'Seconds to wait before retrying',
              schema: {
                type: 'integer',
              },
            },
          },
        },
        InternalError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    paths: {
      '/api/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Check if the API is running',
          responses: {
            '200': {
              description: 'API is healthy',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/HealthResponse',
                  },
                },
              },
            },
          },
        },
      },
      '/api/analyze': {
        post: {
          tags: ['Analysis'],
          summary: 'Analyze code',
          description: 'Analyze source code for common mistakes',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/AnalyzeRequest',
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Analysis successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/AnalyzeResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '429': {
              $ref: '#/components/responses/RateLimited',
            },
            '500': {
              $ref: '#/components/responses/InternalError',
            },
          },
        },
      },
      '/api/save': {
        post: {
          tags: ['Snippets'],
          summary: 'Save snippet',
          description: 'Save a code snippet with analysis results',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SaveRequest',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'Snippet saved successfully',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SaveResponse',
                  },
                },
              },
            },
            '400': {
              $ref: '#/components/responses/BadRequest',
            },
            '429': {
              $ref: '#/components/responses/RateLimited',
            },
            '500': {
              $ref: '#/components/responses/InternalError',
            },
          },
        },
      },
      '/api/snippet/{id}': {
        get: {
          tags: ['Snippets'],
          summary: 'Get snippet',
          description: 'Retrieve a saved snippet by ID',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Snippet ID',
              schema: {
                type: 'string',
              },
            },
          ],
          responses: {
            '200': {
              description: 'Snippet found',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SnippetResponse',
                  },
                },
              },
            },
            '404': {
              $ref: '#/components/responses/NotFound',
            },
            '500': {
              $ref: '#/components/responses/InternalError',
            },
          },
        },
      },
    },
  },
  apis: [], // We define everything inline above
};

export const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
