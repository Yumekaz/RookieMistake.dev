'use client';

import type { Mistake, Severity } from '@/lib/api';

interface ResultsPanelProps {
  mistakes: Mistake[];
  score: number;
  isLoading?: boolean;
}

// Icons
const ErrorIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const WarningIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const LightbulbIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const CodeIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function SeverityBadge({ severity }: { severity: Severity }) {
  const config = {
    error: {
      icon: <ErrorIcon />,
      className: 'bg-gh-error/15 text-gh-error border-gh-error/30',
      label: 'Error',
    },
    warning: {
      icon: <WarningIcon />,
      className: 'bg-gh-warning/15 text-gh-warning border-gh-warning/30',
      label: 'Warning',
    },
    info: {
      icon: <InfoIcon />,
      className: 'bg-gh-accent/15 text-gh-accent border-gh-accent/30',
      label: 'Info',
    },
  };

  const { icon, className, label } = config[severity];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border ${className}`}>
      {icon}
      {label}
    </span>
  );
}

function CertaintyBadge({ certainty }: { certainty: Mistake['certainty'] }) {
  const config = {
    definite: 'bg-red-500/10 text-red-400 border-red-500/20',
    possible: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    heuristic: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded border ${config[certainty]}`}>
      {certainty}
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const getScoreConfig = (s: number) => {
    if (s >= 8) return { className: 'score-high', label: 'Excellent', color: 'text-green-400' };
    if (s >= 5) return { className: 'score-medium', label: 'Good', color: 'text-amber-400' };
    return { className: 'score-low', label: 'Needs Work', color: 'text-gh-error' };
  };

  const { className, label, color } = getScoreConfig(score);

  return (
    <div className="flex flex-col items-center">
      <div className={`score-badge w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl ${className}`}>
        {score}
      </div>
      <span className={`text-[10px] sm:text-xs font-medium mt-1 ${color}`}>{label}</span>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <code className="block text-xs sm:text-sm text-green-400 font-mono bg-gh-bg-secondary/80 px-3 py-2.5 rounded-lg border border-green-500/20 pr-10">
        {code}
      </code>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md bg-gh-bg-tertiary/80 text-gh-text-muted opacity-0 group-hover:opacity-100 transition-all duration-200 hover:text-white hover:bg-gh-bg-tertiary"
        title="Copy fix"
      >
        {copied ? <CheckCircleIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

import { useState } from 'react';

function MistakeCard({ mistake, index }: { mistake: Mistake; index: number }) {
  const confidencePct = Math.round(mistake.confidence * 100);
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div 
      className="group bg-gh-bg-tertiary/50 border border-gh-border rounded-xl overflow-hidden hover:border-gh-text-muted/50 transition-all duration-300 animate-slide-in-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start justify-between gap-3 p-3 sm:p-4 text-left hover:bg-gh-bg-tertiary/80 transition-colors"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <SeverityBadge severity={mistake.severity} />
          <CertaintyBadge certainty={mistake.certainty} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gh-text-muted font-mono bg-gh-bg-secondary px-2 py-1 rounded hidden sm:block">
            {mistake.name}
          </span>
          <svg 
            className={`w-4 h-4 text-gh-text-muted transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable Content */}
      {isExpanded && (
        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 animate-fade-in">
          {/* Location */}
          <div className="flex items-center gap-2 text-xs text-gh-text-muted flex-wrap">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 7m0 13V7" />
            </svg>
            <span>Line {mistake.line}, Col {mistake.column}</span>
            <span className="text-gh-border hidden sm:inline">•</span>
            <span className="hidden sm:inline">{confidencePct}% confidence</span>
            <span className="text-gh-border">•</span>
            <span className="capitalize">{mistake.scope}</span>
          </div>

          {/* Message */}
          <p className="text-gh-text font-medium text-sm leading-relaxed">
            {mistake.message}
          </p>

          {/* Explanation */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gh-text-muted uppercase tracking-wide mb-1.5">
              <LightbulbIcon />
              <span>Explanation</span>
            </div>
            <p className="text-xs sm:text-sm text-gh-text-muted leading-relaxed pl-6">
              {mistake.explanation}
            </p>
          </div>

          {/* Code Example */}
          {mistake.codeExample && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-gh-success uppercase tracking-wide mb-1.5">
                <CodeIcon />
                <span>Code Example</span>
              </div>
              <div className="pl-6">
                <CodeBlock code={mistake.codeExample} />
              </div>
            </div>
          )}
        </div>
      )}
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
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3">
            <div className="absolute inset-0 border-2 border-gh-border rounded-full" />
            <div className="absolute inset-0 border-2 border-gh-accent border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gh-text-muted text-xs sm:text-sm">Analyzing your code...</p>
        </div>
      </div>
    );
  }

  if (mistakes.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 sm:p-8 animate-fade-in">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-600/20 flex items-center justify-center mb-4 sm:mb-6 glow-green animate-pulse-slow">
          <div className="text-green-400">
            <CheckIcon />
          </div>
        </div>
        <ScoreBadge score={score} />
        <h3 className="text-lg sm:text-xl font-semibold text-gh-text mt-3 sm:mt-4 mb-1 sm:mb-2">
          Great job!
        </h3>
        <p className="text-xs sm:text-sm text-gh-text-muted max-w-xs">
          No common mistakes detected in your code. Keep up the good work!
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gh-border bg-gh-bg-secondary/30 shrink-0">
        <div>
          <h2 className="text-sm sm:text-base font-semibold text-gh-text">
            {mistakes.length} issue{mistakes.length !== 1 ? 's' : ''} found
          </h2>
          <p className="text-xs text-gh-text-muted mt-0.5 hidden sm:block">
            Review and fix the detected problems
          </p>
        </div>
        <ScoreBadge score={score} />
      </div>

      {/* Mistakes List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {mistakes.map((mistake, index) => (
          <MistakeCard key={`${mistake.name}-${mistake.line}-${index}`} mistake={mistake} index={index} />
        ))}
      </div>
    </div>
  );
}
