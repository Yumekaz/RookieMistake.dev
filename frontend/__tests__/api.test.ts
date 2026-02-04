import { analyzeCode, saveSnippet, getSnippet, ApiError, Mistake } from '../src/lib/api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('analyzeCode', () => {
    it('sends correct request format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mistakes: [], score: 10 }),
      });

      await analyzeCode('const x = 1;', 'javascript');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'const x = 1;', language: 'javascript' }),
      });
    });

    it('returns parsed response for clean code', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mistakes: [], score: 10 }),
      });

      const result = await analyzeCode('const x = 1;', 'javascript');

      expect(result.mistakes).toEqual([]);
      expect(result.score).toBe(10);
    });

    it('returns mistakes correctly', async () => {
      const mockMistake: Mistake = {
        id: 1,
        name: 'var_usage',
        line: 1,
        column: 0,
        severity: 'info',
        certainty: 'heuristic',
        confidence: 0.45,
        scope: 'function',
        message: "Use 'let' or 'const'",
        ast_facts: { variable_names: ['x'] },
        explanation: 'var is outdated',
        fix: 'Use let or const',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ mistakes: [mockMistake], score: 9 }),
      });

      const result = await analyzeCode('var x = 1;', 'javascript');

      expect(result.mistakes).toHaveLength(1);
      expect(result.mistakes[0].name).toBe('var_usage');
      expect(result.score).toBe(9);
    });

    it('supports all three languages', async () => {
      const languages = ['javascript', 'typescript', 'python'] as const;

      for (const lang of languages) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ mistakes: [], score: 10 }),
        });

        await analyzeCode('x = 1', lang);

        expect(mockFetch).toHaveBeenLastCalledWith('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: 'x = 1', language: lang }),
        });
      }
    });

    it('throws ApiError on server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal server error' }),
      });

      await expect(analyzeCode('const x = 1;', 'javascript')).rejects.toThrow();
    });

    it('throws ApiError on validation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Validation failed', details: [] }),
      });

      await expect(analyzeCode('', 'javascript')).rejects.toThrow();
    });

    it('handles network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(analyzeCode('const x = 1;', 'javascript')).rejects.toThrow('Network error');
    });

    it('handles JSON parse errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(analyzeCode('const x = 1;', 'javascript')).rejects.toThrow();
    });
  });

  describe('saveSnippet', () => {
    it('sends correct request format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'abc123' }),
      });

      const results = { mistakes: [], score: 10 };
      await saveSnippet('const x = 1;', 'javascript', results);

      expect(mockFetch).toHaveBeenCalledWith('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: 'const x = 1;',
          language: 'javascript',
          results,
        }),
      });
    });

    it('returns snippet ID on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'xyz789' }),
      });

      const result = await saveSnippet('const x = 1;', 'javascript', { mistakes: [], score: 10 });

      expect(result.id).toBe('xyz789');
    });

    it('saves snippet with mistakes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'def456' }),
      });

      const results = {
        mistakes: [
          {
            id: 1,
            name: 'var_usage',
            line: 1,
            column: 0,
            severity: 'info' as const,
            certainty: 'heuristic' as const,
            confidence: 0.45,
            scope: 'function' as const,
            message: 'Test',
            ast_facts: {},
            explanation: 'Test',
            fix: 'Test',
          },
        ],
        score: 9,
      };

      const result = await saveSnippet('var x = 1;', 'javascript', results);

      expect(result.id).toBe('def456');
      expect(mockFetch).toHaveBeenCalledWith('/api/save', expect.objectContaining({
        body: expect.stringContaining('var_usage'),
      }));
    });

    it('throws on save failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Save failed' }),
      });

      await expect(
        saveSnippet('const x = 1;', 'javascript', { mistakes: [], score: 10 })
      ).rejects.toThrow();
    });
  });

  describe('getSnippet', () => {
    it('fetches snippet by ID', async () => {
      const mockSnippet = {
        id: 'abc123',
        code: 'const x = 1;',
        language: 'javascript',
        results: { mistakes: [], score: 10 },
        created_at: '2024-01-01T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSnippet),
      });

      const result = await getSnippet('abc123');

      expect(mockFetch).toHaveBeenCalledWith('/api/snippet/abc123');
      expect(result.id).toBe('abc123');
      expect(result.code).toBe('const x = 1;');
      expect(result.language).toBe('javascript');
    });

    it('throws on 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      await expect(getSnippet('nonexistent')).rejects.toThrow(/not found/i);
    });

    it('handles various ID formats', async () => {
      const ids = ['abc123', 'XyZ-789', 'test_id_123'];

      for (const id of ids) {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id, code: '', language: 'javascript', results: { mistakes: [], score: 10 } }),
        });

        await getSnippet(id);

        expect(mockFetch).toHaveBeenLastCalledWith(`/api/snippet/${id}`);
      }
    });
  });

  describe('Error handling', () => {
    it('preserves error message from server', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Specific error message' }),
      });

      try {
        await analyzeCode('const x = 1;', 'javascript');
        fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Specific error message');
      }
    });

    it('handles timeout errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Request timeout'));

      await expect(analyzeCode('const x = 1;', 'javascript')).rejects.toThrow('Request timeout');
    });
  });
});
