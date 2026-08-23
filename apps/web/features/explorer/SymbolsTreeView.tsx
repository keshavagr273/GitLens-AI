'use client';

import React, { useState } from 'react';
import { SymbolNode } from '@gitlens/shared-types';
import {
  Code2,
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
  Activity,
  Flame,
  FileCode2,
} from 'lucide-react';

interface Props {
  symbols: SymbolNode[];
  activeSymbolId?: string;
  onSelectSymbol: (symbol: SymbolNode) => void;
}

export function SymbolsTreeView({ symbols, activeSymbolId, onSelectSymbol }: Props) {
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  // Group top-level symbols vs methods
  const classes = symbols.filter((s) => s.kind === 'class');
  const standaloneFunctions = symbols.filter((s) => s.kind === 'function' && !s.parentId);
  const interfaces = symbols.filter((s) => s.kind === 'interface');
  const types = symbols.filter((s) => s.kind === 'type');

  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const getComplexityColor = (comp: number) => {
    if (comp <= 2) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    if (comp <= 5) return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    return 'bg-red-500/10 text-red-300 border-red-500/30';
  };

  return (
    <div className="space-y-3 text-xs">
      {/* 1. Classes & Methods */}
      {classes.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold px-2 py-1 text-[11px] uppercase tracking-wider">
            <Box className="h-3.5 w-3.5 text-indigo-400" />
            <span>Classes ({classes.length})</span>
          </div>

          <div className="space-y-1 mt-1">
            {classes.map((cls) => {
              const isExpanded = expandedClasses[cls.id] ?? true;
              const methods = symbols.filter((s) => s.parentId === cls.id);
              const isActive = activeSymbolId === cls.id;

              return (
                <div key={cls.id} className="rounded-lg bg-slate-900/60 border border-slate-800/80 p-1.5">
                  <div
                    onClick={() => {
                      toggleClass(cls.id);
                      onSelectSymbol(cls);
                    }}
                    className={`flex items-center justify-between p-1.5 rounded-md cursor-pointer transition-colors ${
                      isActive ? 'bg-indigo-600/30 text-white' : 'hover:bg-slate-800/60 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      {methods.length > 0 && (
                        isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        )
                      )}
                      <Box className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                      <span className="font-mono text-[11px] font-semibold text-white truncate">
                        {cls.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getComplexityColor(cls.metrics.cyclomaticComplexity)}`}>
                        CC:{cls.metrics.cyclomaticComplexity}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        L{cls.startLine}-{cls.endLine}
                      </span>
                    </div>
                  </div>

                  {/* Class Methods */}
                  {isExpanded && methods.length > 0 && (
                    <div className="mt-1 pl-4 space-y-0.5 border-l border-slate-800 ml-2">
                      {methods.map((method) => {
                        const isMethodActive = activeSymbolId === method.id;
                        return (
                          <div
                            key={method.id}
                            onClick={() => onSelectSymbol(method)}
                            className={`flex items-center justify-between py-1 px-2 rounded-md cursor-pointer transition-colors ${
                              isMethodActive
                                ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-medium'
                                : 'hover:bg-slate-800/60 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Code2 className="h-3 w-3 text-cyan-400 shrink-0" />
                              <span className="font-mono text-[11px] truncate">
                                {method.name}{method.signature || '()'}
                              </span>
                            </div>
                            <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getComplexityColor(method.metrics.cyclomaticComplexity)}`}>
                              CC:{method.metrics.cyclomaticComplexity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Standalone Functions */}
      {standaloneFunctions.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold px-2 py-1 text-[11px] uppercase tracking-wider">
            <Code2 className="h-3.5 w-3.5 text-cyan-400" />
            <span>Functions ({standaloneFunctions.length})</span>
          </div>

          <div className="space-y-1 mt-1">
            {standaloneFunctions.map((fn) => {
              const isActive = activeSymbolId === fn.id;
              return (
                <div
                  key={fn.id}
                  onClick={() => onSelectSymbol(fn)}
                  className={`flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer transition-colors ${
                    isActive ? 'bg-indigo-600/30 border-indigo-500/40 text-white' : 'hover:bg-slate-800/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Code2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span className="font-mono text-[11px] font-medium truncate">
                      {fn.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${getComplexityColor(fn.metrics.cyclomaticComplexity)}`}>
                      CC:{fn.metrics.cyclomaticComplexity}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      L{fn.startLine}-{fn.endLine}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Interfaces & Types */}
      {(interfaces.length > 0 || types.length > 0) && (
        <div>
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold px-2 py-1 text-[11px] uppercase tracking-wider">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>Types & Interfaces ({interfaces.length + types.length})</span>
          </div>

          <div className="space-y-1 mt-1">
            {[...interfaces, ...types].map((item) => {
              const isActive = activeSymbolId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectSymbol(item)}
                  className={`flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 cursor-pointer transition-colors ${
                    isActive ? 'bg-indigo-600/30 border-indigo-500/40 text-white' : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Layers className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span className="font-mono text-[11px] truncate">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                    {item.kind}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
