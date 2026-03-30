import request from 'supertest';
import app, { initializeApp } from '../../src/index';

describe('API v1 Routes', () => {
  beforeAll(async () => {
    await initializeApp();
  }, 30000);

  describe('POST /api/v1/analyze', () => {
    it('analyzes JavaScript code correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: 'var x = 1; if (x == 2) { console.log("test"); }',
          language: 'javascript',
        })
        .expect(200);

      expect(response.body).toHaveProperty('mistakes');
      expect(response.body).toHaveProperty('score');
      expect(Array.isArray(response.body.mistakes)).toBe(true);
      
      // Should detect var_usage, double_equals, console_log_left
      const mistakeNames = response.body.mistakes.map((m: { name: string }) => m.name);
      expect(mistakeNames).toContain('var_usage');
      expect(mistakeNames).toContain('double_equals');
      expect(mistakeNames).toContain('console_log_left');
    });

    it('analyzes TypeScript code correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: 'if (x == 2) { console.log("test"); }',
          language: 'typescript',
        })
        .expect(200);

      expect(response.body.mistakes.length).toBeGreaterThan(0);
      // TypeScript should not flag var_usage (not applicable)
      const mistakeNames = response.body.mistakes.map((m: { name: string }) => m.name);
      expect(mistakeNames).not.toContain('var_usage');
    });

    it('analyzes Python code correctly', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: `
try:
    x = 1
except:
    pass
`,
          language: 'python',
        })
        .expect(200);

      expect(response.body.mistakes.length).toBeGreaterThan(0);
      const mistakeNames = response.body.mistakes.map((m: { name: string }) => m.name);
      expect(mistakeNames).toContain('empty_catch');
    });

    it('returns validation error for empty code', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: '',
          language: 'javascript',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body).toHaveProperty('details');
    });

    it('returns validation error for invalid language', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: 'const x = 1;',
          language: 'ruby',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('returns mistake with all required fields', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: 'var x = 1;',
          language: 'javascript',
        })
        .expect(200);

      expect(response.body.mistakes.length).toBe(1);
      const mistake = response.body.mistakes[0];
      
      expect(mistake).toHaveProperty('id');
      expect(mistake).toHaveProperty('name');
      expect(mistake).toHaveProperty('line');
      expect(mistake).toHaveProperty('column');
      expect(mistake).toHaveProperty('severity');
      expect(mistake).toHaveProperty('certainty');
      expect(mistake).toHaveProperty('confidence');
      expect(mistake).toHaveProperty('scope');
      expect(mistake).toHaveProperty('message');
      expect(mistake).toHaveProperty('ast_facts');
      expect(mistake).toHaveProperty('explanation');
      expect(mistake).toHaveProperty('fix');
    });

    it('rejects syntax errors', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: 'function broken( {',
          language: 'javascript',
        })
        .expect(400);

      expect(response.body.message || response.body.error).toMatch(/parse|syntax/i);
    });
  });

  describe('POST /api/v1/save and GET /api/v1/snippet/:id', () => {
    it('saves snippet and retrieves it', async () => {
      const saveResponse = await request(app)
        .post('/api/v1/save')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
          results: {
            mistakes: [],
            score: 10,
          },
        })
        .expect(201);

      expect(saveResponse.body).toHaveProperty('id');
      const snippetId = saveResponse.body.id;

      const getResponse = await request(app)
        .get(`/api/v1/snippet/${snippetId}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('id', snippetId);
      expect(getResponse.body).toHaveProperty('code', 'const x = 1;');
      expect(getResponse.body).toHaveProperty('language', 'javascript');
      expect(getResponse.body).toHaveProperty('results');
      expect(getResponse.body.results).toHaveProperty('score', 10);
    });

    it('returns 400 for invalid save request', async () => {
      const response = await request(app)
        .post('/api/v1/save')
        .send({
          code: 'const x = 1;',
          // missing language and results
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Validation failed');
    });

    it('returns 404 for non-existent snippet', async () => {
      const response = await request(app)
        .get('/api/v1/snippet/nonexistent123')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('returns 400 for invalid snippet ID format', async () => {
      await request(app)
        .get('/api/v1/snippet/invalid/id/format')
        .expect(404); // This will be caught by router, not validation
    });
  });

  describe('History and compare endpoints', () => {
    it('returns recent snippets', async () => {
      const response = await request(app)
        .get('/api/v1/snippets/recent?limit=5')
        .expect(200);

      expect(response.body).toHaveProperty('snippets');
      expect(response.body).toHaveProperty('total');
      expect(Array.isArray(response.body.snippets)).toBe(true);
    });

    it('compares two saved snippets', async () => {
      const first = await request(app)
        .post('/api/v1/save')
        .send({
          code: 'const a = 1;',
          language: 'javascript',
          results: { mistakes: [], score: 10 },
        })
        .expect(201);

      const second = await request(app)
        .post('/api/v1/save')
        .send({
          code: 'var b = 1;',
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
                confidence: 0.45,
                scope: 'function',
                message: 'Use let or const',
                ast_facts: { variable_names: ['b'] },
                explanation: 'Use let or const',
                fix: 'Use let or const',
              },
            ],
            score: 9,
          },
        })
        .expect(201);

      const response = await request(app)
        .get(`/api/v1/compare?baseId=${first.body.id}&targetId=${second.body.id}`)
        .expect(200);

      expect(response.body).toHaveProperty('baseline');
      expect(response.body).toHaveProperty('candidate');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('scoreDelta');
      expect(response.body.summary).toHaveProperty('mistakeDelta');
      expect(response.body.summary).toHaveProperty('persistedMistakes');
    });
  });

  describe('Metrics and tracing', () => {
    it('sets a request id header on analyze responses', async () => {
      const response = await request(app)
        .post('/api/v1/analyze')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        })
        .expect(200);

      expect(response.headers['x-request-id']).toBeDefined();
    });

    it('returns structured metrics', async () => {
      const response = await request(app)
        .get('/api/v1/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.requests).toHaveProperty('byEndpoint');
      expect(response.body.data.requests).toHaveProperty('recent');
    });
  });

  describe('API versioning backwards compatibility', () => {
    it('legacy /api/analyze still works', async () => {
      const response = await request(app)
        .post('/api/analyze')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
        })
        .expect(200);

      expect(response.body).toHaveProperty('mistakes');
      expect(response.body).toHaveProperty('score');
    });

    it('legacy /api/save still works', async () => {
      const response = await request(app)
        .post('/api/save')
        .send({
          code: 'const x = 1;',
          language: 'javascript',
          results: { mistakes: [], score: 10 },
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    it('v1 and legacy return consistent results', async () => {
      const code = 'var x = 1;';
      const language = 'javascript';

      const legacyResponse = await request(app)
        .post('/api/analyze')
        .send({ code, language });

      const v1Response = await request(app)
        .post('/api/v1/analyze')
        .send({ code, language });

      // Both should detect the same mistakes
      expect(legacyResponse.body.mistakes.length).toBe(v1Response.body.mistakes.length);
      expect(legacyResponse.body.score).toBe(v1Response.body.score);
    });
  });
});
