import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RookieMistakes.dev - Code Analysis for Junior Developers',
  description: 'Detect common coding mistakes in JavaScript, TypeScript, and Python with AST-based analysis',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
