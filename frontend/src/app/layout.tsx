import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

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
      <body className={`${inter.variable} ${jetBrainsMono.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
