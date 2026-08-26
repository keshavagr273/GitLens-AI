'use client';

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { GraphNode, GraphEdge } from '@gitlens/shared-types';
import {
  Server,
  Database,
  Code2,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  FileCode,
  CheckCircle2,
  ExternalLink,
  X,
  Move,
  Sparkles,
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
  const [zoom, setZoom] = useState(0.55);
  const [pan, setPan] = useState({ x: 20, y: 15 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Custom dragged positions map (nodeId -> {x, y})
  const [customPositions, setCustomPositions] = useState<Map<string, NodePosition>>(new Map());
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragMovedRef = useRef(false);
  const dragStartCoordsRef = useRef({ x: 0, y: 0 });

  // Reset custom positions when nodes change radically
  useEffect(() => {
    setCustomPositions(new Map());
  }, [nodes.length]);

  // Initial computed layout positions for nodes
  const initialPositions = useMemo(() => {
    const positions = new Map<string, NodePosition>();
    const horizontalSpacing = 310;
    const verticalSpacing = 200;

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
    const maxCols = 3;

    layers.forEach((layer) => {
      const rowCount = Math.ceil(layer.length / maxCols);

      for (let r = 0; r < rowCount; r++) {
        const rowNodes = layer.slice(r * maxCols, (r + 1) * maxCols);
        const totalWidth = rowNodes.length * horizontalSpacing;
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
          x: 200 + (idx % 3) * horizontalSpacing,
          y: currentY + Math.floor(idx / 3) * verticalSpacing,
        });
      }
    });

    return positions;
  }, [nodes]);

  const getNodePos = (nodeId: string): NodePosition => {
    return customPositions.get(nodeId) || initialPositions.get(nodeId) || { x: 100, y: 100 };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.canvas-node') || (e.target as HTMLElement).closest('.inspector-panel')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    dragMovedRef.current = false;
    dragStartCoordsRef.current = { x: e.clientX, y: e.clientY };

    const currentPos = getNodePos(node.id);
    setDraggingNodeId(node.id);

    const canvasX = (e.clientX - pan.x) / zoom;
    const canvasY = (e.clientY - pan.y) / zoom;
    setDragOffset({
      x: canvasX - currentPos.x,
      y: canvasY - currentPos.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingNodeId) {
      const dist = Math.hypot(e.clientX - dragStartCoordsRef.current.x, e.clientY - dragStartCoordsRef.current.y);
      if (dist > 5) {
        dragMovedRef.current = true;
      }

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
    setZoom((z) => Math.min(2.0, Math.max(0.4, z * zoomFactor)));
  };

  const resetView = () => {
    setZoom(0.55);
    setPan({ x: 20, y: 15 });
    setCustomPositions(new Map());
    onSelectNode(null);
  };

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>([selectedNode.id]);
    for (const edge of edges) {
      if (edge.sourceId === selectedNode.id) set.add(edge.targetId);
      if (edge.targetId === selectedNode.id) set.add(edge.sourceId);
    }
    return set;
  }, [selectedNode, edges]);

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
      className={`relative w-full h-full overflow-hidden select-none bg-[#0a0a0b] ${
        isPanning ? 'cursor-grabbing' : draggingNodeId ? 'cursor-move' : 'cursor-grab'
      }`}
    >
      {/* Background Grid Pattern */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
        <defs>
          <pattern id="grid-dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e8a33d" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)" />
      </svg>

      {/* Canvas Controls Toolbar */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-2 px-3.5 py-1.5 rounded-[3px] bg-[#141312] border border-white/8 text-xs font-mono text-[#a09f9c]">
        <Move className="h-3.5 w-3.5 text-[#e8a33d]" />
        <span>Drag nodes to rearrange • Click to inspect source</span>
      </div>

      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-[#141312] p-1.5 rounded-[3px] border border-white/8 font-mono">
        <button
          onClick={() => setZoom((z) => Math.min(2.0, z + 0.15))}
          className="p-1.5 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
          className="p-1.5 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
          title="Reset View"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <div className="h-3.5 w-[1px] bg-white/10 mx-0.5" />
        <span className="px-2 text-xs font-semibold text-[#e8a33d]">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Canvas Viewport */}
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
              id="arrow-amber"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#e8a33d" />
            </marker>
            <marker
              id="arrow-subtle"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#cbd5e1" />
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

            // Updated for 260px wide by 100px tall nodes
            const srcCenterX = sourcePos.x + 130;
            const srcCenterY = sourcePos.y + 50;
            const tgtCenterX = targetPos.x + 130;
            const tgtCenterY = targetPos.y + 50;

            const dx = tgtCenterX - srcCenterX;
            const dy = tgtCenterY - srcCenterY;

            let startX: number, startY: number, endX: number, endY: number;
            let controlX1: number, controlY1: number, controlX2: number, controlY2: number;

            if (Math.abs(dy) >= Math.abs(dx)) {
              if (dy >= 0) {
                startX = srcCenterX;
                startY = sourcePos.y + 100;
                endX = tgtCenterX;
                endY = targetPos.y;
                controlX1 = startX;
                controlY1 = startY + dy * 0.45;
                controlX2 = endX;
                controlY2 = startY + dy * 0.55;
              } else {
                startX = srcCenterX;
                startY = sourcePos.y;
                endX = tgtCenterX;
                endY = targetPos.y + 100;
                controlX1 = startX;
                controlY1 = startY + dy * 0.45;
                controlX2 = endX;
                controlY2 = startY + dy * 0.55;
              }
            } else {
              if (dx >= 0) {
                startX = sourcePos.x + 260;
                startY = srcCenterY;
                endX = targetPos.x;
                endY = tgtCenterY;
                controlX1 = startX + dx * 0.45;
                controlY1 = startY;
                controlX2 = startX + dx * 0.55;
                controlY2 = endY;
              } else {
                startX = sourcePos.x;
                startY = srcCenterY;
                endX = targetPos.x + 260;
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
                  stroke={isHighlighted ? '#e8a33d' : 'rgba(245, 243, 238, 0.42)'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray={edge.confidence === 'inferred' ? '4,4' : undefined}
                  markerEnd={isHighlighted ? 'url(#arrow-amber)' : 'url(#arrow-subtle)'}
                />
              </g>
            );
          })}
        </svg>

        {/* Nodes Layer - Larger cards and text */}
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
                if (dragMovedRef.current) {
                  dragMovedRef.current = false;
                  return;
                }
                onSelectNode(isSelected ? null : node);
              }}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
                width: '260px',
                zIndex: isBeingDragged ? 50 : isSelected ? 40 : 10,
              }}
              className={`canvas-node absolute p-4 rounded-[4px] bg-[#141312] border cursor-grab active:cursor-grabbing transition-all duration-150 ${
                isDimmed
                  ? 'opacity-25 border-white/5'
                  : isSelected
                  ? 'border-[#e8a33d] shadow-[0_0_20px_rgba(232,163,61,0.35)] ring-1 ring-[#e8a33d]/50'
                  : isBeingDragged
                  ? 'border-[#e8a33d] shadow-[0_0_20px_rgba(232,163,61,0.35)]'
                  : 'border-white/10 hover:border-[#e8a33d]/60'
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="h-7 w-7 rounded-[3px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d]">
                  {node.type === 'module' ? (
                    <Server className="h-4 w-4" />
                  ) : node.type === 'database_table' || layer === 'database' ? (
                    <Database className="h-4 w-4" />
                  ) : (
                    <Code2 className="h-4 w-4" />
                  )}
                </div>

                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-[2px] bg-[#0a0a0b] text-[#e8a33d] border border-[#e8a33d]/30">
                  {layer}
                </span>
              </div>

              <h4 className="font-mono font-bold text-sm text-[#f5f3ee] truncate tracking-tight">{node.name}</h4>
              {node.path ? (
                <p className="text-[11px] font-mono text-[#a09f9c] truncate mt-1">{node.path}</p>
              ) : node.metadata?.role ? (
                <p className="text-[11px] text-[#a09f9c] truncate mt-1">{node.metadata.role as string}</p>
              ) : null}

              {/* Click Indicator */}
              <div className="mt-3 pt-2 border-t border-white/8 flex items-center justify-between text-[10px] font-mono text-[#4b5563]">
                <span>click to inspect</span>
                <Move className="h-3 w-3 text-[#4b5563]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Node Inspector Drawer */}
      {selectedNode && (
        <div className="inspector-panel absolute bottom-4 left-4 z-40 w-[380px] max-h-[80vh] overflow-y-auto bg-[#141312] p-5 rounded-[4px] border border-white/10 shadow-2xl animate-fade-in font-sans">
          <div className="flex items-start justify-between pb-3 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d]">
                {selectedNode.type === 'module' ? (
                  <Server className="h-4 w-4" />
                ) : selectedNode.type === 'database_table' ? (
                  <Database className="h-4 w-4" />
                ) : (
                  <Code2 className="h-4 w-4" />
                )}
              </div>
              <div>
                <h3 className="font-serif font-normal text-lg text-[#f5f3ee]">{selectedNode.name}</h3>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[2px] bg-[#0a0a0b] text-[#e8a33d] border border-[#e8a33d]/30">
                  {(selectedNode.metadata?.layer as string) || selectedNode.type}
                </span>
              </div>
            </div>
            <button
              onClick={() => onSelectNode(null)}
              className="p-1 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Role */}
          {Boolean(selectedNode.metadata?.role) && (
            <div className="my-3 p-2.5 rounded-[3px] bg-[#0a0a0b] border border-white/8 text-xs text-[#a09f9c]">
              <span className="font-mono text-[10px] text-[#e8a33d] block mb-1 uppercase tracking-wider">Role</span>
              {String(selectedNode.metadata?.role || '')}
            </div>
          )}

          {/* Functionalities */}
          <div className="my-3">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#a09f9c] mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#e8a33d]" />
              <span>Core Responsibilities</span>
            </h4>
            <div className="space-y-1.5">
              {selectedFunctionalities.map((func, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#f5f3ee] bg-[#0a0a0b] p-2.5 rounded-[3px] border border-white/5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{func}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Depicted Source Files */}
          <div className="my-3">
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-[#a09f9c] mb-2 flex items-center gap-1.5">
              <FileCode className="h-3.5 w-3.5 text-[#e8a33d]" />
              <span>Source Files ({selectedAssociatedFiles.length})</span>
            </h4>
            <div className="space-y-1 max-h-36 overflow-y-auto font-mono text-xs">
              {selectedAssociatedFiles.map((file, i) => (
                <button
                  key={i}
                  onClick={() => onOpenSource(file)}
                  className="w-full flex items-center justify-between gap-2 text-left p-2 rounded-[3px] bg-[#0a0a0b] hover:bg-[#1a1918] border border-white/5 hover:border-[#e8a33d]/40 text-[#a09f9c] hover:text-[#f5f3ee] transition-all group"
                >
                  <span className="truncate text-[#e8a33d] group-hover:text-[#f5f3ee]">{file}</span>
                  <ExternalLink className="h-3 w-3 text-[#4b5563] group-hover:text-[#e8a33d] shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
