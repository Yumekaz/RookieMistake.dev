'use client';

import type { Mistake, Severity } from '@/lib/api';

interface ResultsPanelProps {
  mistakes: Mistake[];
  score: number;
  isLoading?: boolean;
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const classes = {
    error: 'severity-error',
    warning: 'severity-warning',
    info: 'severity-info',
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${classes[severity]}`}
    >
      {severity.toUpperCase()}
    </span>
  );
}

function CertaintyBadge({ certainty }: { certainty: Mistake['certainty'] }) {
  const classes = {
    definite: 'border-red-400/60 text-red-200',
    possible: 'border-yellow-400/60 text-yellow-200',
    heuristic: 'border-blue-400/60 text-blue-200',
  };

  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium rounded border ${classes[certainty]}`}
    >
      {certainty.toUpperCase()}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const scoreClass =
    score >= 8 ? 'score-high' : score >= 5 ? 'score-medium' : 'score-low';

  return (
    <div className={`score-badge w-16 h-16 text-2xl ${scoreClass}`}>
      {score}/10
    </div>
  );
}

function MistakeCard({ mistake }: { mistake: Mistake }) {
  const confidencePct = Math.round(mistake.confidence * 100);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={mistake.severity} />
          <CertaintyBadge certainty={mistake.certainty} />
          <span className="text-sm text-gray-400">
            Line {mistake.line}, Col {mistake.column}
          </span>
        </div>
        <span className="text-xs text-gray-500 font-mono">
          {mistake.name}
        </span>
      </div>

      <p className="text-white font-medium">{mistake.message}</p>
      <div className="text-xs text-gray-400">
        {confidencePct}% confidence · {mistake.scope}
      </div>

      <div className="space-y-2">
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Explanation
          </h4>
          <p className="text-sm text-gray-300">{mistake.explanation}</p>
        </div>

        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
            Fix
          </h4>
          <p className="text-sm text-green-400 font-mono bg-gray-900/50 px-2 py-1 rounded">
            {mistake.fix}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ResultsPanel({
  mistakes,
  score,
  isLoading,
}: ResultsPanelProps) {
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
          <p className="text-gray-400">Analyzing code...</p>
        </div>
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-4">
        <ScoreBadge score={score} />
        <h3 className="text-xl font-semibold text-green-400 mt-4">
          Great job!
        </h3>
        <p className="text-gray-400 mt-2">
          No common mistakes detected in your code.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div>
          <h2 className="text-lg font-semibold text-white">
            {mistakes.length} issue{mistakes.length !== 1 ? 's' : ''} found
          </h2>
          <p className="text-sm text-gray-400">
            Common junior developer mistakes detected
          </p>
        </div>
        <ScoreBadge score={score} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mistakes.map((mistake, index) => (
          <MistakeCard key={`${mistake.name}-${mistake.line}-${index}`} mistake={mistake} />
        ))}
      </div>
    </div>
  );
}
