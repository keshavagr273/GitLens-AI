'use client';

import React from 'react';
import { GraphNode, GraphEdge, SymbolNode } from '@gitlens/shared-types';
import {
  X,
  FileCode2,
  Server,
  Database,
  Code2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  ExternalLink,
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

  // Inbound edges
  const inboundEdges = edges.filter((e) => e.targetId === node.id);
  const inboundNodes = inboundEdges
    .map((e) => ({ node: nodeMap.get(e.sourceId), edge: e }))
    .filter((item): item is { node: GraphNode; edge: GraphEdge } => !!item.node);

  // Outbound edges
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
    <div className="w-80 rounded-[4px] bg-[#141312] border border-white/10 p-4 text-xs text-[#f5f3ee] flex flex-col max-h-[480px] overflow-hidden animate-in fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/8 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-[2px] bg-[#0a0a0b] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d] shrink-0">
            {node.type === 'module' ? (
              <Server className="h-3.5 w-3.5" />
            ) : node.type === 'database_table' ? (
              <Database className="h-3.5 w-3.5" />
            ) : (
              <FileCode2 className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="font-serif text-sm font-normal text-[#f5f3ee] truncate">{node.name}</h4>
            <span className="text-[9px] font-mono uppercase text-[#e8a33d] px-1.5 py-0.2 rounded-[2px] bg-[#0a0a0b] border border-[#e8a33d]/30 inline-block">
              {node.type}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-2 my-3 shrink-0 font-mono text-[11px]">
        <div className="p-2 rounded-[3px] bg-[#0a0a0b] border border-white/8 flex items-center justify-between">
          <span className="text-[#a09f9c] text-[10px]">Importance:</span>
          <span className="text-[#e8a33d] font-bold">{importanceScore.toFixed(1)}</span>
        </div>
        <div className="p-2 rounded-[3px] bg-[#0a0a0b] border border-white/8 flex items-center justify-between">
          <span className="text-[#a09f9c] text-[10px]">In / Out:</span>
          <span className="text-[#f5f3ee] font-bold">
            {inboundNodes.length} / {outboundNodes.length}
          </span>
        </div>
      </div>

      {inCycle && (
        <div className="mb-3 p-2 rounded-[3px] bg-red-950/40 border border-red-800/40 text-red-300 text-[10px] flex items-center gap-1.5 shrink-0 font-mono">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
          <span>Part of a circular dependency cycle (Tarjan SCC).</span>
        </div>
      )}

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 font-mono text-xs">
        {/* Source File Link */}
        {node.path && (
          <div>
            <span className="text-[9px] text-[#a09f9c] uppercase font-bold tracking-wider">Source Path:</span>
            <div
              onClick={() => onOpenSource(node.path!)}
              className="mt-1 p-2 rounded-[3px] bg-[#0a0a0b] border border-white/8 hover:border-[#e8a33d]/50 cursor-pointer flex items-center justify-between group transition-all"
            >
              <span className="text-[10px] text-[#e8a33d] group-hover:text-[#f5f3ee] truncate">
                {node.path}
              </span>
              <ExternalLink className="h-3 w-3 text-[#4b5563] group-hover:text-[#e8a33d] shrink-0 ml-1" />
            </div>
          </div>
        )}

        {/* Inbound Dependents */}
        {inboundNodes.length > 0 && (
          <div>
            <span className="text-[9px] text-[#a09f9c] uppercase font-bold tracking-wider flex items-center gap-1">
              <ArrowLeft className="h-3 w-3 text-[#e8a33d]" />
              <span>Inbound Callers ({inboundNodes.length}):</span>
            </span>
            <div className="mt-1 space-y-1">
              {inboundNodes.map(({ node: inNode, edge }) => (
                <div
                  key={edge.id}
                  onClick={() => onSelectNode(inNode)}
                  className="p-1.5 rounded-[2px] bg-[#0a0a0b] border border-white/5 hover:border-[#e8a33d]/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className="text-[10px] text-[#f5f3ee] truncate">{inNode.name}</span>
                  <span className="text-[8px] px-1 py-0.2 rounded-[2px] bg-[#141312] text-[#a09f9c] border border-white/5">
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
            <span className="text-[9px] text-[#a09f9c] uppercase font-bold tracking-wider flex items-center gap-1">
              <ArrowRight className="h-3 w-3 text-emerald-400" />
              <span>Dependencies ({outboundNodes.length}):</span>
            </span>
            <div className="mt-1 space-y-1">
              {outboundNodes.map(({ node: outNode, edge }) => (
                <div
                  key={edge.id}
                  onClick={() => onSelectNode(outNode)}
                  className="p-1.5 rounded-[2px] bg-[#0a0a0b] border border-white/5 hover:border-emerald-500/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <span className="text-[10px] text-[#f5f3ee] truncate">{outNode.name}</span>
                  <span className="text-[8px] px-1 py-0.2 rounded-[2px] bg-[#141312] text-[#a09f9c] border border-white/5">
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
            <span className="text-[9px] text-[#a09f9c] uppercase font-bold tracking-wider">
              AST Symbols ({memberSymbols.length}):
            </span>
            <div className="mt-1 space-y-1">
              {memberSymbols.slice(0, 8).map((sym) => (
                <div
                  key={sym.id}
                  onClick={() => onOpenSource(node.path || sym.fileId, [sym.startLine, sym.endLine])}
                  className="p-1.5 rounded-[2px] bg-[#0a0a0b] border border-white/5 hover:border-[#e8a33d]/40 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-1 truncate">
                    <Code2 className="h-3 w-3 text-[#e8a33d] shrink-0" />
                    <span className="text-[10px] text-[#f5f3ee] truncate">{sym.name}</span>
                  </div>
                  <span className="text-[9px] text-[#4b5563]">
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
