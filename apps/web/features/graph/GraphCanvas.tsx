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
  FileCode,
  CheckCircle2,
  ExternalLink,
  X,
  Move,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
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
  const [zoom, setZoom] = useState(0.60);
  const [pan, setPan] = useState({ x: 20, y: 15 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Custom dragged positions map (nodeId -> {x, y})
  const [customPositions, setCustomPositions] = useState<Map<string, NodePosition>>(new Map());
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Reset custom positions when nodes change radically
  useEffect(() => {
    setCustomPositions(new Map());
  }, [nodes.length]);

  // Initial computed layout positions for nodes
  const initialPositions = useMemo(() => {
    const positions = new Map<string, NodePosition>();
    const horizontalSpacing = 240;
    const verticalSpacing = 160;

    // Categorize nodes into clean top-to-bottom DAG tiers
    const clients = nodes.filter((n) => n.metadata?.layer === 'client' || n.id.includes('web-app'));
    const gateways = nodes.filter(
      (n) => (n.metadata?.layer === 'gateway' || n.id.includes('gateway') || n.id.includes('tus') || n.id.includes('socket')) && !clients.includes(n)
    );
    const controllers = nodes.filter((n) => n.metadata?.layer === 'controller' || n.type === 'route' || n.name.includes('Controller'));
    const services = nodes.filter(
      (n) =>
        (n.metadata?.layer === 'service' || n.id.includes('middleware') || n.id.includes('media') || n.id.includes('cron') || n.id.includes('s3') || n.id.includes('sqs')) &&
        !gateways.includes(n) &&
        !controllers.includes(n)
    );
    const workers = nodes.filter((n) => (n.metadata?.layer === 'worker' || n.id.includes('worker')) && !services.includes(n));
    const dbs = nodes.filter((n) => (n.metadata?.layer === 'database' || n.type === 'database_table') && !services.includes(n));
    const caches = nodes.filter((n) => (n.metadata?.layer === 'cache' || n.type === 'queue') && !services.includes(n));

    const others = nodes.filter(
      (n) =>
        !clients.includes(n) &&
        !gateways.includes(n) &&
        !controllers.includes(n) &&
        !services.includes(n) &&
        !workers.includes(n) &&
        !dbs.includes(n) &&
        !caches.includes(n)
    );

    const layers: GraphNode[][] = [
      [...clients, ...gateways].filter(Boolean),
      controllers.length > 0 ? controllers : [],
      services.length > 0 ? services : [],
      workers.length > 0 ? workers : [],
      others.length > 0 ? others : [],
      [...dbs, ...caches].filter(Boolean),
    ].filter((l) => l.length > 0);

    let currentY = 50;
    const maxCols = 4;

    layers.forEach((layer) => {
      const rowCount = Math.ceil(layer.length / maxCols);

      for (let r = 0; r < rowCount; r++) {
        const rowNodes = layer.slice(r * maxCols, (r + 1) * maxCols);
        const totalWidth = rowNodes.length * horizontalSpacing;
        // Center every layer row symmetrically around X = 650
        const startX = 650 - totalWidth / 2 + 20;

        rowNodes.forEach((node, colIdx) => {
          positions.set(node.id, {
            x: startX + colIdx * horizontalSpacing,
            y: currentY + r * verticalSpacing,
          });
        });
      }

      currentY += Math.max(1, rowCount) * verticalSpacing + 40;
    });

    // Fallback for any unplaced nodes
    nodes.forEach((node, idx) => {
      if (!positions.has(node.id)) {
        positions.set(node.id, {
          x: 200 + (idx % 4) * horizontalSpacing,
          y: currentY + Math.floor(idx / 4) * verticalSpacing,
        });
      }
    });

    return positions;
  }, [nodes]);

  // Combined node positions (custom dragged overrides initial)
  const getNodePos = (nodeId: string): NodePosition => {
    return customPositions.get(nodeId) || initialPositions.get(nodeId) || { x: 100, y: 100 };
  };

  // Canvas background Pan handlers
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node') || (e.target as HTMLElement).closest('.inspector-panel')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  // Node Drag start
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    const currentPos = getNodePos(node.id);
    setDraggingNodeId(node.id);

    // Calculate click offset relative to node origin
    const canvasX = (e.clientX - pan.x) / zoom;
    const canvasY = (e.clientY - pan.y) / zoom;
    setDragOffset({
      x: canvasX - currentPos.x,
      y: canvasY - currentPos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;
      const newX = canvasX - dragOffset.x;
      const newY = canvasY - dragOffset.y;

      setCustomPositions((prev) => {
        const next = new Map(prev);
        next.set(draggingNodeId, { x: Math.round(newX), y: Math.round(newY) });
        return next;
      });
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(1.8, Math.max(0.35, z * zoomFactor)));
  };

  const resetView = () => {
    setZoom(0.60);
    setPan({ x: 0, y: 0 });
    setCustomPositions(new Map());
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

  // Selected node metadata helpers
  const selectedFunctionalities: string[] = useMemo(() => {
    if (!selectedNode) return [];
    if (Array.isArray(selectedNode.metadata?.functionalities)) {
      return selectedNode.metadata.functionalities as string[];
    }
    return [
      `Executes core architectural responsibilities for ${selectedNode.name}`,
      `Maintains interface contracts and transactional boundaries`,
    ];
  }, [selectedNode]);

  const selectedAssociatedFiles: string[] = useMemo(() => {
    if (!selectedNode) return [];
    if (Array.isArray(selectedNode.metadata?.associatedFiles) && selectedNode.metadata.associatedFiles.length > 0) {
      return selectedNode.metadata.associatedFiles as string[];
    }
    if (selectedNode.path) return [selectedNode.path];
    return [];
  }, [selectedNode]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      className={`relative w-full h-full overflow-hidden select-none bg-slate-950/80 ${
        isPanning ? 'cursor-grabbing' : draggingNodeId ? 'cursor-move' : 'cursor-grab'
      }`}
    >
      {/* Background Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <defs>
          <pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#6366f1" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Canvas Controls Toolbar & Hint */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-800 text-[11px] text-slate-400">
        <Move className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
        <span>Drag any node to rearrange • Click to inspect files & functions</span>
      </div>

      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 glass-panel p-1.5 rounded-xl border border-slate-800 shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Reset Layout & Positions"
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
        <svg className="absolute inset-0 w-[4000px] h-[4000px] pointer-events-none">
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
            const sourcePos = getNodePos(edge.sourceId);
            const targetPos = getNodePos(edge.targetId);
            if (!sourcePos || !targetPos) return null;

            const isSourceSelected = selectedNode?.id === edge.sourceId;
            const isTargetSelected = selectedNode?.id === edge.targetId;
            const isHighlighted = isSourceSelected || isTargetSelected;
            const isDimmed = selectedNode && !isHighlighted;

            // Compute smart directional anchors based on relative node positions
            const srcCenterX = sourcePos.x + 100;
            const srcCenterY = sourcePos.y + 40;
            const tgtCenterX = targetPos.x + 100;
            const tgtCenterY = targetPos.y + 40;

            const dx = tgtCenterX - srcCenterX;
            const dy = tgtCenterY - srcCenterY;

            let startX: number, startY: number, endX: number, endY: number;
            let controlX1: number, controlY1: number, controlX2: number, controlY2: number;

            if (Math.abs(dy) >= Math.abs(dx)) {
              if (dy >= 0) {
                // Target is below -> connect bottom of source to top of target
                startX = srcCenterX;
                startY = sourcePos.y + 80;
                endX = tgtCenterX;
                endY = targetPos.y;
                controlX1 = startX;
                controlY1 = startY + dy * 0.45;
                controlX2 = endX;
                controlY2 = startY + dy * 0.55;
              } else {
                // Target is above -> connect top of source to bottom of target
                startX = srcCenterX;
                startY = sourcePos.y;
                endX = tgtCenterX;
                endY = targetPos.y + 80;
                controlX1 = startX;
                controlY1 = startY + dy * 0.45;
                controlX2 = endX;
                controlY2 = startY + dy * 0.55;
              }
            } else {
              if (dx >= 0) {
                // Target is to the right -> connect right of source to left of target
                startX = sourcePos.x + 200;
                startY = srcCenterY;
                endX = targetPos.x;
                endY = tgtCenterY;
                controlX1 = startX + dx * 0.45;
                controlY1 = startY;
                controlX2 = startX + dx * 0.55;
                controlY2 = endY;
              } else {
                // Target is to the left -> connect left of source to right of target
                startX = sourcePos.x;
                startY = srcCenterY;
                endX = targetPos.x + 200;
                endY = tgtCenterY;
                controlX1 = startX + dx * 0.45;
                controlY1 = startY;
                controlX2 = startX + dx * 0.55;
                controlY2 = endY;
              }
            }

            const pathD = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

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
          const pos = getNodePos(node.id);
          const isSelected = selectedNode?.id === node.id;
          const isConnected = connectedNodeIds.has(node.id);
          const isDimmed = selectedNode && !isSelected && !isConnected;
          const isBeingDragged = draggingNodeId === node.id;

          const layer = (node.metadata?.layer as string) || 'default';

          return (
            <div
              key={node.id}
              onMouseDown={(e) => handleNodeMouseDown(e, node)}
              onClick={(e) => {
                e.stopPropagation();
                onSelectNode(isSelected ? null : node);
              }}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: '200px',
                zIndex: isBeingDragged ? 50 : isSelected ? 40 : 10,
              }}
              className={`canvas-node absolute p-3 rounded-2xl glass-panel border cursor-grab active:cursor-grabbing transition-shadow duration-150 shadow-xl ${
                isDimmed
                  ? 'opacity-30'
                  : isSelected
                  ? 'border-cyan-400 shadow-glow-cyan bg-slate-900/98 ring-2 ring-cyan-400/50 scale-[1.03]'
                  : isBeingDragged
                  ? 'border-indigo-400 shadow-glow bg-slate-900/98 ring-2 ring-indigo-400/50 scale-105'
                  : 'border-slate-800 hover:border-indigo-500/60 bg-slate-900/90 hover:scale-[1.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`h-7 w-7 rounded-lg flex items-center justify-center ${
                    layer === 'client'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : layer === 'gateway'
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                      : layer === 'controller'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : layer === 'service'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : layer === 'database'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : layer === 'cache'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {node.type === 'module' ? (
                    <Server className="h-3.5 w-3.5" />
                  ) : node.type === 'database_table' || layer === 'database' ? (
                    <Database className="h-3.5 w-3.5" />
                  ) : (
                    <Code2 className="h-3.5 w-3.5" />
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span
                    className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${
                      layer === 'client'
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                        : layer === 'gateway'
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                        : layer === 'controller'
                        ? 'bg-blue-950/80 text-blue-300 border-blue-800'
                        : layer === 'service'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                        : layer === 'database'
                        ? 'bg-amber-950/80 text-amber-300 border-amber-800'
                        : layer === 'cache'
                        ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {layer}
                  </span>
                </div>
              </div>

              <h4 className="font-bold text-xs text-white truncate">{node.name}</h4>
              {node.path ? (
                <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{node.path}</p>
              ) : node.metadata?.role ? (
                <p className="text-[10px] text-slate-400 truncate mt-0.5">{node.metadata.role as string}</p>
              ) : null}

              {/* Click Indicator Chip */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                <span>Click to inspect</span>
                <Move className="h-3 w-3 text-slate-600" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Interactive Node Inspector Drawer / Floating Panel */}
      {selectedNode && (
        <div className="inspector-panel absolute bottom-4 left-4 z-40 w-[380px] max-h-[80vh] overflow-y-auto glass-panel-elevated p-4 rounded-2xl border border-cyan-500/40 shadow-2xl animate-fade-in">
          <div className="flex items-start justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                {selectedNode.type === 'module' ? (
                  <Server className="h-4 w-4" />
                ) : selectedNode.type === 'database_table' ? (
                  <Database className="h-4 w-4" />
                ) : (
                  <Code2 className="h-4 w-4" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">{selectedNode.name}</h3>
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                  {(selectedNode.metadata?.layer as string) || selectedNode.type}
                </span>
              </div>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Role / Summary */}
          {Boolean(selectedNode.metadata?.role) && (
            <div className="my-3 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300">
              <span className="font-medium text-slate-400 block mb-0.5 text-[11px] uppercase tracking-wider">Role</span>
              {String(selectedNode.metadata?.role || '')}
            </div>
          )}

          {/* Functionalities & Responsibilities */}
          <div className="my-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
              <span>Core Functionalities</span>
            </h4>
            <div className="space-y-1.5">
              {selectedFunctionalities.map((func, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{func}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Depicted Source Files */}
          <div className="my-3">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-indigo-400" />
              <span>Depicted Source Files ({selectedAssociatedFiles.length})</span>
            </h4>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {selectedAssociatedFiles.map((file, i) => (
                <button
                  key={i}
                  onClick={() => onOpenSource(file)}
                  className="w-full flex items-center justify-between gap-2 text-xs text-left p-2 rounded-lg bg-slate-900/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-colors group"
                >
                  <span className="font-mono text-[11px] truncate text-indigo-300 group-hover:text-cyan-300">{file}</span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-cyan-400 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
