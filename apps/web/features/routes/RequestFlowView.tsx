'use client';

import React from 'react';
import { ApiRoute, RequestFlowHop, RequestFlowTrace } from '@gitlens/shared-types';
import {
  Zap,
  ArrowDown,
  Layers,
  FileCode2,
  CheckCircle2,
  Server,
  Database,
  Code2,
  ShieldCheck,
  Radio,
  ExternalLink,
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
    switch (method) {
      case 'GET':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'POST':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
      case 'PUT':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'DELETE':
        return 'bg-red-500/20 text-red-300 border-red-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getHopIcon = (label: string) => {
    if (label.includes('Middleware')) return <ShieldCheck className="h-4 w-4 text-amber-400" />;
    if (label.includes('Controller')) return <Server className="h-4 w-4 text-indigo-400" />;
    if (label.includes('Service')) return <Code2 className="h-4 w-4 text-cyan-400" />;
    if (label.includes('Database') || label.includes('table')) return <Database className="h-4 w-4 text-emerald-400" />;
    return <Zap className="h-4 w-4 text-cyan-400" />;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center select-none">
      {/* Route Switcher Quick Bar */}
      <div className="w-full max-w-3xl mb-6 flex items-center gap-2 overflow-x-auto pb-2 shrink-0">
        <span className="text-[11px] font-mono uppercase text-slate-500 font-bold shrink-0">
          Routes:
        </span>
        {routes.map((r) => {
          const isSelected = selectedRoute?.id === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRoute(r)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono shrink-0 transition-all flex items-center gap-2 ${
                isSelected
                  ? 'bg-indigo-600/30 border-indigo-400 text-white shadow-glow'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={`text-[10px] px-1.5 py-0.2 rounded border font-bold ${getMethodBadgeColor(r.method)}`}>
                {r.method}
              </span>
              <span className="truncate max-w-[150px]">{r.path}</span>
            </button>
          );
        })}
      </div>

      {/* Main Request Flow Timeline Container */}
      <div className="w-full max-w-3xl bg-slate-900/90 rounded-3xl border border-slate-800/90 p-6 shadow-2xl backdrop-blur-xl">
        {/* Header Summary */}
        <div className="flex items-center justify-between pb-5 border-b border-slate-800/80 mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-cyan-400">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded border font-bold ${getMethodBadgeColor(
                    selectedRoute?.method || activeTrace?.method || 'POST'
                  )}`}
                >
                  {selectedRoute?.method || activeTrace?.method || 'POST'}
                </span>
                <h3 className="font-bold text-base text-white font-mono">
                  {selectedRoute?.path || activeTrace?.path}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic static analysis & inferred call graph execution trace.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>{activeTrace?.hops.length || 0} Execution Hops</span>
            </span>
          </div>
        </div>

        {/* Chronological Hops Stepper */}
        <div className="relative space-y-4">
          {/* Vertical continuous timeline bar */}
          <div className="absolute left-6 top-4 bottom-4 w-0.5 bg-gradient-to-b from-indigo-500 via-cyan-500 to-emerald-500 -z-0 opacity-40" />

          {activeTrace?.hops.map((hop: RequestFlowHop, idx: number) => {
            const isFirst = idx === 0;
            const isLast = idx === (activeTrace.hops.length - 1);

            return (
              <div
                key={hop.id}
                onClick={() => {
                  if (hop.file) {
                    onOpenSource(hop.file, [hop.line || 1, (hop.line || 1) + 15]);
                  }
                }}
                className="relative z-10 flex items-start gap-4 p-4 rounded-2xl glass-panel-elevated hover:border-cyan-500/50 cursor-pointer transition-all duration-200 group shadow-lg hover:scale-[1.01]"
              >
                {/* Step Circle */}
                <div className="h-8 w-8 rounded-full bg-slate-950 border-2 border-indigo-400 flex items-center justify-center text-xs font-mono font-bold text-cyan-300 shrink-0 shadow-glow">
                  {idx + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 truncate">
                      {getHopIcon(hop.label)}
                      <h4 className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors truncate">
                        {hop.label}
                      </h4>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border uppercase shrink-0 font-bold ${
                        hop.confidence === 'static'
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : hop.confidence === 'inferred'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {hop.confidence} ({(hop.confidenceScore * 100).toFixed(0)}%)
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 leading-relaxed mb-2">{hop.details}</p>

                  {/* Code Location Tag */}
                  {hop.file && (
                    <div className="flex items-center gap-1 text-[11px] font-mono text-indigo-300 group-hover:text-cyan-200">
                      <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                      <span className="underline truncate">
                        {hop.file}:{hop.line || 1}
                      </span>
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity ml-1" />
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
