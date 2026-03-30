import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ProjectAnalysisWorkspace from '../src/components/ProjectAnalysisWorkspace';
import {
  analyzeProject,
  buildProjectAnalysisHref,
  buildProjectWorkspaceHref,
  getRecentProjectAnalyses,
  persistProjectAnalysisRecord,
  submitFindingFeedback,
  updateProjectAnalysisFeedbackRecord,
} from '@/lib/api';

jest.mock('@/lib/api', () => ({
  ANALYSIS_PROFILES: [
    { value: 'balanced', label: 'Balanced', description: 'Default weighting.' },
    { value: 'focused', label: 'Focused', description: 'Filters lower-signal notes.' },
    { value: 'strict', label: 'Strict', description: 'Penalizes harder.' },
  ],
  analyzeProject: jest.fn(),
  buildProjectAnalysisHref: jest.fn((id: string) => `/project/${id}`),
  buildProjectWorkspaceHref: jest.fn((id: string) => `/project?analysisId=${id}`),
  getRecentProjectAnalyses: jest.fn(),
  persistProjectAnalysisRecord: jest.fn(),
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
  useSearchParams: () => new URLSearchParams(''),
}));

const mockedAnalyzeProject = analyzeProject as jest.MockedFunction<typeof analyzeProject>;
const mockedBuildProjectAnalysisHref = buildProjectAnalysisHref as jest.MockedFunction<
  typeof buildProjectAnalysisHref
>;
const mockedBuildProjectWorkspaceHref = buildProjectWorkspaceHref as jest.MockedFunction<
  typeof buildProjectWorkspaceHref
>;
const mockedGetRecentProjectAnalyses = getRecentProjectAnalyses as jest.MockedFunction<
  typeof getRecentProjectAnalyses
>;
const mockedPersistProjectAnalysisRecord = persistProjectAnalysisRecord as jest.MockedFunction<
  typeof persistProjectAnalysisRecord
>;
const mockedSubmitFindingFeedback = submitFindingFeedback as jest.MockedFunction<typeof submitFindingFeedback>;
const mockedUpdateProjectAnalysisFeedbackRecord = updateProjectAnalysisFeedbackRecord as jest.MockedFunction<
  typeof updateProjectAnalysisFeedbackRecord
>;

const baseRecord = {
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
      status: 'ok' as const,
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
          severity: 'info' as const,
          certainty: 'heuristic' as const,
          confidence: 0.82,
          scope: 'function' as const,
          message: 'Remove console.log',
          ast_facts: {},
          explanation: 'Debug output is usually temporary.',
          fix: 'Remove the log line.',
        },
      ],
      status: 'ok' as const,
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
      severity: 'info' as const,
      certainty: 'heuristic' as const,
      confidence: 0.82,
      scope: 'function' as const,
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
};

const updatedRecord = {
  ...baseRecord,
  updatedAt: '2026-03-30T10:00:01.000Z',
  feedbackByFindingId: {
    'finding-1': 'good_catch',
  },
  feedbackSummary: {
    total: 1,
    goodCatch: 1,
    falsePositive: 0,
    pending: 0,
  },
};

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
    mockedBuildProjectAnalysisHref.mockImplementation((id) => `/project/${id}`);
    mockedBuildProjectWorkspaceHref.mockImplementation((id) => `/project?analysisId=${id}`);
    mockedGetRecentProjectAnalyses.mockResolvedValue({ analyses: [], total: 0, source: 'local' });
    mockedSubmitFindingFeedback.mockResolvedValue({
      accepted: true,
      source: 'local',
      verdict: 'good_catch',
      recordedAt: new Date().toISOString(),
    });
    mockedPersistProjectAnalysisRecord.mockReturnValue(baseRecord as any);
    mockedUpdateProjectAnalysisFeedbackRecord.mockReturnValue(updatedRecord as any);
  });

  it('runs a project analysis, saves it, and records feedback on the saved run', async () => {
    mockedAnalyzeProject.mockResolvedValueOnce({
      analysisId: 'analysis-1',
      profile: 'balanced',
      source: 'local',
      summary: baseRecord.summary,
      files: baseRecord.files,
      findings: baseRecord.findings,
    } as any);

    render(<ProjectAnalysisWorkspace />);

    fireEvent.click(screen.getByRole('button', { name: /analyze project/i }));

    const goodCatchButton = await screen.findByRole('button', { name: /good catch/i });
    expect(screen.getByRole('link', { name: /open saved result/i })).toHaveAttribute('href', '/project/analysis-1');
    await screen.findByText(/0 reviewed/i);

    fireEvent.click(goodCatchButton);

    await waitFor(() => {
      expect(mockedSubmitFindingFeedback).toHaveBeenCalledWith(
        expect.objectContaining({
          analysisId: 'analysis-1',
          verdict: 'good_catch',
          filePath: 'src/service.ts',
        })
      );
      expect(mockedPersistProjectAnalysisRecord).toHaveBeenCalledWith(
        expect.objectContaining({ analysisId: 'analysis-1' }),
        expect.any(Array)
      );
      expect(mockedUpdateProjectAnalysisFeedbackRecord).toHaveBeenCalledWith('project-1', 'finding-1', 'good_catch');
      expect(screen.getByText(/1 reviewed/i)).toBeInTheDocument();
    });
  });
});
