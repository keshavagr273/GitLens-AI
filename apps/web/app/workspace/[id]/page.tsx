'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  GitBranch,
  Layers,
  Zap,
  Network,
  Cpu,
  Search,
  Sparkles,
  Terminal,
  Activity,
  Maximize2,
  Minimize2,
  ExternalLink,
  CheckCircle2,
  Bot,
  GripVertical,
  GripHorizontal,
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import {
  fetchRepositoryById,
  fetchFiles,
  fetchFileContent,
  fetchGraph,
  fetchRoutes,
  fetchTechnologies,
  fetchSymbols,
  traceRequestFlow,
  sendChatMessage,
} from '@/lib/api';
import { FileTreeView } from '@/features/explorer/FileTreeView';
import { SymbolsTreeView } from '@/features/explorer/SymbolsTreeView';
import { GraphCanvas } from '@/features/graph/GraphCanvas';
import { NodeInspector } from '@/features/graph/NodeInspector';
import { OmnibarSearch } from '@/features/workspace/OmnibarSearch';
import { CodeViewer } from '@/features/editor/CodeViewer';
import { RequestFlowView } from '@/features/routes/RequestFlowView';
import { ChatAssistantPane } from '@/features/chat/ChatAssistantPane';
import { DiagnosticsModal } from '@/features/workspace/DiagnosticsModal';
import { GraphNode, SourceFile, ApiRoute, RequestFlowHop, SymbolNode } from '@gitlens/shared-types';

