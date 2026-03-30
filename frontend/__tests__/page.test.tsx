import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HomePage from '../src/app/page';
import { analyzeCode, saveSnippet } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  analyzeCode: jest.fn(),
  saveSnippet: jest.fn(),
}));

const mockedAnalyzeCode = analyzeCode as jest.MockedFunction<typeof analyzeCode>;
const mockedSaveSnippet = saveSnippet as jest.MockedFunction<typeof saveSnippet>;

describe('HomePage share flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockClipboard(writeText = jest.fn().mockResolvedValue(undefined)) {
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    return writeText;
  }

  it('shows a truthful success state when clipboard copy succeeds', async () => {
    const writeText = mockClipboard();

    mockedAnalyzeCode.mockResolvedValueOnce({ mistakes: [], score: 10 });
    mockedSaveSnippet.mockResolvedValueOnce({ id: 'abc123' });

    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: /^Analyze$/i }));

    await screen.findByText('Great job!');

    fireEvent.click(screen.getByRole('button', { name: /^Share$/i }));

    await screen.findByText(/Link copied to clipboard!/i);
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/abc123`);
    expect(mockedSaveSnippet).toHaveBeenCalledTimes(1);
  });

  it('shows a warning when clipboard copy fails', async () => {
    const writeText = mockClipboard(jest.fn().mockRejectedValue(new Error('denied')));

    mockedAnalyzeCode.mockResolvedValueOnce({ mistakes: [], score: 10 });
    mockedSaveSnippet.mockResolvedValueOnce({ id: 'abc123' });

    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: /^Analyze$/i }));

    await screen.findByText('Great job!');

    fireEvent.click(screen.getByRole('button', { name: /^Share$/i }));

    await screen.findByText(/clipboard copy failed/i);
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/abc123`);
    expect(screen.queryByText(/Link copied to clipboard!/i)).not.toBeInTheDocument();
  });
});
