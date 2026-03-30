import { buildDecorationDrafts, buildMarkerDrafts } from '../src/components/Editor';
import type { Mistake } from '../src/lib/api';

describe('Editor annotation helpers', () => {
  const createMistake = (overrides: Partial<Mistake> = {}): Mistake => ({
    id: 1,
    name: 'test_mistake',
    line: 4,
    column: 2,
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

  it('builds Monaco marker drafts with 1-based ranges', () => {
    const mistakes = [createMistake({ line: 0, column: 0 })];

    const drafts = buildMarkerDrafts(mistakes);

    expect(drafts).toHaveLength(1);
    expect(drafts[0].range.startLineNumber).toBe(1);
    expect(drafts[0].range.startColumn).toBe(1);
    expect(drafts[0].range.endColumn).toBe(2);
    expect(drafts[0].severity).toBe('warning');
  });

  it('marks the active finding with a stronger decoration class', () => {
    const mistake = createMistake({ id: 7, severity: 'error' });

    const drafts = buildDecorationDrafts([mistake], 7);

    expect(drafts).toHaveLength(1);
    expect(drafts[0].options.className).toContain('finding-highlight-error');
    expect(drafts[0].options.className).toContain('finding-highlight-active');
    expect(drafts[0].options.isWholeLine).toBe(true);
  });
});
