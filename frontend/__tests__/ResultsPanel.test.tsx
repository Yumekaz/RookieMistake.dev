import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
      expect(screen.getByText('10/10')).toBeInTheDocument();
    });

    it('displays zero score correctly', () => {
      const mistakes = Array(10).fill(null).map((_, i) => createMistake({ id: i }));
      render(<ResultsPanel mistakes={mistakes} score={0} />);
      expect(screen.getByText('0/10')).toBeInTheDocument();
    });

    it('applies correct CSS class for high score (8-10)', () => {
      render(<ResultsPanel mistakes={[]} score={9} />);
      const scoreElement = screen.getByText('9/10');
      expect(scoreElement.className).toMatch(/score-high|green|success/i);
    });

    it('applies correct CSS class for medium score (5-7)', () => {
      const mistakes = Array(4).fill(null).map((_, i) => createMistake({ id: i }));
      render(<ResultsPanel mistakes={mistakes} score={6} />);
      const scoreElement = screen.getByText('6/10');
      expect(scoreElement.className).toMatch(/score-medium|yellow|warning/i);
    });

    it('applies correct CSS class for low score (0-4)', () => {
      const mistakes = Array(8).fill(null).map((_, i) => createMistake({ id: i }));
      render(<ResultsPanel mistakes={mistakes} score={2} />);
      const scoreElement = screen.getByText('2/10');
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
      });

      render(<ResultsPanel mistakes={[mistake]} score={9} />);

      expect(screen.getByText("Use '===' instead of '=='")).toBeInTheDocument();
      expect(screen.getByText(/Line 5/)).toBeInTheDocument();
      expect(screen.getByText(/Col(umn)? 10/i)).toBeInTheDocument();
      expect(screen.getByText('double_equals')).toBeInTheDocument();
      expect(screen.getByText(/Type coercion can cause bugs/)).toBeInTheDocument();
      expect(screen.getByText(/Replace == with ===/)).toBeInTheDocument();
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

  describe('Severity Badges', () => {
    it('displays ERROR severity badge', () => {
      const mistake = createMistake({ severity: 'error' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getByText(/ERROR/i)).toBeInTheDocument();
    });

    it('displays WARNING severity badge', () => {
      const mistake = createMistake({ severity: 'warning' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getByText(/WARNING/i)).toBeInTheDocument();
    });

    it('displays INFO severity badge', () => {
      const mistake = createMistake({ severity: 'info' });
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      expect(screen.getByText(/INFO/i)).toBeInTheDocument();
    });

    it('applies correct styling to severity badges', () => {
      const mistakes = [
        createMistake({ id: 1, severity: 'error' }),
        createMistake({ id: 2, severity: 'warning' }),
        createMistake({ id: 3, severity: 'info' }),
      ];

      render(<ResultsPanel mistakes={mistakes} score={7} />);

      const errorBadge = screen.getByText(/ERROR/i);
      const warningBadge = screen.getByText(/WARNING/i);
      const infoBadge = screen.getByText(/INFO/i);

      expect(errorBadge.className).toMatch(/error|red|danger/i);
      expect(warningBadge.className).toMatch(/warning|yellow|orange/i);
      expect(infoBadge.className).toMatch(/info|blue|gray/i);
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
      expect(screen.getByText('10/10')).toBeVisible();
    });

    it('mistake cards are keyboard accessible', () => {
      const mistake = createMistake();
      render(<ResultsPanel mistakes={[mistake]} score={9} />);
      
      // Content should be in the document and accessible
      expect(screen.getByText('Test message')).toBeVisible();
    });
  });
});
