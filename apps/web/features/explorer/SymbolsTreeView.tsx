'use client';

import React, { useState } from 'react';
import { SymbolNode } from '@gitlens/shared-types';
import {
  Code2,
  Box,
  Layers,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

interface Props {
  symbols: SymbolNode[];
  activeSymbolId?: string;
  onSelectSymbol: (symbol: SymbolNode) => void;
}

export function SymbolsTreeView({ symbols, activeSymbolId, onSelectSymbol }: Props) {
  const [sections, setSections] = useState({
    classes: true,
    functions: true,
    types: true,
  });
  const [expandedClasses, setExpandedClasses] = useState<Record<string, boolean>>({});

  const classes = symbols.filter((s) => s.kind === 'class');
  const standaloneFunctions = symbols.filter((s) => s.kind === 'function' && !s.parentId);
  const interfaces = symbols.filter((s) => s.kind === 'interface');
  const types = symbols.filter((s) => s.kind === 'type');

  const toggleClass = (classId: string) => {
    setExpandedClasses((prev) => ({ ...prev, [classId]: !prev[classId] }));
  };

  const toggleSection = (sectionKey: 'classes' | 'functions' | 'types') => {
    setSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
  };

  const expandAll = () => {
    setSections({ classes: true, functions: true, types: true });
    const all: Record<string, boolean> = {};
    classes.forEach((c) => {
      all[c.id] = true;
    });
    setExpandedClasses(all);
  };

  const collapseAll = () => {
    setSections({ classes: false, functions: false, types: false });
    const all: Record<string, boolean> = {};
    classes.forEach((c) => {
      all[c.id] = false;
    });
    setExpandedClasses(all);
  };

  const getComplexityColor = (comp: number) => {
    if (comp <= 2) return 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40';
    if (comp <= 5) return 'bg-amber-950/40 text-[#e8a33d] border-amber-800/40';
    return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
  };

  return (
    <div className="space-y-3 text-xs font-mono">
      {/* Controls */}
      <div className="flex items-center justify-between px-1 pb-2 border-b border-white/8">
        <span className="text-[10px] text-[#a09f9c]">AST Symbols ({symbols.length})</span>
        <div className="flex items-center gap-1">
          <button
            onClick={expandAll}
            className="text-[9px] px-2 py-0.5 rounded-[2px] bg-[#141312] border border-white/8 text-[#a09f9c] hover:text-[#f5f3ee] hover:border-[#e8a33d]/40 transition-colors"
          >
            Expand
          </button>
          <button
            onClick={collapseAll}
            className="text-[9px] px-2 py-0.5 rounded-[2px] bg-[#141312] border border-white/8 text-[#a09f9c] hover:text-[#f5f3ee] hover:border-[#e8a33d]/40 transition-colors"
          >
            Collapse
          </button>
        </div>
      </div>

      {/* 1. Classes & Methods */}
      {classes.length > 0 && (
        <div className="rounded-[3px] bg-[#141312] border border-white/8 overflow-hidden">
          <div
            onClick={() => toggleSection('classes')}
            className="flex items-center justify-between text-[#a09f9c] hover:text-[#f5f3ee] cursor-pointer font-semibold px-2 py-1.5 text-[10px] uppercase tracking-wider select-none bg-[#0a0a0b]/60"
          >
            <div className="flex items-center gap-1.5">
              {sections.classes ? (
                <ChevronDown className="h-3 w-3 text-[#e8a33d]" />
              ) : (
                <ChevronRight className="h-3 w-3 text-[#4b5563]" />
              )}
              <Box className="h-3 w-3 text-[#e8a33d]" />
              <span>Classes ({classes.length})</span>
            </div>
            <span className="text-[9px] text-[#4b5563]">{sections.classes ? 'open' : 'closed'}</span>
          </div>

          {sections.classes && (
            <div className="space-y-1 p-1.5 border-t border-white/5">
              {classes.map((cls) => {
                const isExpanded = expandedClasses[cls.id] ?? true;
                const methods = symbols.filter((s) => s.parentId === cls.id);
                const isActive = activeSymbolId === cls.id;

                return (
                  <div key={cls.id} className="rounded-[3px] bg-[#0a0a0b] border border-white/8 p-1">
                    <div
                      onClick={() => {
                        toggleClass(cls.id);
                        onSelectSymbol(cls);
                      }}
                      className={`flex items-center justify-between p-1.5 rounded-[2px] cursor-pointer transition-all ${
                        isActive ? 'bg-[#141312] text-[#f5f3ee] border border-[#e8a33d]' : 'hover:bg-white/5 text-[#f5f3ee]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {methods.length > 0 && (
                          isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-[#4b5563] shrink-0" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-[#4b5563] shrink-0" />
                          )
                        )}
                        <Box className="h-3 w-3 text-[#e8a33d] shrink-0" />
                        <span className="text-[11px] font-semibold text-[#f5f3ee] truncate">
                          {cls.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className={`text-[8px] px-1.5 py-0.2 rounded-[2px] border ${getComplexityColor(cls.metrics.cyclomaticComplexity)}`}>
                          CC:{cls.metrics.cyclomaticComplexity}
                        </span>
                        <span className="text-[9px] text-[#4b5563]">
                          L{cls.startLine}-{cls.endLine}
                        </span>
                      </div>
                    </div>

                    {/* Class Methods */}
                    {isExpanded && methods.length > 0 && (
                      <div className="mt-1 pl-2.5 space-y-0.5 border-l border-white/8 ml-1.5">
                        {methods.map((method) => {
                          const isMethodActive = activeSymbolId === method.id;
                          return (
                            <div
                              key={method.id}
                              onClick={() => onSelectSymbol(method)}
                              className={`flex items-center justify-between py-1 px-1.5 rounded-[2px] cursor-pointer transition-all ${
                                isMethodActive
                                  ? 'bg-[#141312] text-[#e8a33d] border border-[#e8a33d]/40'
                                  : 'hover:bg-white/5 text-[#a09f9c]'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 truncate">
                                <Code2 className="h-3 w-3 text-cyan-400 shrink-0" />
                                <span className="text-[10px] truncate">
                                  {method.name}{method.signature || '()'}
                                </span>
                              </div>
                              <span className={`text-[8px] px-1 py-0.2 rounded-[2px] border ${getComplexityColor(method.metrics.cyclomaticComplexity)}`}>
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
          )}
        </div>
      )}

      {/* 2. Standalone Functions */}
      {standaloneFunctions.length > 0 && (
        <div className="rounded-[3px] bg-[#141312] border border-white/8 overflow-hidden">
          <div
            onClick={() => toggleSection('functions')}
            className="flex items-center justify-between text-[#a09f9c] hover:text-[#f5f3ee] cursor-pointer font-semibold px-2 py-1.5 text-[10px] uppercase tracking-wider select-none bg-[#0a0a0b]/60"
          >
            <div className="flex items-center gap-1.5">
              {sections.functions ? (
                <ChevronDown className="h-3 w-3 text-[#e8a33d]" />
              ) : (
                <ChevronRight className="h-3 w-3 text-[#4b5563]" />
              )}
              <Code2 className="h-3 w-3 text-cyan-400" />
              <span>Functions ({standaloneFunctions.length})</span>
            </div>
            <span className="text-[9px] text-[#4b5563]">{sections.functions ? 'open' : 'closed'}</span>
          </div>

          {sections.functions && (
            <div className="space-y-1 p-1.5 border-t border-white/5">
              {standaloneFunctions.map((fn) => {
                const isActive = activeSymbolId === fn.id;
                return (
                  <div
                    key={fn.id}
                    onClick={() => onSelectSymbol(fn)}
                    className={`flex items-center justify-between p-1.5 rounded-[3px] bg-[#0a0a0b] border cursor-pointer transition-all ${
                      isActive
                        ? 'border-[#e8a33d] text-[#f5f3ee]'
                        : 'border-white/8 hover:border-[#e8a33d]/40 text-[#a09f9c] hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Code2 className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span className="text-[11px] truncate">
                        {fn.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className={`text-[8px] px-1.5 py-0.2 rounded-[2px] border ${getComplexityColor(fn.metrics.cyclomaticComplexity)}`}>
                        CC:{fn.metrics.cyclomaticComplexity}
                      </span>
                      <span className="text-[9px] text-[#4b5563]">
                        L{fn.startLine}-{fn.endLine}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Interfaces & Types */}
      {(interfaces.length > 0 || types.length > 0) && (
        <div className="rounded-[3px] bg-[#141312] border border-white/8 overflow-hidden">
          <div
            onClick={() => toggleSection('types')}
            className="flex items-center justify-between text-[#a09f9c] hover:text-[#f5f3ee] cursor-pointer font-semibold px-2 py-1.5 text-[10px] uppercase tracking-wider select-none bg-[#0a0a0b]/60"
          >
            <div className="flex items-center gap-1.5">
              {sections.types ? (
                <ChevronDown className="h-3 w-3 text-[#e8a33d]" />
              ) : (
                <ChevronRight className="h-3 w-3 text-[#4b5563]" />
              )}
              <Layers className="h-3 w-3 text-emerald-400" />
              <span>Types & Interfaces ({interfaces.length + types.length})</span>
            </div>
            <span className="text-[9px] text-[#4b5563]">{sections.types ? 'open' : 'closed'}</span>
          </div>

          {sections.types && (
            <div className="space-y-1 p-1.5 border-t border-white/5">
              {[...interfaces, ...types].map((item) => {
                const isActive = activeSymbolId === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectSymbol(item)}
                    className={`flex items-center justify-between p-1.5 rounded-[3px] bg-[#0a0a0b] border cursor-pointer transition-all ${
                      isActive
                        ? 'border-[#e8a33d] text-[#f5f3ee]'
                        : 'border-white/8 hover:border-[#e8a33d]/40 text-[#a09f9c] hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Layers className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="text-[11px] truncate">{item.name}</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-[2px] bg-[#141312] text-[#e8a33d] border border-[#e8a33d]/20 uppercase">
                      {item.kind}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
