'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

interface ResourceShellProps {
  title: string;
  eyebrow: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
}

const navLinks = [
  { href: '/', label: 'Analyzer' },
  { href: '/history', label: 'History' },
  { href: '/compare', label: 'Compare' },
  { href: '/benchmark', label: 'Benchmark' },
  { href: '/detectors', label: 'Detectors' },
  { href: '/limitations', label: 'Limitations' },
];

export default function ResourceShell({
  title,
  eyebrow,
  description,
  children,
  actions,
}: ResourceShellProps) {
  return (
    <div className="min-h-screen bg-gh-bg">
      <header className="sticky top-0 z-50 glass border-b border-gh-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <Link href="/" className="text-xl sm:text-2xl font-bold hover:opacity-80 transition-opacity">
                <span className="gradient-text">RookieMistakes.dev</span>
              </Link>
              <p className="text-xs uppercase tracking-[0.2em] text-gh-text-muted mt-2">{eyebrow}</p>
              <h1 className="text-2xl sm:text-4xl font-semibold text-gh-text mt-2">{title}</h1>
              <p className="text-sm sm:text-base text-gh-text-muted mt-2 max-w-3xl">{description}</p>
            </div>
            {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
          </div>

          <nav className="flex flex-wrap gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3 py-2 rounded-lg border border-gh-border bg-gh-bg-secondary text-sm text-gh-text-muted hover:text-white hover:border-gh-text-muted transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {children}
      </main>
    </div>
  );
}
