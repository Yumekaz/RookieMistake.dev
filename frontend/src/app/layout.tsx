import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RookieMistakes.dev — Code Analysis Tool',
  description: 'Detect common junior developer mistakes in JavaScript, TypeScript, and Python with deterministic AST-based analysis. No AI, no paid APIs.',
  keywords: ['code analysis', 'javascript', 'typescript', 'python', 'ast', 'developer tools', 'code review'],
  authors: [{ name: 'RookieMistakes.dev' }],
  openGraph: {
    title: 'RookieMistakes.dev — Code Analysis Tool',
    description: 'Detect common coding mistakes with AST-based analysis',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
