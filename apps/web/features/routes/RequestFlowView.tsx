'use client';

import React from 'react';
import { ApiRoute, RequestFlowHop, RequestFlowTrace } from '@gitlens/shared-types';
import {
  Zap,
  FileCode2,
  CheckCircle2,
  Server,
  Database,
  Code2,
  ShieldCheck,
  ExternalLink,
  Layers,
} from 'lucide-react';

interface Props {
  routes: ApiRoute[];
  selectedRoute: ApiRoute | null;
  activeTrace: RequestFlowTrace | null;
  onSelectRoute: (route: ApiRoute) => void;
  onOpenSource: (filePath: string, lineRange?: [number, number]) => void;
}

export function RequestFlowView({
  routes,
  selectedRoute,
  activeTrace,
  onSelectRoute,
  onOpenSource,
}: Props) {
  const getMethodBadgeColor = (method: string) => {
    // GET and POST previously shared one colour, so a read and a write were
    // indistinguishable in the route bar.
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      case 'POST':
        return 'bg-[#e8a33d]/15 text-[#e8a33d] border-[#e8a33d]/30';
      case 'PUT':
      case 'PATCH':
        return 'bg-sky-950/40 text-sky-300 border-sky-800/40';
      case 'DELETE':
        return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
      default:
        return 'bg-[#141312] text-[#a09f9c] border-white/10';
    }
  };

  const getHopIcon = (label: string) => {
    if (label.includes('Middleware')) return <ShieldCheck className="h-3.5 w-3.5 text-[#e8a33d]" />;
    if (label.includes('Controller')) return <Server className="h-3.5 w-3.5 text-[#e8a33d]" />;
    if (label.includes('Service')) return <Code2 className="h-3.5 w-3.5 text-cyan-400" />;
    if (label.includes('Database') || label.includes('table')) return <Database className="h-3.5 w-3.5 text-emerald-400" />;
    return <Zap className="h-3.5 w-3.5 text-[#e8a33d]" />;
  };

  if (routes.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center select-none bg-[#0a0a0b]">
        <div className="w-full max-w-3xl bg-[#141312] rounded-[4px] border border-white/8 p-8">
          <div className="flex items-center gap-3.5 pb-6 border-b border-white/8 mb-6">
            <div className="h-10 w-10 rounded-[3px] bg-[#0a0a0b] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d]">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-normal text-[#f5f3ee]">No HTTP routes detected</h3>
              <p className="text-xs text-[#a09f9c] mt-1">
                The analyzer found no Express, Fastify, NestJS or Next.js route declarations in this repository.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs text-[#a09f9c]">
            <p className="font-sans leading-relaxed">
              This usually means the repository is a library, CLI, or framework rather than a running HTTP
              service &mdash; such code is exercised through its public API instead of through network routes.
              Request Flow has nothing to trace here; the{' '}
              <span className="text-[#e8a33d] font-mono">Architecture</span> and{' '}
              <span className="text-[#e8a33d] font-mono">Dependencies</span> views describe this codebase instead.
            </p>
            <div className="p-3.5 rounded-[4px] bg-[#0a0a0b] border border-white/5 font-mono text-[11px] space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-[#6b6a67] mb-1">
                Route patterns the analyzer looks for
              </div>
              <div>app.get(&apos;/path&apos;, handler) &nbsp;&middot;&nbsp; router.post(...)</div>
              <div>@Controller() / @Get() decorators (NestJS)</div>
              <div>fastify.route({'{'} method, url {'}'})</div>
              <div>app/**/route.ts exports (Next.js App Router)</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center select-none bg-[#0a0a0b]">
      {/* Route Switcher Quick Bar */}
      <div className="w-full max-w-3xl mb-5 flex items-center gap-2 overflow-x-auto pb-2 shrink-0">
        <span className="text-[10px] font-mono uppercase text-[#4b5563] font-bold shrink-0">
          Routes:
        </span>
        {routes.map((r) => {
          const isSelected = selectedRoute?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRoute(r)}
              className={`px-3 py-1.5 rounded-[3px] border text-xs font-mono shrink-0 transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-[#e8a33d] border-[#e8a33d] text-black font-bold shadow-sm'
                  : 'bg-[#141312] border-white/8 text-[#a09f9c] hover:text-[#f5f3ee]'
              }`}
            >
              <span
                className={`text-[9px] px-1.5 py-0.5 rounded-[2px] border font-bold ${
                  isSelected
                    ? 'bg-black text-[#f5f3ee] border-black/60'
                    : getMethodBadgeColor(r.method)
                }`}
              >
                {r.method}
              </span>
              <span className="truncate max-w-[160px]">{r.path}</span>
            </button>
          );
        })}
      </div>

      {/* Main Request Flow Timeline */}
      <div className="w-full max-w-3xl bg-[#141312] rounded-[4px] border border-white/8 p-6 shadow-xl">
        {/* Header Summary */}
        <div className="flex items-center justify-between pb-4 border-b border-white/8 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d]">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-mono px-2 py-0.2 rounded-[2px] border font-bold ${getMethodBadgeColor(
                    selectedRoute?.method || activeTrace?.method || 'POST'
                  )}`}
                >
                  {selectedRoute?.method || activeTrace?.method || 'POST'}
                </span>
                <h3 className="font-mono font-semibold text-sm text-[#f5f3ee]">
                  {selectedRoute?.path || activeTrace?.path}
                </h3>
              </div>
              <p className="text-[11px] text-[#a09f9c] mt-0.5">
                Deterministic static analysis & inferred call graph execution trace.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-[2px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="h-3 w-3" />
              <span>{activeTrace?.hops.length || 0} Execution Hops</span>
            </span>
          </div>
        </div>

        {/* Chronological Hops Stepper */}
        <div className="relative space-y-3 font-mono">
          <div className="absolute left-5 top-4 bottom-4 w-0.5 bg-gradient-to-b from-[#e8a33d] via-amber-600 to-emerald-600 -z-0 opacity-30" />

          {activeTrace?.hops.map((hop: RequestFlowHop, idx: number) => {
            return (
              <div
                key={hop.id}
                onClick={() => {
                  if (hop.file) {
                    onOpenSource(hop.file, [hop.line || 1, (hop.line || 1) + 15]);
                  }
                }}
                className="relative z-10 flex items-start gap-3.5 p-3.5 rounded-[4px] bg-[#0a0a0b] border border-white/8 hover:border-[#e8a33d]/40 cursor-pointer transition-all group"
              >
                {/* Step Circle */}
                <div className="h-7 w-7 rounded-[2px] bg-[#141312] border border-[#e8a33d] flex items-center justify-center text-xs font-mono font-bold text-[#e8a33d] shrink-0">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 truncate">
                      {getHopIcon(hop.label)}
                      <h4 className="font-semibold text-xs text-[#f5f3ee] group-hover:text-[#e8a33d] transition-colors truncate">
                        {hop.label}
                      </h4>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] border uppercase shrink-0 font-bold ${
                        hop.confidence === 'static'
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                          : hop.confidence === 'inferred'
                          ? 'bg-[#e8a33d]/15 text-[#e8a33d] border-[#e8a33d]/30'
                          : 'bg-amber-950/40 text-amber-300 border-amber-800/40'
                      }`}
                    >
                      {hop.confidence} ({(hop.confidenceScore * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <p className="text-[11px] text-[#a09f9c] leading-relaxed mb-2 font-sans">{hop.details}</p>

                  {hop.file && (
                    <div className="flex items-center gap-1 text-[10px] font-mono text-[#e8a33d] group-hover:text-[#f5f3ee]">
                      <FileCode2 className="h-3 w-3 shrink-0" />
                      <span className="underline truncate">
                        {hop.file}:{hop.line || 1}
                      </span>
                      <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
