'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GraphNode, GraphEdge } from '@gitlens/shared-types';
import {
  Server,
  Database,
  Code2,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  Radio,
} from 'lucide-react';

interface Props {
  nodes: GraphNode[];
  edges: GraphEdge[];
  selectedNode: GraphNode | null;
  onSelectNode: (node: GraphNode | null) => void;
  onOpenSource: (filePath: string) => void;
}

interface NodePosition {
  x: number;
  y: number;
}

export function GraphCanvas({
  nodes,
  edges,
  selectedNode,
  onSelectNode,
  onOpenSource,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Calculate layout positions for nodes
  const nodePositions = useMemo(() => {
    const positions = new Map<string, NodePosition>();
    const nodeWidth = 200;
    const nodeHeight = 85;
    const horizontalSpacing = 240;
    const verticalSpacing = 160;

    // Categorize nodes by architecture layer
    const routes = nodes.filter((n) => n.type === 'route');
    const controllers = nodes.filter((n) => n.name.includes('Controller') || n.path?.includes('controllers'));
    const modules = nodes.filter((n) => n.type === 'module' && !routes.includes(n));
    const services = nodes.filter((n) => n.name.includes('Service') || n.path?.includes('services'));
    const repos = nodes.filter((n) => n.name.includes('Repository') || n.name.includes('Client'));
    const dbs = nodes.filter((n) => n.type === 'database_table' || n.type === 'queue');

    const others = nodes.filter(
      (n) =>
        !routes.includes(n) &&
        !controllers.includes(n) &&
        !modules.includes(n) &&
        !services.includes(n) &&
        !repos.includes(n) &&
        !dbs.includes(n)
    );

    const layers: GraphNode[][] = [
      modules.length > 0 ? modules : [routes[0] || nodes[0]],
      routes.length > 0 ? routes : [],
      controllers.length > 0 ? controllers : [],
      services.length > 0 ? services : [],
      repos.length > 0 ? repos : others,
      dbs.length > 0 ? dbs : [],
    ].filter((l) => l.length > 0);

    let currentY = 60;
    layers.forEach((layer) => {
      const totalWidth = layer.length * horizontalSpacing;
      const startX = 450 - totalWidth / 2;

      layer.forEach((node, idx) => {
        positions.set(node.id, {
          x: startX + idx * horizontalSpacing,
          y: currentY,
        });
      });
      currentY += verticalSpacing;
    });

    // Fallback for any unplaced nodes
    nodes.forEach((node, idx) => {
      if (!positions.has(node.id)) {
        positions.set(node.id, {
          x: 100 + (idx % 3) * horizontalSpacing,
          y: 100 + Math.floor(idx / 3) * verticalSpacing,
        });
      }
    });

    return positions;
  }, [nodes]);

  // Handle pan drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(1.8, Math.max(0.4, z * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    onSelectNode(null);
  };

  // Determine active highlights
  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>([selectedNode.id]);
    for (const edge of edges) {
      if (edge.sourceId === selectedNode.id) set.add(edge.targetId);
      if (edge.targetId === selectedNode.id) set.add(edge.sourceId);
    }
    return set;
  }, [selectedNode, edges]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none bg-slate-950/60 ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Background Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#4f46e5" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Canvas Controls Toolbar */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 glass-panel p-1.5 rounded-xl border border-slate-800 shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset View"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />
        <span className="px-2 text-[11px] font-mono text-slate-400">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Zoomed & Panned Canvas Viewport */}
      <div
        className="absolute inset-0 origin-top-left transition-transform duration-75 pointer-events-auto"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* SVG Edges Layer */}
        <svg className="absolute inset-0 w-[2000px] h-[2000px] pointer-events-none">
          <defs>
            <marker
              id="arrow-default"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" opacity="0.6" />
            </marker>
            <marker
              id="arrow-cyan"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#22d3ee" />
            </marker>
            <marker
              id="arrow-emerald"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#34d399" />
            </marker>
          </defs>

          {edges.map((edge) => {
            const sourcePos = nodePositions.get(edge.sourceId);
            const targetPos = nodePositions.get(edge.targetId);
            if (!sourcePos || !targetPos) return null;

            const isSourceSelected = selectedNode?.id === edge.sourceId;
            const isTargetSelected = selectedNode?.id === edge.targetId;
            const isHighlighted = isSourceSelected || isTargetSelected;
            const isDimmed = selectedNode && !isHighlighted;

            const startX = sourcePos.x + 95;
            const startY = sourcePos.y + 70;
            const endX = targetPos.x + 95;
            const endY = targetPos.y + 5;

            const deltaY = endY - startY;
            const controlY1 = startY + deltaY * 0.5;
            const controlY2 = endY - deltaY * 0.5;

            const pathD = `M ${startX} ${startY} C ${startX} ${controlY1}, ${endX} ${controlY2}, ${endX} ${endY}`;

            return (
              <g key={edge.id} className="transition-opacity duration-200" opacity={isDimmed ? 0.15 : 1.0}>
                <path
                  d={pathD}
                  fill="none"
                  stroke={
                    isSourceSelected
                      ? '#34d399'
                      : isTargetSelected
                      ? '#22d3ee'
                      : '#4f46e5'
                  }
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray={edge.confidence === 'inferred' ? '5,5' : undefined}
                  markerEnd={
                    isSourceSelected
                      ? 'url(#arrow-emerald)'
                      : isTargetSelected
                      ? 'url(#arrow-cyan)'
                      : 'url(#arrow-default)'
                  }
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer */}
        {nodes.map((node) => {
          const pos = nodePositions.get(node.id);
          if (!pos) return null;

          const isSelected = selectedNode?.id === node.id;
          const isConnected = connectedNodeIds.has(node.id);
          const isDimmed = selectedNode && !isSelected && !isConnected;
          const inCycle = !!node.metadata?.inCycle;

          return (
            <div
              key={node.id}
              onClick={() => onSelectNode(isSelected ? null : node)}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: '190px',
              }}
              className={`canvas-node absolute p-3 rounded-2xl glass-panel border cursor-pointer transition-all duration-200 hover:scale-105 shadow-lg ${
                isDimmed
                  ? 'opacity-30'
                  : isSelected
                  ? 'border-cyan-400 shadow-glow-cyan bg-slate-900/95 ring-2 ring-cyan-400/40'
                  : inCycle
                  ? 'border-red-500/60 bg-red-950/20'
                  : 'border-slate-800 hover:border-indigo-500/60 bg-slate-900/90'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="h-7 w-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  {node.type === 'module' ? (
                    <Server className="h-3.5 w-3.5" />
                  ) : node.type === 'database_table' ? (
                    <Database className="h-3.5 w-3.5 text-cyan-400" />
                  ) : (
                    <Code2 className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {inCycle && (
                    <span className="text-[8px] font-mono uppercase px-1 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                      Cycle
                    </span>
                  )}
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                    {node.type}
                  </span>
                </div>
              </div>

              <h4 className="font-semibold text-xs text-white truncate">{node.name}</h4>
              {node.path && (
                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{node.path}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
