import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectAnalysisWorkspace from '../src/components/ProjectAnalysisWorkspace';
import { analyzeProject, submitFindingFeedback } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  ANALYSIS_PROFILES: [
    { value: 'balanced', label: 'Balanced', description: 'Default weighting.' },
    { value: 'focused', label: 'Focused', description: 'Filters lower-signal notes.' },
    { value: 'strict', label: 'Strict', description: 'Penalizes harder.' },
  ],
  analyzeProject: jest.fn(),
  submitFindingFeedback: jest.fn(),
}));

const mockedAnalyzeProject = analyzeProject as jest.MockedFunction<typeof analyzeProject>;
const mockedSubmitFindingFeedback = submitFindingFeedback as jest.MockedFunction<typeof submitFindingFeedback>;

describe('ProjectAnalysisWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(
      'rookie-mistakes.project-workspace',
      JSON.stringify({
        files: [
          {
            id: 'file-1',
            path: 'src/app.ts',
            language: 'typescript',
            code: 'const a = 1;',
          },
          {
            id: 'file-2',
            path: 'src/service.ts',
            language: 'typescript',
            code: 'console.log("hi");',
          },
        ],
        profile: 'balanced',
        activeFileId: 'file-1',
      })
    );
    mockedSubmitFindingFeedback.mockResolvedValue({
      accepted: true,
      source: 'local',
      verdict: 'good_catch',
      recordedAt: new Date().toISOString(),
    });
  });

  it('runs a project analysis and lets the user send feedback on a finding', async () => {
    mockedAnalyzeProject.mockResolvedValueOnce({
      analysisId: 'analysis-1',
      profile: 'balanced',
      source: 'local',
      summary: {
        profile: 'balanced',
        score: 7,
        averageFileScore: 8.5,
        fileCount: 2,
        filesWithFindings: 1,
        parseErrorCount: 0,
        findingCount: 1,
        severityCounts: {
          error: 0,
          warning: 0,
          info: 1,
        },
      },
      files: [
        {
          path: 'src/app.ts',
          language: 'typescript',
          lineCount: 1,
          score: 10,
          findingCount: 0,
          findings: [],
          status: 'ok',
        },
        {
          path: 'src/service.ts',
          language: 'typescript',
          lineCount: 1,
          score: 7,
          findingCount: 1,
          findings: [
            {
              id: 8,
              findingId: 'finding-1',
              filePath: 'src/service.ts',
              language: 'typescript',
              name: 'console_log_left',
              line: 1,
              column: 1,
              severity: 'info',
              certainty: 'heuristic',
              confidence: 0.82,
              scope: 'function',
              message: 'Remove console.log',
              ast_facts: {},
              explanation: 'Debug output is usually temporary.',
              fix: 'Remove the log line.',
            },
          ],
          status: 'ok',
        },
      ],
      findings: [
        {
          id: 8,
          findingId: 'finding-1',
          filePath: 'src/service.ts',
          language: 'typescript',
          name: 'console_log_left',
          line: 1,
          column: 1,
          severity: 'info',
          certainty: 'heuristic',
          confidence: 0.82,
          scope: 'function',
          message: 'Remove console.log',
          ast_facts: {},
          explanation: 'Debug output is usually temporary.',
          fix: 'Remove the log line.',
        },
      ],
    });

    render(<ProjectAnalysisWorkspace />);

    fireEvent.click(screen.getByRole('button', { name: /analyze project/i }));

    const goodCatchButton = await screen.findByRole('button', { name: /good catch/i });
    fireEvent.click(goodCatchButton);

    await waitFor(() => {
      expect(mockedSubmitFindingFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: 'analysis-1',
          verdict: 'good_catch',
          filePath: 'src/service.ts',
        })
      );
    });
  });
});
