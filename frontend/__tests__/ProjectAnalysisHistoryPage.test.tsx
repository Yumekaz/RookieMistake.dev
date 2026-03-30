import React from 'react';
import { render, screen } from '@testing-library/react';
import ProjectAnalysisHistoryPage from '../src/components/ProjectAnalysisHistoryPage';
import {
  buildProjectAnalysisHref,
  buildProjectWorkspaceHref,
  getRecentProjectAnalyses,
} from '@/lib/api';

jest.mock('@/lib/api', () => ({
  buildProjectAnalysisHref: jest.fn((id: string) => `/project/${id}`),
  buildProjectWorkspaceHref: jest.fn((id: string) => `/project?analysisId=${id}`),
  getRecentProjectAnalyses: jest.fn(),
}));

const mockedGetRecentProjectAnalyses = getRecentProjectAnalyses as jest.MockedFunction<
  typeof getRecentProjectAnalyses
>;
const mockedBuildProjectAnalysisHref = buildProjectAnalysisHref as jest.MockedFunction<
  typeof buildProjectAnalysisHref
>;
const mockedBuildProjectWorkspaceHref = buildProjectWorkspaceHref as jest.MockedFunction<
  typeof buildProjectWorkspaceHref
>;

describe('ProjectAnalysisHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedBuildProjectAnalysisHref.mockImplementation((id) => `/project/${id}`);
    mockedBuildProjectWorkspaceHref.mockImplementation((id) => `/project?analysisId=${id}`);
  });

  it('renders saved project runs with open and reopen actions', async () => {
    mockedGetRecentProjectAnalyses.mockResolvedValueOnce({
      analyses: [
        {
          id: 'project-1',
          analysisId: 'analysis-1',
          title: 'src/app.ts - balanced',
          profile: 'balanced',
          source: 'local',
          score: 8.2,
          averageFileScore: 8.5,
          fileCount: 2,
          filesWithFindings: 1,
          findingCount: 1,
          parseErrorCount: 0,
          topSeverity: 'warning',
          feedbackSummary: {
            total: 1,
            goodCatch: 1,
            falsePositive: 0,
            pending: 0,
          },
          createdAt: '2026-03-30T10:00:00.000Z',
          updatedAt: '2026-03-30T10:00:01.000Z',
          filePaths: ['src/app.ts', 'src/service.ts'],
          topFindings: ['console_log_left'],
        },
      ],
      total: 1,
      source: 'local',
    });

    render(<ProjectAnalysisHistoryPage />);

    expect(await screen.findByText(/saved project runs/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open result/i })).toHaveAttribute('href', '/project/project-1');
    expect(screen.getByRole('link', { name: /reopen workspace/i })).toHaveAttribute(
      'href',
      '/project?analysisId=project-1'
    );
    expect(screen.getByText(/1 reviewed/i)).toBeInTheDocument();
    expect(screen.getByText(/console_log_left/i)).toBeInTheDocument();
  });
});
