import {
  analyzeCode,
  analyzeProject,
  compareProjectAnalyses,
  getProjectAnalysisRecord,
  getProjectFeedbackSummary,
  getRecentProjectAnalyses,
  getSnippet,
  saveSnippet,
  submitFindingFeedback,
  ApiError,
  type Mistake,
} from '../src/lib/api';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('API Client', () => {
  beforeEach(() => {
    mockFetch.mockReset();
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

  describe('analyzeProject', () => {
    it('falls back to local multi-file analysis when the project endpoint is missing', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ mistakes: [], score: 10 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            mistakes: [
              {
                id: 2,
                name: 'console_log_left',
                line: 3,
                column: 1,
                severity: 'info',
                certainty: 'heuristic',
                confidence: 0.55,
                scope: 'function',
                message: 'Remove console.log',
                ast_facts: {},
                explanation: 'Debug logging was left behind',
                fix: 'Remove the call',
              },
            ],
            score: 9,
          }),
        });

      const result = await analyzeProject({
        profile: 'balanced',
        files: [
          { id: 'one', path: 'src/one.ts', language: 'typescript', code: 'const one = 1;' },
          { id: 'two', path: 'src/two.ts', language: 'typescript', code: 'console.log(two);' },
        ],
      });

      expect(mockFetch).toHaveBeenCalledTimes(3);
      expect(result.source).toBe('local');
      expect(result.files).toHaveLength(2);
      expect(result.summary.fileCount).toBe(2);
      expect(result.summary.findingCount).toBe(1);
      expect(result.summary.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('project analysis history and result APIs', () => {
    it('maps recent project analyses into UI-friendly history entries', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            analyses: [
              {
                id: 'analysis-1',
                profile: 'balanced',
                score: 8.4,
                averageFileScore: 8.8,
                fileCount: 2,
                filesWithFindings: 1,
                parseErrorCount: 0,
                findingCount: 1,
                created_at: '2026-03-30T10:00:00.000Z',
                topSeverity: 'warning',
                topFiles: ['src/app.ts', 'src/service.ts'],
                topFindings: ['src/service.ts: console_log_left'],
              },
            ],
            total: 1,
          }),
      });

      const result = await getRecentProjectAnalyses(5);

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/projects/recent?limit=5');
      expect(result.analyses[0]).toEqual(
        expect.objectContaining({
          analysisId: 'analysis-1',
          title: 'src/app.ts + 1 more - balanced',
          filePaths: ['src/app.ts', 'src/service.ts'],
          topSeverity: 'warning',
        })
      );
    });

    it('normalizes a saved backend project analysis record', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            analysisId: 'analysis-2',
            profile: 'strict',
            summary: {
              profile: 'strict',
              score: 7.6,
              averageFileScore: 8.1,
              fileCount: 1,
              filesWithFindings: 1,
              parseErrorCount: 0,
              findingCount: 1,
              severityCounts: {
                error: 0,
                warning: 1,
                info: 0,
              },
            },
            files: [
              {
                path: 'src/app.ts',
                language: 'typescript',
                lineCount: 12,
                score: 7.6,
                findingCount: 1,
                findings: [
                  {
                    id: 1,
                    findingId: 'finding-1',
                    filePath: 'src/app.ts',
                    language: 'typescript',
                    name: 'awaited_fetch',
                    line: 3,
                    column: 1,
                    severity: 'warning',
                    certainty: 'possible',
                    confidence: 0.8,
                    scope: 'function',
                    message: 'Await the fetch promise.',
                    ast_facts: {},
                    explanation: 'Promises should be awaited before use.',
                    fix: 'Add await before the call.',
                  },
                ],
                status: 'ok',
              },
            ],
            findings: [
              {
                id: 1,
                findingId: 'finding-1',
                filePath: 'src/app.ts',
                language: 'typescript',
                name: 'awaited_fetch',
                line: 3,
                column: 1,
                severity: 'warning',
                certainty: 'possible',
                confidence: 0.8,
                scope: 'function',
                message: 'Await the fetch promise.',
                ast_facts: {},
                explanation: 'Promises should be awaited before use.',
                fix: 'Add await before the call.',
              },
            ],
            request: {
              profile: 'strict',
              files: [
                {
                  path: 'src/app.ts',
                  language: 'typescript',
                  code: 'const response = fetch("/api");',
                },
              ],
            },
            created_at: '2026-03-30T11:00:00.000Z',
          }),
      });

      const result = await getProjectAnalysisRecord('analysis-2');

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/projects/analysis-2');
      expect(result).toEqual(
        expect.objectContaining({
          id: 'analysis-2',
          analysisId: 'analysis-2',
          title: 'src/app.ts - strict',
        })
      );
      expect(result?.filesInput[0]).toEqual(
        expect.objectContaining({
          path: 'src/app.ts',
          code: 'const response = fetch("/api");',
        })
      );
    });

    it('maps project comparison and feedback summary responses', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              baseline: {
                id: 'analysis-1',
                profile: 'balanced',
                score: 6.8,
                averageFileScore: 7.4,
                fileCount: 1,
                filesWithFindings: 1,
                parseErrorCount: 0,
                findingCount: 2,
                created_at: '2026-03-30T10:00:00.000Z',
                topSeverity: 'warning',
                topFiles: ['src/app.ts'],
                topFindings: ['src/app.ts: awaited_fetch'],
              },
              candidate: {
                id: 'analysis-2',
                profile: 'balanced',
                score: 8.9,
                averageFileScore: 8.9,
                fileCount: 1,
                filesWithFindings: 0,
                parseErrorCount: 0,
                findingCount: 0,
                created_at: '2026-03-30T10:05:00.000Z',
                topSeverity: 'none',
                topFiles: ['src/app.ts'],
                topFindings: [],
              },
              summary: {
                scoreDelta: 2.1,
                findingDelta: -2,
                fileDelta: 0,
                parseErrorDelta: 0,
                persistedFindings: [],
                newFindings: [],
                resolvedFindings: ['src/app.ts: awaited_fetch'],
              },
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              analysisId: 'analysis-2',
              summary: {
                analysisId: 'analysis-2',
                totalFindings: 2,
                reviewedFindings: 1,
                unreviewedFindings: 1,
                goodCatchCount: 1,
                falsePositiveCount: 0,
                latestFeedback: {
                  id: 'feedback-1',
                  analysisId: 'analysis-2',
                  findingId: 'finding-1',
                  status: 'good_catch',
                  note: 'Correct callout',
                  created_at: '2026-03-30T10:06:00.000Z',
                  updated_at: '2026-03-30T10:06:00.000Z',
                },
                feedback: [
                  {
                    id: 'feedback-1',
                    analysisId: 'analysis-2',
                    findingId: 'finding-1',
                    status: 'good_catch',
                    note: 'Correct callout',
                    created_at: '2026-03-30T10:06:00.000Z',
                    updated_at: '2026-03-30T10:06:00.000Z',
                  },
                ],
              },
            }),
        });

      const comparison = await compareProjectAnalyses('analysis-1', 'analysis-2');
      const feedback = await getProjectFeedbackSummary('analysis-2');

      expect(comparison.summary.scoreDelta).toBe(2.1);
      expect(comparison.baseline.title).toBe('src/app.ts - balanced');
      expect(feedback.summary.latestFeedback?.note).toBe('Correct callout');
      expect(feedback.summary.goodCatchCount).toBe(1);
    });
  });

  describe('submitFindingFeedback', () => {
    it('falls back locally when the feedback route is missing', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });

      const result = await submitFindingFeedback({
        verdict: 'good_catch',
        language: 'typescript',
        filePath: 'src/app.ts',
        finding: {
          id: 1,
          name: 'test_mistake',
          line: 1,
          column: 0,
          severity: 'warning',
          certainty: 'possible',
          confidence: 0.5,
          scope: 'function',
          message: 'Test',
          ast_facts: {},
          explanation: 'Test',
          fix: 'Test',
        },
      });

      expect(result.source).toBe('local');
      expect(result.accepted).toBe(true);
      expect(result.verdict).toBe('good_catch');
      expect(mockFetch).not.toHaveBeenCalled();
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