export default function WorkspacePage() {
  const params = useParams();
  const repoId = (params?.id as string) || 'repo-fastify-core';

  const {
    repository,
    analysis,
    files,
    activeFile,
    highlightedLines,
    graphNodes,
    graphEdges,
    selectedNode,
    routes,
    selectedRoute,
    activeTrace,
    technologies,
    messages,
    graphMode,
    setRepository,
    setFiles,
    setActiveFile,
    setGraphData,
    setSelectedNode,
    setRoutes,
    setSelectedRoute,
    setActiveTrace,
    setTechnologies,
    setGraphMode,
    addMessage,
  } = useWorkspaceStore();

  const [loading, setLoading] = useState(true);
  const [symbols, setSymbols] = useState<SymbolNode[]>([]);
  const [activeSymbolId, setActiveSymbolId] = useState<string | undefined>();
  const [isOmnibarOpen, setIsOmnibarOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isCodeViewerExpanded, setIsCodeViewerExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'symbols' | 'routes' | 'tech'>('files');

  // Resizable Panes State (Clamped with slim defaults for spacious centered canvas)
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(280);
  const [bottomHeight, setBottomHeight] = useState(90);

  const isResizingRef = useRef<'left' | 'right' | 'bottom' | null>(null);

  const startResizingLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = 'left';
  };

  const startResizingRight = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = 'right';
  };

  const startResizingBottom = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = 'bottom';
  };

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      if (isResizingRef.current === 'left') {
        const newWidth = Math.max(180, Math.min(550, e.clientX));
        setLeftWidth(newWidth);
      } else if (isResizingRef.current === 'right') {
        const newWidth = Math.max(260, Math.min(650, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      } else if (isResizingRef.current === 'bottom') {
        const newHeight = Math.max(80, Math.min(550, window.innerHeight - e.clientY));
        setBottomHeight(newHeight);
      }
    };

    const handleGlobalMouseUp = () => {
      isResizingRef.current = null;
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // Load all initial repository workspace data
  useEffect(() => {
    async function loadWorkspace() {
      setLoading(true);
      try {
        const repoData = await fetchRepositoryById(repoId);
        setRepository(repoData.repository, repoData.latestAnalysis);

        const [fileList, graphData, routeList, techList, symbolList] = await Promise.all([
          fetchFiles(repoId),
          fetchGraph(repoId, 'architecture'),
          fetchRoutes(repoId),
          fetchTechnologies(repoId),
          fetchSymbols(repoId),
        ]);

        setFiles(fileList);
        setGraphData(graphData.nodes, graphData.edges);
        setRoutes(routeList);
        setTechnologies(techList);
        setSymbols(symbolList);

        if (fileList.length > 0) {
          const initialFile = await fetchFileContent(repoId, fileList[0].id);
          setActiveFile(initialFile);
        }

        if (routeList.length > 0) {
          setSelectedRoute(routeList[0]);
          const initialTrace = await traceRequestFlow(repoId, routeList[0].id);
          setActiveTrace(initialTrace);
        }
      } catch (err) {
        console.error('Failed to load workspace', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkspace();
  }, [repoId, setRepository, setFiles, setActiveFile, setGraphData, setRoutes, setSelectedRoute, setActiveTrace, setTechnologies]);

  // Handle switching graph visualization modes
  const handleGraphModeChange = async (mode: 'architecture' | 'dependency' | 'flow') => {
    setGraphMode(mode);
    if (mode === 'architecture' || mode === 'dependency') {
      try {
        const graph = await fetchGraph(repoId, mode);
        setGraphData(graph.nodes, graph.edges);
      } catch (err) {
        console.error('Failed to switch graph mode', err);
      }
    } else if (mode === 'flow') {
      try {
        const trace = await traceRequestFlow(repoId, selectedRoute?.id || 'route-post-ocr');
        setActiveTrace(trace);
      } catch (err) {
        console.error('Failed to fetch request flow trace', err);
      }
    }
  };

  // Handle opening a file at a specific line range
  const handleOpenFile = async (fileIdOrPath: string, lineRange?: [number, number]) => {
    try {
      const matched = files.find((f) => f.id === fileIdOrPath || f.path === fileIdOrPath || f.path.endsWith(fileIdOrPath));
      const targetId = matched ? matched.id : fileIdOrPath;
      const file = await fetchFileContent(repoId, targetId);
      setActiveFile(file, lineRange || null);
    } catch (err) {
      console.error('Failed to open file', err);
    }
  };

  // Handle symbol selection
  const handleSelectSymbol = (sym: SymbolNode) => {
    setActiveSymbolId(sym.id);
    handleOpenFile(sym.fileId, [sym.startLine, sym.endLine]);
  };

  // Handle chat submission
  const handleSendChat = async (presetMessage?: string) => {
    const text = presetMessage || chatInput;
    if (!text.trim() || chatLoading) return;

    addMessage({
      id: `msg-user-${Date.now()}`,
      sessionId: 'session-default',
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    });
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await sendChatMessage(repoId, text);
      addMessage(response);
    } catch (err) {
      addMessage({
        id: `msg-err-${Date.now()}`,
        sessionId: 'session-default',
        role: 'assistant',
        content: '⚠️ Failed to connect to AI gateway. Please verify your Groq API key.',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-glow animate-pulse">
            <Network className="h-6 w-6 text-white" />
          </div>
          <p className="font-mono text-sm text-slate-400">Loading codebase architecture & graph...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-slate-100 overflow-hidden font-sans select-none">
      {/* 1. TOP BAR */}
      <header className="h-14 border-b border-slate-800/80 glass-panel px-4 flex items-center justify-between z-30 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-sm text-white hover:text-indigo-300 transition-colors"
          >
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center">
              <Network className="h-4 w-4 text-white" />
            </div>
            <span>GitLens AI</span>
          </Link>

          <div className="h-4 w-[1px] bg-slate-800" />

          {/* Repo metadata chip */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-white">
              {repository?.owner}/{repository?.name}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1 font-mono text-[11px]">
              <GitBranch className="h-3 w-3 text-indigo-400" />
              {repository?.defaultBranch || 'main'}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60 text-cyan-300 font-mono text-[11px]">
              {analysis?.commitSha || '7a8f9c'}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-medium text-[11px] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Analyzed
            </span>
          </div>
        </div>

        {/* Center Mode Switcher Tabs */}
        <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
          <button
            onClick={() => handleGraphModeChange('architecture')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              graphMode === 'architecture'
                ? 'bg-indigo-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Architecture</span>
          </button>
          <button
            onClick={() => handleGraphModeChange('dependency')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              graphMode === 'dependency'
                ? 'bg-indigo-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="h-3.5 w-3.5" />
            <span>Dependencies</span>
          </button>
          <button
            onClick={() => handleGraphModeChange('flow')}
            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              graphMode === 'flow'
                ? 'bg-indigo-600 text-white shadow-glow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            <span>Request Flow</span>
          </button>
        </div>

        {/* Right Tools & Omnibar Trigger */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsOmnibarOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-white text-xs transition-colors shadow-inner"
          >
            <Search className="h-3.5 w-3.5 text-indigo-400" />
            <span>Search codebase...</span>
            <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => handleSendChat('Explain overall repository architecture and entry points.')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Explain Architecture</span>
          </button>
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-slate-300 hover:text-cyan-300 text-xs transition-colors shadow-inner"
            title="System Diagnostics & Telemetry"
          >
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span>Diagnostics</span>
          </button>

          <Link
            href={repository?.githubUrl || '#'}
            target="_blank"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white glass-panel transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* 2. MAIN 3-PANE WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden relative w-full h-[calc(100vh-3.5rem)]">
        {/* LEFT PANE: File Tree, Symbols, Routes & Technologies */}
        <aside
          style={{ width: `${leftWidth}px` }}
          className="border-r border-slate-800/80 glass-panel flex flex-col shrink-0 z-20 h-full overflow-hidden"
        >
          <div className="flex items-center border-b border-slate-800/80 p-1.5 bg-slate-900/60 text-xs shrink-0">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'files' ? 'bg-slate-800 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Files ({files.length})
            </button>
            <button
              onClick={() => setActiveTab('symbols')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'symbols' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Symbols ({symbols.length})
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'routes' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Routes ({routes.length})
            </button>
            <button
              onClick={() => setActiveTab('tech')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'tech' ? 'bg-slate-800 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tech ({technologies.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 text-xs">
            {activeTab === 'files' && (
              <FileTreeView
                files={files}
                activeFileId={activeFile?.id}
                onSelectFile={(fileId) => handleOpenFile(fileId)}
              />
            )}

            {activeTab === 'symbols' && (
              <SymbolsTreeView
                symbols={symbols}
                activeSymbolId={activeSymbolId}
                onSelectSymbol={handleSelectSymbol}
              />
            )}

            {activeTab === 'routes' && (
              <div className="space-y-2">
                {routes.map((route) => {
                  const isSelected = selectedRoute?.id === route.id;
                  return (
                    <div
                      key={route.id}
                      onClick={async () => {
                        setSelectedRoute(route);
                        setGraphMode('flow');
                        const trace = await traceRequestFlow(repoId, route.id);
                        setActiveTrace(trace);
                        if (route.fileId) {
                          handleOpenFile(route.fileId, [route.startLine, route.startLine + 10]);
                        }
                      }}
                      className={`p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                          : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                            route.method === 'GET'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : route.method === 'POST'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {route.method}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{route.filePath}</span>
                      </div>
                      <p className="text-xs font-mono text-cyan-300 font-medium truncate">{route.path}</p>
                      {route.handlerName && (
                        <p className="text-[11px] text-slate-400 mt-1 truncate">→ {route.handlerName}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'tech' && (
              <div className="space-y-2">
                {technologies.map((tech) => (
                  <div key={tech.id} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-white">{tech.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-mono">
                        {tech.category}
                      </span>
                    </div>
                    <div className="space-y-1 mt-2">
                      {tech.evidence.map((ev, i) => (
                        <p key={i} className="text-[10px] font-mono text-slate-400 bg-slate-950/80 p-1 rounded">
                          {ev}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* Left Resize Splitter Handle */}
        <div
          onMouseDown={startResizingLeft}
          className="w-1.5 hover:w-2.5 bg-slate-800/40 hover:bg-cyan-500/80 cursor-col-resize shrink-0 transition-all z-30 flex items-center justify-center group"
          title="Drag to resize left sidebar"
        >
          <div className="h-6 w-0.5 bg-slate-600 group-hover:bg-white rounded-full" />
        </div>

        {/* CENTER PANE: Interactive Canvas & Request Flow */}
        <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
          {/* Canvas View */}
          <div className="flex-1 relative overflow-hidden bg-slate-950/50 flex flex-col min-h-0">
            {graphMode !== 'flow' ? (
              <div className="relative w-full h-full">
                <GraphCanvas
                  nodes={graphNodes}
                  edges={graphEdges}
                  selectedNode={selectedNode}
                  onSelectNode={setSelectedNode}
                  onOpenSource={(path) => handleOpenFile(path)}
                />
              </div>
            ) : (
              <RequestFlowView
                routes={routes}
                selectedRoute={selectedRoute}
                activeTrace={activeTrace}
                onSelectRoute={async (route) => {
                  setSelectedRoute(route);
                  const trace = await traceRequestFlow(repoId, route.id);
                  setActiveTrace(trace);
                  if (route.fileId) {
                    handleOpenFile(route.fileId, [route.startLine, route.startLine + 10]);
                  }
                }}
                onOpenSource={(path, range) => handleOpenFile(path, range)}
              />
            )}
          </div>

          {/* Bottom Horizontal Resize Splitter Handle */}
          <div
            onMouseDown={startResizingBottom}
            className="h-1.5 hover:h-2.5 bg-slate-800/40 hover:bg-cyan-500/80 cursor-row-resize shrink-0 transition-all z-30 flex items-center justify-center group"
            title="Drag to resize source editor"
          >
            <div className="w-8 h-0.5 bg-slate-600 group-hover:bg-white rounded-full" />
          </div>

          {/* Monaco Editor Code Viewer */}
          <CodeViewer
            file={activeFile}
            highlightedLines={highlightedLines}
            isExpanded={isCodeViewerExpanded}
            onToggleExpand={() => setIsCodeViewerExpanded((v) => !v)}
            height={bottomHeight}
          />
        </main>

        {/* Right Resize Splitter Handle */}
        <div
          onMouseDown={startResizingRight}
          className="w-1.5 hover:w-2.5 bg-slate-800/40 hover:bg-cyan-500/80 cursor-col-resize shrink-0 transition-all z-30 flex items-center justify-center group"
          title="Drag to resize AI assistant"
        >
          <div className="h-6 w-0.5 bg-slate-600 group-hover:bg-white rounded-full" />
        </div>

        {/* RIGHT PANE: Grounded AI Assistant */}
        <ChatAssistantPane
          messages={messages}
          isLoading={chatLoading}
          onSendMessage={(msg) => handleSendChat(msg)}
          onOpenCitation={(filePath, lineRange) => handleOpenFile(filePath, lineRange)}
          width={rightWidth}
        />
      </div>

      {/* 3. Omnibar Search Modal */}
      <OmnibarSearch
        isOpen={isOmnibarOpen}
        onClose={() => setIsOmnibarOpen(false)}
        files={files}
        symbols={symbols}
        routes={routes}
        technologies={technologies}
        onOpenSource={(path, range) => handleOpenFile(path, range)}
        onSelectRoute={(route) => {
          setSelectedRoute(route);
          setGraphMode('flow');
          if (route.fileId) {
            handleOpenFile(route.fileId, [route.startLine, route.startLine + 10]);
          }
        }}
      />

      {/* 4. System Diagnostics & Telemetry Modal */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        nodes={graphNodes}
        edges={graphEdges}
        files={files}
        routes={routes}
      />
    </div>
  );
}
