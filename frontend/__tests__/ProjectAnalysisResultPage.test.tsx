import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectAnalysisResultPage from '../src/components/ProjectAnalysisResultPage';
import {
  buildProjectAnalysisHref,
  buildProjectWorkspaceHref,
  getProjectAnalysisRecord,
  submitFindingFeedback,
  updateProjectAnalysisFeedbackRecord,
} from '@/lib/api';

jest.mock('@/lib/api', () => ({
  buildProjectAnalysisHref: jest.fn((id: string) => `/project/${id}`),
  buildProjectWorkspaceHref: jest.fn((id: string) => `/project?analysisId=${id}`),
  getProjectAnalysisRecord: jest.fn(),
  submitFindingFeedback: jest.fn(),
  summarizeProjectFeedback: jest.fn((feedbackByFindingId: Record<string, string>, findingCount: number) => ({
    total: Object.keys(feedbackByFindingId).length,
    goodCatch: Object.values(feedbackByFindingId).filter((value) => value === 'good_catch').length,
    falsePositive: Object.values(feedbackByFindingId).filter((value) => value === 'false_positive').length,
    pending: Math.max(0, findingCount - Object.keys(feedbackByFindingId).length),
  })),
  updateProjectAnalysisFeedbackRecord: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'project-1' }),
}));

const mockedGetProjectAnalysisRecord = getProjectAnalysisRecord as jest.MockedFunction<
  typeof getProjectAnalysisRecord
>;
const mockedSubmitFindingFeedback = submitFindingFeedback as jest.MockedFunction<typeof submitFindingFeedback>;
const mockedUpdateProjectAnalysisFeedbackRecord = updateProjectAnalysisFeedbackRecord as jest.MockedFunction<
  typeof updateProjectAnalysisFeedbackRecord
>;
const mockedBuildProjectAnalysisHref = buildProjectAnalysisHref as jest.MockedFunction<
  typeof buildProjectAnalysisHref
>;
const mockedBuildProjectWorkspaceHref = buildProjectWorkspaceHref as jest.MockedFunction<
  typeof buildProjectWorkspaceHref
>;

describe('ProjectAnalysisResultPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBuildProjectAnalysisHref.mockImplementation((id) => `/project/${id}`);
    mockedBuildProjectWorkspaceHref.mockImplementation((id) => `/project?analysisId=${id}`);
    mockedSubmitFindingFeedback.mockResolvedValue({
      accepted: true,
      source: 'local',
      verdict: 'good_catch',
      recordedAt: new Date().toISOString(),
    });
  });

  it('loads a saved project result and exposes reopen actions', async () => {
    mockedGetProjectAnalysisRecord.mockResolvedValueOnce({
      analysisId: 'analysis-1',
      createdAt: '2026-03-30T10:00:00.000Z',
      updatedAt: '2026-03-30T10:00:00.000Z',
      id: 'project-1',
      title: 'src/app.ts - balanced',
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
      filesInput: [
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
      feedbackByFindingId: {},
      feedbackSummary: {
        total: 0,
        goodCatch: 0,
        falsePositive: 0,
        pending: 1,
      },
    } as any);

    render(<ProjectAnalysisResultPage />);

    expect(await screen.findByText(/src\/app.ts - balanced/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reopen workspace/i })).toHaveAttribute(
      'href',
      '/project?analysisId=project-1'
    );
    await screen.findByText(/0 reviewed/i);

    const goodCatchButton = await screen.findByRole('button', { name: /good catch/i });
    fireEvent.click(goodCatchButton);

    await waitFor(() => {
      expect(mockedSubmitFindingFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: 'analysis-1',
          filePath: 'src/service.ts',
        })
      );
      expect(mockedUpdateProjectAnalysisFeedbackRecord).toHaveBeenCalledWith('project-1', 'finding-1', 'good_catch');
    });

    expect(screen.getByText(/marked console_log_left as a good catch/i)).toBeInTheDocument();
  });
});
