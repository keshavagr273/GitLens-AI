'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  GitBranch,
  Layers,
  Search,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Code2,
  Network,
  Database,
  ExternalLink,
  Trash2,
  Sun,
  FileCode2,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { ingestRepository, fetchRepositories, deleteRepository } from '@/lib/api';
import { Repository } from '@gitlens/shared-types';
import { AnalysisProgressModal } from '@/features/repository/AnalysisProgressModal';
import { GitLensLogo } from '@/components/GitLensLogo';

const SAMPLE_REPOS = [
  { label: 'fastify/fastify', url: 'https://github.com/fastify/fastify', lang: 'TypeScript', stars: '30k' },
  { label: 'expressjs/express', url: 'https://github.com/expressjs/express', lang: 'JavaScript', stars: '63k' },
  { label: 'facebook/react', url: 'https://github.com/facebook/react', lang: 'JavaScript', stars: '220k' },
  { label: 'nestjs/nest', url: 'https://github.com/nestjs/nest', lang: 'TypeScript', stars: '65k' },
];

export default function LandingPage() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [activeRepoId, setActiveRepoId] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [recentRepos, setRecentRepos] = useState<Repository[]>([]);

  useEffect(() => {
    fetchRepositories().then((repos) => {
      if (repos && repos.length > 0) {
        setRecentRepos(repos);
      }
    });
  }, []);

  const handleAnalyze = async (targetUrl?: string) => {
    const urlToSubmit = targetUrl || repoUrl;
    if (!urlToSubmit) {
      setError('Please enter a valid GitHub repository URL');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await ingestRepository(urlToSubmit);
      setActiveRepoId(result.repository.id);
      setActiveAnalysisId(result.analysisId);
      setShowProgress(true);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize analysis');
      setLoading(false);
    }
  };

  const handleProgressComplete = () => {
    setShowProgress(false);
    if (activeRepoId) {
      router.push(`/workspace/${activeRepoId}`);
    }
  };

  const handleDeleteRepo = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = window.confirm('Remove this repository from workspace list?');
    if (!confirmed) return;
    const ok = await deleteRepository(id);
    if (ok) {
      setRecentRepos((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Distinct list by owner/name
  const uniqueRepos = Array.from(
    new Map(recentRepos.map((r) => [`${r.owner.toLowerCase()}/${r.name.toLowerCase()}`, r])).values()
  );

  return (
    <div className="relative min-h-screen flex flex-col justify-between bg-[#0a0a0b] text-[#f5f3ee] font-sans selection:bg-[#e8a33d]/30 selection:text-[#f5f3ee]">
      {/* Top Editorial Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/8 bg-[#0a0a0b]/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand Monogram & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <GitLensLogo size={28} />
            <span className="font-serif text-lg font-normal tracking-tight text-[#f5f3ee] group-hover:text-[#e8a33d] transition-colors">
              GitLens
            </span>
          </Link>

          {/* Nav Links & Action */}
          <nav className="flex items-center gap-6 text-[11px] font-mono tracking-widest uppercase text-[#a09f9c]">
            <a href="#sample-repos" className="hover:text-[#f5f3ee] transition-colors">
              About
            </a>
            <Link href="/health" className="hover:text-[#f5f3ee] transition-colors flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Health
            </Link>

            <div className="flex items-center gap-2 pl-2">
              <button
                type="button"
                className="text-[#a09f9c] hover:text-[#f5f3ee] transition-colors p-1"
                title="Theme: Dark Editorial"
              >
                <Sun className="h-4 w-4" />
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-6 pt-20 pb-20 text-center flex-1 flex flex-col items-center justify-center">
        {/* Monospace Badge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[2px] bg-[#141312] border border-[#e8a33d]/30 text-[#e8a33d] text-[10px] font-mono tracking-widest uppercase mb-10">
          <span>INTELLIGENT CODEBASE SEARCH & ARCHITECTURE Q&A</span>
        </div>

        {/* Hero Headline (Fraunces Serif) */}
        <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-normal text-[#f5f3ee] mb-6 leading-[1.08] tracking-tight">
          No hallucinations.<br />
          Just receipts.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-[#a09f9c] max-w-2xl mb-12 leading-relaxed font-normal">
          Paste any public GitHub repository or choose a sample. Ask architectural questions in plain English and get reliable answers with clickable receipts back to exact source lines.
        </p>

        {/* 3 Step Editorial Cards (DocSense signature 3-pillar layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mb-10 text-center">
          {/* Step 1 */}
          <div className="p-5 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-[4px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d] mb-3.5">
              <FileCode2 className="h-4 w-4" />
            </div>
            <h3 className="font-mono text-[11px] font-semibold text-[#f5f3ee] tracking-widest uppercase mb-1">
              1. Ingest Codebase
            </h3>
            <p className="font-mono text-[9px] text-[#4b5563] tracking-wider uppercase">
              Git Tree & AST Parsing
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-5 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-[4px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d] mb-3.5">
              <Database className="h-4 w-4" />
            </div>
            <h3 className="font-mono text-[11px] font-semibold text-[#f5f3ee] tracking-widest uppercase mb-1">
              2. Extract Call Graph
            </h3>
            <p className="font-mono text-[9px] text-[#4b5563] tracking-wider uppercase">
              Tarjan SCC & Route Map
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-5 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all flex flex-col items-center justify-center">
            <div className="h-10 w-10 rounded-[4px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d] mb-3.5">
              <MessageSquare className="h-4 w-4" />
            </div>
            <h3 className="font-mono text-[11px] font-semibold text-[#f5f3ee] tracking-widest uppercase mb-1">
              3. Get Cited Answers
            </h3>
            <p className="font-mono text-[9px] text-[#4b5563] tracking-wider uppercase">
              Line-Cited AI Reasoning
            </p>
          </div>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex items-center justify-center gap-4 mb-14">
          <button
            onClick={() => {
              const inputEl = document.getElementById('repo-input');
              if (inputEl) {
                inputEl.focus();
                inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }}
            className="btn-amber px-6 py-2.5 text-xs"
          >
            <span>Get Started</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </button>

          <button
            onClick={() => {
              const demoUrl = 'https://github.com/fastify/fastify';
              setRepoUrl(demoUrl);
              handleAnalyze(demoUrl);
            }}
            className="btn-secondary-dark px-5 py-2.5 text-xs text-[#a09f9c] hover:text-[#f5f3ee]"
          >
            <span>View Demo</span>
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </button>
        </div>

        {/* Input Bar */}
        <div className="w-full max-w-2xl mb-8">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze();
            }}
            className="flex items-center p-1.5 rounded-[4px] bg-[#141312] border border-white/10 focus-within:border-[#e8a33d] transition-all"
          >
            <div className="pl-3 pr-2 text-[#a09f9c]">
              <GitBranch className="h-4 w-4 text-[#e8a33d]" />
            </div>
            <input
              id="repo-input"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Paste public GitHub repository URL (e.g. https://github.com/fastify/fastify)"
              className="w-full bg-transparent text-xs text-[#f5f3ee] placeholder-[#4b5563] focus:outline-none px-2 font-mono tracking-tight"
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-amber shrink-0 text-[11px] py-2 px-4 disabled:opacity-50"
            >
              <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </form>

          {error && (
            <p className="mt-3 text-[11px] font-mono text-red-400 bg-red-950/40 border border-red-800/40 py-1.5 px-3 rounded-[2px] text-left">
              {error}
            </p>
          )}
        </div>

        {/* Sample Repositories Chips */}
        <div id="sample-repos" className="flex flex-wrap items-center justify-center gap-2 mb-16">
          <span className="text-[11px] font-mono text-[#a09f9c] mr-2 uppercase tracking-wider">Try sample repo:</span>
          {SAMPLE_REPOS.map((sample) => (
            <button
              key={sample.label}
              onClick={() => {
                setRepoUrl(sample.url);
                handleAnalyze(sample.url);
              }}
              className="px-3 py-1 rounded-[3px] bg-[#141312] hover:bg-[#1a1918] border border-white/8 hover:border-[#e8a33d]/50 text-xs text-[#f5f3ee] flex items-center gap-2 transition-all font-mono text-[11px]"
            >
              <span>{sample.label}</span>
              <span className="text-[9px] px-1 py-0.2 rounded-[2px] bg-[#0a0a0b] text-[#e8a33d] border border-[#e8a33d]/20">
                {sample.lang}
              </span>
            </button>
          ))}
        </div>

        {/* Core Pillars Feature Grid */}
        <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl text-left mb-16">
          <div className="p-6 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all">
            <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d] mb-4">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="font-serif text-lg font-normal text-[#f5f3ee] mb-2">Architecture & Graph</h3>
            <p className="text-xs text-[#a09f9c] leading-relaxed">
              Deterministic Tree-sitter AST parser extracts module imports, exports, and circular dependencies with Tarjan&apos;s SCC.
            </p>
          </div>

          <div className="p-6 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all">
            <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d] mb-4">
              <Network className="h-4 w-4" />
            </div>
            <h3 className="font-serif text-lg font-normal text-[#f5f3ee] mb-2">Request-Flow Engine</h3>
            <p className="text-xs text-[#a09f9c] leading-relaxed">
              Trace REST routes through controllers, services, repositories, and database schemas with verifiable hop confidence.
            </p>
          </div>

          <div className="p-6 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all">
            <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d] mb-4">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <h3 className="font-serif text-lg font-normal text-[#f5f3ee] mb-2">Grounded AI Assistant</h3>
            <p className="text-xs text-[#a09f9c] leading-relaxed">
              AI synthesizes answers backed strictly by retrieved code chunks, citing exact source files and line ranges.
            </p>
          </div>
        </div>

        {/* Recent Repositories */}
        {uniqueRepos.length > 0 && (
          <div className="w-full max-w-4xl text-left">
            <div className="flex items-center justify-between mb-4 border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-xs font-semibold text-[#f5f3ee] uppercase tracking-widest">
                  Indexed Repositories
                </h4>
                <span className="px-2 py-0.5 rounded-[2px] bg-[#e8a33d]/10 border border-[#e8a33d]/30 text-[10px] font-mono text-[#e8a33d] font-semibold">
                  {uniqueRepos.length} ready
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#4b5563]">Click any card to open workspace</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uniqueRepos.map((repo) => {
                const isTs = (repo.primaryLanguage || '').toLowerCase().includes('typescript');
                const isJs = (repo.primaryLanguage || '').toLowerCase().includes('javascript');
                const dotColor = isTs ? 'bg-[#e8a33d]' : isJs ? 'bg-amber-300' : 'bg-emerald-400';

                return (
                  <div
                    key={repo.id}
                    onClick={() => router.push(`/workspace/${repo.id}`)}
                    className="p-4 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/50 cursor-pointer flex flex-col justify-between group transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-7 w-7 shrink-0 rounded-[2px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#a09f9c] group-hover:text-[#e8a33d] group-hover:border-[#e8a33d]/40 transition-colors">
                          <Code2 className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-mono font-semibold text-[#f5f3ee] group-hover:text-[#e8a33d] transition-colors truncate">
                            <span className="text-[#a09f9c] font-normal">{repo.owner} / </span>
                            {repo.name}
                          </p>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        title="Remove repository from workspace list"
                        onClick={(e) => handleDeleteRepo(repo.id, e)}
                        className="p-1 rounded text-[#4b5563] hover:text-red-400 hover:bg-red-950/40 transition-colors shrink-0 opacity-40 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-[11px] text-[#a09f9c] mb-4 line-clamp-2 leading-relaxed h-8">
                      {repo.description || `Interactive architecture model for ${repo.owner}/${repo.name}`}
                    </p>

                    {/* Metadata Badges Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-white/8">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] bg-[#0a0a0b] border border-white/8 text-[10px] font-mono text-[#a09f9c]">
                          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                          {repo.primaryLanguage || 'TypeScript'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-[#4b5563]">
                          <GitBranch className="h-3 w-3" />
                          {repo.defaultBranch || 'main'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-emerald-950/40 border border-emerald-800/40 text-[9px] font-mono font-medium text-emerald-400">
                          Ready
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-[#4b5563] group-hover:text-[#e8a33d] transition-all group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/8 py-6 text-center text-xs text-[#a09f9c] bg-[#0a0a0b] font-mono text-[11px]">
        <p>GitLens AI — Dark Editorial Code Intelligence & Grounded AI Reasoning</p>
      </footer>

      {/* Progress Modal */}
      {showProgress && activeAnalysisId && (
        <AnalysisProgressModal
          analysisId={activeAnalysisId}
          isOpen={showProgress}
          onComplete={handleProgressComplete}
          onClose={() => setShowProgress(false)}
        />
      )}
    </div>
  );
}
