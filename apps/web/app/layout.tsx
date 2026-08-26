import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitLens AI — Production-Grade Interactive Codebase Explorer & Architecture Q&A',
  description:
    'Explore any GitHub repository as a living architecture graph. No hallucinations. Just deterministic code receipts and AST-grounded AI explanations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..900;1,9..144,300..900&family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0a0a0b] text-[#f5f3ee] antialiased selection:bg-[#e8a33d]/30 selection:text-[#f5f3ee] font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
