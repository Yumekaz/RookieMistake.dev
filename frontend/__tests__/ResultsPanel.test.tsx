import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ResultsPanel from '../src/components/ResultsPanel';
import type { Mistake } from '../src/lib/api';

describe('ResultsPanel Component', () => {
  const createMistake = (overrides: Partial<Mistake> = {}): Mistake => ({
    id: 1,
    name: 'test_mistake',
    line: 1,
    column: 0,
    severity: 'warning',
    certainty: 'possible',
    confidence: 0.6,
    scope: 'function',
    message: 'Test message',
    ast_facts: {},
    explanation: 'Test explanation',
    fix: 'Test fix',
    ...overrides,
  });

  describe('Score Display', () => {
    it('displays perfect score correctly', () => {
      render(<ResultsPanel mistakes={[]} score={10} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('Excellent')).toBeInTheDocument();
    });

    it('displays zero score correctly', () => {
      const mistakes = Array(10).fill(null).map((_, i) => createMistake({ id: i }));
      render(<ResultsPanel mistakes={mistakes} score={0} />);
      expect(screen.getAllByText('0').length).toBeGreaterThan(0);
      expect(screen.getByText('Needs Work')).toBeInTheDocument();
    });

    it('applies correct CSS class for high score (8-10)', () => {
      render(<ResultsPanel mistakes={[]} score={9} />);
      const scoreElement = screen.getByText('9');
      expect(scoreElement.className).toMatch(/score-high|green|success/i);
    });

    it('applies correct CSS class for medium score (5-7)', () => {
      const mistakes = Array(4).fill(null).map((_, i) => createMistake({ id: i }));
      render(<ResultsPanel mistakes={mistakes} score={6} />);
      const scoreElement = screen.getByText('6');
      expect(scoreElement.className).toMatch(/score-medium|amber|orange|warning/i);
    });

    it('applies correct CSS class for low score (0-4)', () => {
      const mistakes = Array(8).fill(null).map((_, i) => createMistake({ id: i }));
      render(<ResultsPanel mistakes={mistakes} score={2} />);
      const scoreElement = screen.getByText('2');
      expect(scoreElement.className).toMatch(/score-low|red|error|danger/i);
    });
  });

  describe('Empty State', () => {
    it('shows success message when no mistakes', () => {
      render(<ResultsPanel mistakes={[]} score={10} />);
      expect(screen.getByText('Great job!')).toBeInTheDocument();
    });

    it('does not show mistake cards when empty', () => {
      render(<ResultsPanel mistakes={[]} score={10} />);
      expect(screen.queryByText('Line')).not.toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<ResultsPanel mistakes={[]} score={0} isLoading={true} />);
      expect(screen.getByText(/analyzing|loading/i)).toBeInTheDocument();
    });

    it('hides results when loading', () => {
      render(<ResultsPanel mistakes={[createMistake()]} score={9} isLoading={true} />);
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
  });

  describe('Mistake Cards', () => {
    it('renders mistake with all required information', () => {
      const mistake = createMistake({
        name: 'double_equals',
        line: 5,
        column: 10,
        severity: 'warning',
        message: "Use '===' instead of '=='",
        explanation: 'Type coercion can cause bugs',
        fix: 'Replace == with ===',
        codeExample: '// Use === instead of ==',
      });

      render(<ResultsPanel mistakes={[mistake]} score={9} />);

      expect(screen.getByText("Use '===' instead of '=='")).toBeInTheDocument();
      expect(screen.getByText(/Line 5/)).toBeInTheDocument();
      expect(screen.getByText(/Col(umn)? 10/i)).toBeInTheDocument();
      expect(screen.getByText('double_equals')).toBeInTheDocument();
      expect(screen.getByText(/Type coercion can cause bugs/)).toBeInTheDocument();
      expect(screen.getByText(/Suggested Fix/i)).toBeInTheDocument();
      expect(screen.getByText(/Replace == with ===/)).toBeInTheDocument();
      expect(screen.getByText(/Example/i)).toBeInTheDocument();
    });

    it('renders multiple mistakes', () => {
      const mistakes = [
        createMistake({ id: 1, name: 'mistake_1', message: 'First mistake' }),
        createMistake({ id: 2, name: 'mistake_2', message: 'Second mistake' }),
        createMistake({ id: 3, name: 'mistake_3', message: 'Third mistake' }),
      ];

      render(<ResultsPanel mistakes={mistakes} score={7} />);

      expect(screen.getByText('First mistake')).toBeInTheDocument();
      expect(screen.getByText('Second mistake')).toBeInTheDocument();
      expect(screen.getByText('Third mistake')).toBeInTheDocument();
    });

    it('shows correct issue count with proper grammar', () => {
      render(<ResultsPanel mistakes={[createMistake()]} score={9} />);
      expect(screen.getByText(/1 issue/)).toBeInTheDocument();

      const { rerender } = render(<ResultsPanel mistakes={[]} score={10} />);
      
      rerender(<ResultsPanel mistakes={[createMistake({ id: 1 }), createMistake({ id: 2 })]} score={8} />);
      expect(screen.getByText(/2 issues/)).toBeInTheDocument();
    });
  });

  describe('Grouping and Actions', () => {
    it('groups mistakes by severity in priority order', () => {
      const mistakes = [
        createMistake({ id: 1, severity: 'info', message: 'Info issue' }),
        createMistake({ id: 2, severity: 'error', message: 'Error issue' }),
        createMistake({ id: 3, severity: 'warning', message: 'Warning issue' }),
      ];

      render(<ResultsPanel mistakes={mistakes} score={4} />);

      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings[0]).toHaveTextContent(/Errors/i);
      expect(headings[1]).toHaveTextContent(/Warnings/i);
      expect(headings[2]).toHaveTextContent(/Notes/i);
    });

    it('jumps to the selected mistake when the Jump action is used', () => {
      const onSelectMistake = jest.fn();
      const mistake = createMistake({ line: 12, message: 'Jump target' });

      render(
        <ResultsPanel
          mistakes={[mistake]}
          score={7}
          onSelectMistake={onSelectMistake}
          selectedMistakeId={mistake.id}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /jump/i }));
      expect(onSelectMistake).toHaveBeenCalledWith(mistake);
    });

    it('copies the suggested fix text', async () => {
      const writeText = jest.fn().mockResolvedValue(undefined);
      Object.defineProperty(window.navigator, 'clipboard', {
        value: { writeText },
        configurable: true,
      });

      const mistake = createMistake({ fix: 'Replace x with y' });
      render(<ResultsPanel mistakes={[mistake]} score={6} />);

      fireEvent.click(screen.getByRole('button', { name: /copy fix/i }));
      await waitFor(() => expect(writeText).toHaveBeenCalledWith('Replace x with y'));
    });

    it('records inline feedback for a finding', async () => {
      const onFeedback = jest.fn().mockResolvedValue(undefined);
      const mistake = createMistake({ name: 'feedback_target', message: 'Feedback target' });

      render(<ResultsPanel mistakes={[mistake]} score={8} onFeedback={onFeedback} />);

      fireEvent.click(screen.getByRole('button', { name: /good catch/i }));

      await waitFor(() => expect(onFeedback).toHaveBeenCalledWith(mistake, 'good_catch'));
      expect(screen.getByText(/Marked as good catch/i)).toBeInTheDocument();
    });
  });

  describe('Severity Badges', () => {
    it('displays ERROR severity badge', () => {
      const mistake = createMistake({ severity: 'error' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getAllByText(/^Error$/i)[0]).toBeInTheDocument();
    });

    it('displays WARNING severity badge', () => {
      const mistake = createMistake({ severity: 'warning' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getAllByText(/^Warning$/i)[0]).toBeInTheDocument();
    });

    it('displays INFO severity badge', () => {
      const mistake = createMistake({ severity: 'info' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getAllByText(/^Info$/i)[0]).toBeInTheDocument();
    });

    it('applies correct styling to severity badges', () => {
      const mistakes = [
        createMistake({ id: 1, severity: 'error' }),
        createMistake({ id: 2, severity: 'warning' }),
        createMistake({ id: 3, severity: 'info' }),
      ];

      render(<ResultsPanel mistakes={mistakes} score={7} />);

      const errorBadge = screen.getAllByText(/^Error$/i)[0];
      const warningBadge = screen.getAllByText(/^Warning$/i)[0];
      const infoBadge = screen.getAllByText(/^Info$/i)[0];

      expect(errorBadge.className).toMatch(/error|red|danger|gh-error/i);
      expect(warningBadge.className).toMatch(/warning|yellow|orange|amber|gh-warning/i);
      expect(infoBadge.className).toMatch(/info|blue|accent|gh-accent/i);
    });
  });

  describe('Certainty Badges', () => {
    it('displays DEFINITE certainty badge', () => {
      const mistake = createMistake({ certainty: 'definite' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getByText(/DEFINITE/i)).toBeInTheDocument();
    });

    it('displays POSSIBLE certainty badge', () => {
      const mistake = createMistake({ certainty: 'possible' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getByText(/POSSIBLE/i)).toBeInTheDocument();
    });

    it('displays HEURISTIC certainty badge', () => {
      const mistake = createMistake({ certainty: 'heuristic' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getByText(/HEURISTIC/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has accessible score display', () => {
      render(<ResultsPanel mistakes={[]} score={10} />);
      // Score should be visible to screen readers
      expect(screen.getByText('10')).toBeVisible();
    });

    it('mistake cards are keyboard accessible', () => {
      const mistake = createMistake();
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      
      // Content should be in the document and accessible
      expect(screen.getByText('Test message')).toBeVisible();
    });
  });
});
