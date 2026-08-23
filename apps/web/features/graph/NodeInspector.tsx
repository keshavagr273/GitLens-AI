'use client';

import React from 'react';
import { GraphNode, GraphEdge, SymbolNode } from '@gitlens/shared-types';
import {
  X,
  FileCode2,
  Server,
  Database,
  Code2,
  Layers,
  ArrowRight,
  ArrowLeft,
  Activity,
  AlertTriangle,
  ExternalLink,
  Flame,
} from 'lucide-react';

interface Props {
  node: GraphNode;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  symbols: SymbolNode[];
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  onOpenSource: (filePath: string, lineRange?: [number, number]) => void;
}

export function NodeInspector({
  node,
  edges,
  allNodes,
  symbols,
  onClose,
  onSelectNode,
  onOpenSource,
}: Props) {
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));

  // Inbound edges (who depends on this node)
  const inboundEdges = edges.filter((e) => e.targetId === node.id);
  const inboundNodes = inboundEdges
    .map((e) => ({ node: nodeMap.get(e.sourceId), edge: e }))
    .filter((item): item is { node: GraphNode; edge: GraphEdge } => !!item.node);

  // Outbound edges (what this node depends on)
  const outboundEdges = edges.filter((e) => e.sourceId === node.id);
  const outboundNodes = outboundEdges
    .map((e) => ({ node: nodeMap.get(e.targetId), edge: e }))
    .filter((item): item is { node: GraphNode; edge: GraphEdge } => !!item.node);

  // Member symbols in this file
  const memberSymbols = symbols.filter(
    (s) => s.fileId === node.id || (node.path && s.fileId.includes(node.name))
  );

  const inCycle = !!node.metadata?.inCycle;
  const importanceScore = Number(node.metadata?.importanceScore || 5.0);

  return (
    <div className="w-84 rounded-2xl glass-panel-elevated shadow-2xl border border-indigo-500/30 p-4 text-xs text-slate-100 flex flex-col max-h-[480px] overflow-hidden animate-in fade-in slide-in-from-right-2">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            {node.type === 'module' ? (
              <Server className="h-4 w-4" />
            ) : node.type === 'database_table' ? (
              <Database className="h-4 w-4 text-cyan-400" />
            ) : (
              <FileCode2 className="h-4 w-4 text-emerald-400" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm text-white truncate">{node.name}</h4>
            <span className="text-[10px] font-mono uppercase text-slate-400 px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 inline-block">
              {node.type}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 my-3 shrink-0">
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">Importance:</span>
          <span className="font-mono text-cyan-300 font-bold">{importanceScore.toFixed(1)}</span>
        </div>
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
          <span className="text-slate-400 text-[10px]">In / Out:</span>
          <span className="font-mono text-indigo-300 font-bold">
            {inboundNodes.length} / {outboundNodes.length}
          </span>
        </div>
      </div>

      {inCycle && (
        <div className="mb-3 p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] flex items-center gap-2 shrink-0">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>Part of a circular dependency cycle (Tarjan SCC).</span>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {/* Source File Link */}
        {node.path && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Source Path:</span>
            <div
              onClick={() => onOpenSource(node.path!)}
              className="mt-1 p-2 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between group transition-colors"
            >
              <span className="font-mono text-[11px] text-indigo-300 group-hover:text-white truncate">
                {node.path}
              </span>
              <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 shrink-0 ml-1" />
            </div>
          </div>
        )}

        {/* Inbound Dependents */}
        {inboundNodes.length > 0 && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
              <ArrowLeft className="h-3 w-3 text-cyan-400" />
              <span>Inbound Callers ({inboundNodes.length}):</span>
            </span>
            <div className="mt-1 space-y-1">
              {inboundNodes.map(({ node: inNode, edge }) => (
                <div
                  key={edge.id}
                  onClick={() => onSelectNode(inNode)}
                  className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className="font-mono text-[11px] text-slate-200 truncate">{inNode.name}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                    {edge.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Outbound Dependencies */}
        {outboundNodes.length > 0 && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-emerald-400" />
              <span>Dependencies ({outboundNodes.length}):</span>
            </span>
            <div className="mt-1 space-y-1">
              {outboundNodes.map(({ node: outNode, edge }) => (
                <div
                  key={edge.id}
                  onClick={() => onSelectNode(outNode)}
                  className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className="font-mono text-[11px] text-slate-200 truncate">{outNode.name}</span>
                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    {edge.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted Symbols */}
        {memberSymbols.length > 0 && (
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              AST Symbols ({memberSymbols.length}):
            </span>
            <div className="mt-1 space-y-1">
              {memberSymbols.slice(0, 8).map((sym) => (
                <div
                  key={sym.id}
                  onClick={() => onOpenSource(node.path || sym.fileId, [sym.startLine, sym.endLine])}
                  className="p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-indigo-500/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <Code2 className="h-3 w-3 text-indigo-400 shrink-0" />
                    <span className="font-mono text-[11px] text-slate-200 truncate">{sym.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    L{sym.startLine}-{sym.endLine}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
