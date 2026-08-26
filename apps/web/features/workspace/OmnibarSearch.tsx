'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  FileCode2,
  Code2,
  Box,
  Zap,
  Cpu,
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

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      } else if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const results: SearchResultItem[] = React.useMemo(() => {
    if (!query.trim()) {
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4 bg-black/80 backdrop-blur-md animate-in fade-in font-mono">
      <div className="w-full max-w-2xl rounded-[4px] bg-[#141312] border border-white/10 shadow-2xl overflow-hidden flex flex-col text-[#f5f3ee]">
        {/* Search Input Bar */}
        <div className="p-3.5 border-b border-white/8 flex items-center gap-3 bg-[#0a0a0b]">
          <Search className="h-4 w-4 text-[#e8a33d] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search files, symbols, routes, schemas... (e.g. OrderService, POST /orders)"
            className="w-full bg-transparent text-xs text-[#f5f3ee] placeholder-[#4b5563] focus:outline-none font-mono"
          />
          <button
            onClick={onClose}
            className="p-1 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {results.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#a09f9c]">
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
                  className={`p-2.5 rounded-[3px] cursor-pointer flex items-center justify-between transition-all ${
                    isSelected
                      ? 'bg-[#0a0a0b] border border-[#e8a33d] text-[#f5f3ee]'
                      : 'hover:bg-white/5 text-[#a09f9c] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`h-7 w-7 rounded-[2px] flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#141312] text-[#e8a33d] border border-[#e8a33d]/40'
                          : 'bg-[#0a0a0b] text-[#4b5563] border border-white/5'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-semibold text-[#f5f3ee] truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-[#a09f9c] truncate">{item.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.badge && (
                      <span className="text-[9px] font-mono px-2 py-0.2 rounded-[2px] bg-[#0a0a0b] text-[#e8a33d] border border-[#e8a33d]/30">
                        {item.badge}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="h-3 w-3 text-[#e8a33d]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hints */}
        <div className="px-4 py-2 border-t border-white/8 bg-[#0a0a0b] flex items-center justify-between text-[9px] text-[#4b5563] font-mono">
          <div className="flex items-center gap-3">
            <span>↑↓ navigate</span>
            <span>↵ select</span>
            <span>esc close</span>
          </div>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
