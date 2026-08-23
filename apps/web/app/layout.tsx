import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitLens AI — Production-Grade Interactive Codebase Explorer',
  description:
    'Turn any GitHub repository into a searchable architecture graph, dependency map, request-flow tracer, and grounded AI assistant.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
