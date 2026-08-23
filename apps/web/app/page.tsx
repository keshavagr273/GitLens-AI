'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  GitBranch,
  Layers,
  Cpu,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Code2,
  Network,
  Database,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { ingestRepository, fetchRepositories, deleteRepository } from '@/lib/api';
import { Repository } from '@gitlens/shared-types';
import { AnalysisProgressModal } from '@/features/repository/AnalysisProgressModal';

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
    <div className="relative min-h-screen flex flex-col justify-between">
      {/* Top Glass Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 glass-panel">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-glow">
              <Network className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-indigo-200">
              GitLens <span className="text-cyan-400 font-mono text-sm uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <a
              href="/health"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 text-slate-300 hover:text-white transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
              <span>System Health</span>
            </a>
            <div className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-medium">
              v1.0 Production
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center flex-1 flex flex-col items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-8 shadow-glow animate-pulse-slow">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <span>Deterministic Code Intelligence + Grounded AI Architecture</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl text-white mb-6 leading-tight">
          Explore Any Codebase as a{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400">
            Living Architecture Graph
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mb-10 leading-relaxed">
          Transform GitHub repositories into interactive architecture diagrams, dependency trees, API request-flow maps, and a grounded AI engineer that cites exact source lines.
        </p>

        {/* Input Bar */}
        <div className="w-full max-w-2xl mb-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze();
            }}
            className="flex items-center p-2 rounded-2xl glass-panel-elevated shadow-2xl border border-indigo-500/30 focus-within:border-indigo-400 transition-all"
          >
            <div className="pl-3 pr-2 text-slate-400">
              <GitBranch className="h-5 w-5 text-indigo-400" />
            </div>
            <input
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="Paste public GitHub repository URL (e.g. https://github.com/fastify/fastify)"
              className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none px-2"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-sm font-semibold flex items-center gap-2 shadow-glow transition-all active:scale-95 disabled:opacity-50"
            >
              <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {error && (
            <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 py-1.5 px-3 rounded-lg text-left">
              {error}
            </p>
          )}
        </div>

        {/* Sample Repositories Chips */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-16">
          <span className="text-xs text-slate-500 mr-2">Try sample repo:</span>
          {SAMPLE_REPOS.map((sample) => (
            <button
              key={sample.label}
              onClick={() => {
                setRepoUrl(sample.url);
                handleAnalyze(sample.url);
              }}
              className="px-3 py-1.5 rounded-lg glass-panel hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white flex items-center gap-2 transition-all hover:scale-105"
            >
              <span>{sample.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                {sample.lang}
              </span>
            </button>
          ))}
        </div>

        {/* Core Pillars Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left mb-16">
          <div className="p-6 rounded-2xl glass-panel border border-slate-800 hover:border-indigo-500/30 transition-all">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Architecture & Graph</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Deterministic Tree-sitter AST parser extracts module imports, exports, and circular dependencies with Tarjan's SCC.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-slate-800 hover:border-cyan-500/30 transition-all">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-4">
              <Network className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Request-Flow Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trace REST routes through controllers, services, repositories, and database schemas with verifiable hop confidence.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-slate-800 hover:border-emerald-500/30 transition-all">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-white text-base mb-2">Grounded AI Assistant</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              AI synthesizes answers backed strictly by retrieved code chunks, citing exact source files and line ranges.
            </p>
          </div>
        </div>

        {/* Recent Repositories */}
        {uniqueRepos.length > 0 && (
          <div className="w-full max-w-4xl text-left">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-slate-200 tracking-wide uppercase">Indexed Repositories</h4>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-[11px] font-mono text-indigo-300">
                  {uniqueRepos.length} ready
                </span>
              </div>
              <span className="text-xs text-slate-500">Click any card to open interactive workspace</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {uniqueRepos.map((repo) => {
                const isTs = (repo.primaryLanguage || '').toLowerCase().includes('typescript');
                const isJs = (repo.primaryLanguage || '').toLowerCase().includes('javascript');
                const dotColor = isTs ? 'bg-cyan-400' : isJs ? 'bg-amber-400' : 'bg-indigo-400';

                return (
                  <div
                    key={repo.id}
                    onClick={() => router.push(`/workspace/${repo.id}`)}
                    className="p-5 rounded-2xl glass-panel border border-slate-800/90 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/5 cursor-pointer flex flex-col justify-between group transition-all duration-200 hover:-translate-y-0.5"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 shrink-0 rounded-xl bg-slate-800/90 border border-slate-700/60 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-colors">
                          <Code2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors truncate">
                            <span className="text-slate-400 font-normal">{repo.owner} / </span>
                            {repo.name}
                          </p>
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        title="Remove repository from workspace list"
                        onClick={(e) => handleDeleteRepo(repo.id, e)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0 opacity-40 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed h-8">
                      {repo.description || `Interactive architecture model for ${repo.owner}/${repo.name}`}
                    </p>

                    {/* Metadata Badges Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-800/60">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] font-mono text-slate-300">
                          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
                          {repo.primaryLanguage || 'TypeScript'}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/60 text-[10px] font-mono text-slate-500">
                          <GitBranch className="h-3 w-3" />
                          {repo.defaultBranch || 'main'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-medium text-emerald-400">
                          <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                          Ready
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-cyan-400 transition-all group-hover:translate-x-1" />
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
      <footer className="border-t border-slate-800/60 py-6 text-center text-xs text-slate-500 glass-panel">
        <p>GitLens AI — Code Intelligence Platform with Grounded AI Reasoning</p>
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
