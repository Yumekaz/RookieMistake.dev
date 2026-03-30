import {
  getProjectAnalysisHistory,
  persistProjectAnalysisRecord,
  updateProjectAnalysisFeedbackRecord,
} from '@/lib/api';

describe('project history storage helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists saved project runs and feedback summaries in local storage', () => {
    const record = persistProjectAnalysisRecord(
      {
        analysisId: 'analysis-1',
        profile: 'balanced',
        source: 'local',
        summary: {
          profile: 'balanced',
          score: 8,
          averageFileScore: 8,
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
            lineCount: 10,
            score: 8,
            findingCount: 1,
            findings: [
              {
                id: 1,
                findingId: 'finding-1',
                filePath: 'src/app.ts',
                language: 'typescript',
                name: 'awaited_fetch',
                line: 3,
                column: 3,
                severity: 'warning',
                certainty: 'possible',
                confidence: 0.8,
                scope: 'function',
                message: 'Await the fetch promise.',
                ast_facts: {},
                explanation: 'Promises should be awaited before their value is used.',
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
            column: 3,
            severity: 'warning',
            certainty: 'possible',
            confidence: 0.8,
            scope: 'function',
            message: 'Await the fetch promise.',
            ast_facts: {},
            explanation: 'Promises should be awaited before their value is used.',
            fix: 'Add await before the call.',
          },
        ],
      },
      [
        {
          id: 'file-1',
          path: 'src/app.ts',
          language: 'typescript',
          code: 'const response = fetch("/api");',
        },
      ]
    );

    const initialHistory = getProjectAnalysisHistory(10);
    expect(initialHistory.total).toBe(1);
    expect(initialHistory.analyses[0].feedbackSummary.pending).toBe(1);
    expect(record.id).toBe(initialHistory.analyses[0].id);

    const updated = updateProjectAnalysisFeedbackRecord(record.id, 'finding-1', 'good_catch');
    expect(updated?.feedbackSummary).toEqual({
      total: 1,
      goodCatch: 1,
      falsePositive: 0,
      pending: 0,
    });

    const refreshedHistory = getProjectAnalysisHistory(10);
    expect(refreshedHistory.analyses[0].feedbackSummary.goodCatch).toBe(1);
    expect(refreshedHistory.analyses[0].feedbackSummary.pending).toBe(0);
  });
});
