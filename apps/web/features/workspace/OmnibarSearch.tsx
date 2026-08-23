'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileCode2,
  Code2,
  Box,
  Layers,
  Zap,
  Cpu,
  ArrowRight,
  X,
  CornerDownLeft,
} from 'lucide-react';
import { SourceFile, SymbolNode, ApiRoute, Technology } from '@gitlens/shared-types';

interface SearchResultItem {
  id: string;
  category: 'file' | 'symbol' | 'route' | 'technology';
  title: string;
  subtitle: string;
  badge?: string;
  icon: any;
  action: () => void;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  files: SourceFile[];
  symbols: SymbolNode[];
  routes: ApiRoute[];
  technologies: Technology[];
  onOpenSource: (filePath: string, lineRange?: [number, number]) => void;
  onSelectRoute: (route: ApiRoute) => void;
}

export function OmnibarSearch({
  isOpen,
  onClose,
  files,
  symbols,
  routes,
  technologies,
  onOpenSource,
  onSelectRoute,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle global Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open triggered via prop
        }
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Aggregate and filter search results
  const results: SearchResultItem[] = React.useMemo(() => {
    if (!query.trim()) {
      // Default top suggestions
      return [
        ...files.slice(0, 3).map((f) => ({
          id: `file-${f.id}`,
          category: 'file' as const,
          title: f.path,
          subtitle: `${f.language} file • ${(f.sizeBytes / 1024).toFixed(1)} KB`,
          badge: 'FILE',
          icon: FileCode2,
          action: () => {
            onOpenSource(f.id);
            onClose();
          },
        })),
        ...routes.slice(0, 3).map((r) => ({
          id: `route-${r.id}`,
          category: 'route' as const,
          title: `${r.method} ${r.path}`,
          subtitle: r.handlerName ? `Handler: ${r.handlerName}` : r.filePath || '',
          badge: r.method,
          icon: Zap,
          action: () => {
            onSelectRoute(r);
            onClose();
          },
        })),
      ];
    }

    const q = query.toLowerCase();
    const items: SearchResultItem[] = [];

    // 1. Files
    for (const f of files) {
      if (f.path.toLowerCase().includes(q)) {
        items.push({
          id: `file-${f.id}`,
          category: 'file',
          title: f.path,
          subtitle: `${f.language} • ${(f.sizeBytes / 1024).toFixed(1)} KB`,
          badge: 'FILE',
          icon: FileCode2,
          action: () => {
            onOpenSource(f.id);
            onClose();
          },
        });
      }
    }

    // 2. Symbols
    for (const s of symbols) {
      if (s.name.toLowerCase().includes(q)) {
        items.push({
          id: `sym-${s.id}`,
          category: 'symbol',
          title: `${s.name}${s.signature || ''}`,
          subtitle: `${s.kind} • CC:${s.metrics.cyclomaticComplexity} • Lines ${s.startLine}-${s.endLine}`,
          badge: s.kind.toUpperCase(),
          icon: s.kind === 'class' ? Box : Code2,
          action: () => {
            onOpenSource(s.fileId, [s.startLine, s.endLine]);
            onClose();
          },
        });
      }
    }

    // 3. Routes
    for (const r of routes) {
      if (r.path.toLowerCase().includes(q) || r.method.toLowerCase().includes(q) || (r.handlerName && r.handlerName.toLowerCase().includes(q))) {
        items.push({
          id: `route-${r.id}`,
          category: 'route',
          title: `${r.method} ${r.path}`,
          subtitle: r.handlerName || r.filePath || '',
          badge: r.method,
          icon: Zap,
          action: () => {
            onSelectRoute(r);
            onClose();
          },
        });
      }
    }

    // 4. Technologies
    for (const t of technologies) {
      if (t.name.toLowerCase().includes(q)) {
        items.push({
          id: `tech-${t.id}`,
          category: 'technology',
          title: t.name,
          subtitle: `${t.category} • ${(t.confidence * 100).toFixed(0)}% confidence`,
          badge: 'TECH',
          icon: Cpu,
          action: () => {
            onClose();
          },
        });
      }
    }

    return items.slice(0, 15);
  }, [query, files, symbols, routes, technologies, onOpenSource, onSelectRoute, onClose]);

  // Handle arrow keys
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[selectedIndex]) {
        results[selectedIndex].action();
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl glass-panel-elevated shadow-2xl border border-indigo-500/30 overflow-hidden flex flex-col text-slate-100">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-slate-800 flex items-center gap-3 bg-slate-900/90">
          <Search className="h-5 w-5 text-indigo-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search files, symbols, routes, or database schemas... (e.g. OrderService, POST /orders)"
            className="w-full bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching files, symbols, or routes found for &ldquo;{query}&rdquo;.
            </div>
          ) : (
            results.map((item, index) => {
              const isSelected = selectedIndex === index;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`p-2.5 rounded-xl cursor-pointer flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-white'
                      : 'hover:bg-slate-900/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-white truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="h-3.5 w-3.5 text-indigo-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>esc to close</span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
