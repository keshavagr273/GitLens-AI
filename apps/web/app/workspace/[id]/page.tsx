'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  GitBranch,
  Layers,
  Zap,
  Network,
  Search,
  Activity,
  ExternalLink,
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
import { OmnibarSearch } from '@/features/workspace/OmnibarSearch';
import { CodeViewer } from '@/features/editor/CodeViewer';
import { RequestFlowView } from '@/features/routes/RequestFlowView';
import { ChatAssistantPane } from '@/features/chat/ChatAssistantPane';
import { DiagnosticsModal } from '@/features/workspace/DiagnosticsModal';
import { GitLensLogo } from '@/components/GitLensLogo';
import { SymbolNode } from '@gitlens/shared-types';

export default function WorkspacePage() {
  const params = useParams();
  const repoId = (params?.id as string) || 'repo-fastify-core';

  const {
    repository,
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

  // Resizable Panes State
  const [leftWidth, setLeftWidth] = useState(270);
  const [rightWidth, setRightWidth] = useState(320);
  const [bottomHeight, setBottomHeight] = useState(100);

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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#0a0a0b] text-[#f5f3ee] font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-[3px] bg-[#141312] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d] animate-pulse">
            <Network className="h-5 w-5" />
          </div>
          <p className="font-mono text-xs text-[#a09f9c] tracking-widest uppercase">
            Loading Codebase Architecture & AST Graph...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0b] text-[#f5f3ee] overflow-hidden font-sans select-none selection:bg-[#e8a33d]/30 selection:text-[#f5f3ee]">
      {/* 1. TOP BAR */}
      <header className="h-14 border-b border-white/8 bg-[#0a0a0b]/95 backdrop-blur-md px-5 flex items-center justify-between z-30 shrink-0">
        {/* Left: Brand & Repo Context */}
        <div className="flex items-center gap-3.5">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#f5f3ee] hover:text-[#e8a33d] transition-colors"
          >
            <GitLensLogo size={24} />
            <span className="font-serif font-normal text-base text-[#f5f3ee]">
              GitLens
            </span>
          </Link>

          <div className="h-4 w-[1px] bg-white/10" />

          {/* Repo metadata chip */}
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-semibold text-[#f5f3ee] text-xs">
              {repository?.owner}/{repository?.name}
            </span>
            <span className="px-2 py-0.5 rounded-[2px] bg-[#141312] border border-white/8 text-[#a09f9c] flex items-center gap-1 font-mono text-[10px]">
              <GitBranch className="h-3 w-3 text-[#e8a33d]" />
              {repository?.defaultBranch || 'main'}
            </span>
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <div className="flex items-center p-1 rounded-[4px] bg-[#141312] border border-white/8 text-xs">
          <button
            onClick={() => handleGraphModeChange('architecture')}
            className={`px-3.5 py-1 rounded-[3px] flex items-center gap-1.5 font-mono text-xs font-semibold transition-all ${
              graphMode === 'architecture'
                ? 'bg-[#e8a33d] text-black'
                : 'text-[#a09f9c] hover:text-[#f5f3ee]'
            }`}
          >
            <Layers className="h-3 w-3" />
            <span>Architecture</span>
          </button>
          <button
            onClick={() => handleGraphModeChange('dependency')}
            className={`px-3.5 py-1 rounded-[3px] flex items-center gap-1.5 font-mono text-xs font-semibold transition-all ${
              graphMode === 'dependency'
                ? 'bg-[#e8a33d] text-black'
                : 'text-[#a09f9c] hover:text-[#f5f3ee]'
            }`}
          >
            <Network className="h-3 w-3" />
            <span>Dependencies</span>
          </button>
          <button
            onClick={() => handleGraphModeChange('flow')}
            className={`px-3.5 py-1 rounded-[3px] flex items-center gap-1.5 font-mono text-xs font-semibold transition-all ${
              graphMode === 'flow'
                ? 'bg-[#e8a33d] text-black'
                : 'text-[#a09f9c] hover:text-[#f5f3ee]'
            }`}
          >
            <Zap className="h-3 w-3" />
            <span>Request Flow</span>
          </button>
        </div>

        {/* Right Tools & Omnibar Trigger */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={() => setIsOmnibarOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-[3px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/50 text-[#a09f9c] hover:text-[#f5f3ee] text-xs transition-colors"
          >
            <Search className="h-3 w-3 text-[#e8a33d]" />
            <span>Search codebase...</span>
            <kbd className="text-[9px] font-mono px-1 py-0.2 rounded-[2px] bg-[#0a0a0b] text-[#a09f9c] border border-white/8">
              ⌘K
            </kbd>
          </button>

          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-[3px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 text-[#a09f9c] hover:text-[#f5f3ee] text-xs transition-colors"
            title="System Diagnostics & Telemetry"
          >
            <Activity className="h-3 w-3 text-[#e8a33d]" />
            <span>Diagnostics</span>
          </button>

          <Link
            href={repository?.githubUrl || '#'}
            target="_blank"
            className="p-1.5 rounded-[3px] text-[#a09f9c] hover:text-[#f5f3ee] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-colors"
          >
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </header>

      {/* 2. MAIN 3-PANE WORKSPACE BODY */}
      <div className="flex-1 flex overflow-hidden relative w-full h-[calc(100vh-3.5rem)]">
        {/* LEFT PANE: File Tree, Symbols, Routes & Technologies */}
        <aside
          style={{ width: `${leftWidth}px` }}
          className="border-r border-white/8 bg-[#0a0a0b] flex flex-col shrink-0 z-20 h-full overflow-hidden"
        >
          <div className="grid grid-cols-4 border-b border-white/8 p-1 bg-[#141312] text-xs shrink-0 gap-1">
            {[
              { key: 'files', label: 'Files', count: files.length },
              { key: 'symbols', label: 'Symbols', count: symbols.length },
              { key: 'routes', label: 'Routes', count: routes.length },
              { key: 'tech', label: 'Tech', count: technologies.length },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-[3px] transition-all font-mono ${
                    isActive
                      ? 'bg-[#0a0a0b] text-[#f5f3ee] border border-[#e8a33d]/40 font-semibold'
                      : 'text-[#a09f9c] hover:text-[#f5f3ee] hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {isActive ? (
                      <span className="h-1 w-1 rounded-full bg-[#e8a33d]" />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-[#4b5563]" />
                    )}
                    <span className="text-[10px] tracking-wide uppercase truncate">{tab.label}</span>
                  </div>
                  <span className={`text-[9px] font-mono mt-0.5 ${isActive ? 'text-[#e8a33d]' : 'text-[#4b5563]'}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
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
              <div className="space-y-1.5">
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
                      className={`p-2.5 rounded-[4px] border cursor-pointer transition-all font-mono ${
                        isSelected
                          ? 'bg-[#141312] border-[#e8a33d] text-[#f5f3ee]'
                          : 'bg-[#141312] border-white/8 hover:border-[#e8a33d]/40 text-[#a09f9c]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-[2px] font-bold ${
                            route.method === 'GET' || route.method === 'POST'
                              ? 'bg-[#e8a33d]/15 text-[#e8a33d] border border-[#e8a33d]/30'
                              : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                          }`}
                        >
                          {route.method}
                        </span>
                        <span className="text-[9px] text-[#4b5563] truncate max-w-[120px]">{route.filePath}</span>
                      </div>
                      <p className="text-xs font-mono text-[#f5f3ee] font-medium truncate">{route.path}</p>
                      {route.handlerName && (
                        <p className="text-[10px] text-[#e8a33d] mt-0.5 truncate">→ {route.handlerName}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === 'tech' && (
              <div className="space-y-2 font-mono">
                {technologies.map((tech) => (
                  <div key={tech.id} className="p-2.5 rounded-[4px] bg-[#141312] border border-white/8">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#f5f3ee] text-xs">{tech.name}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded-[2px] bg-[#e8a33d]/10 text-[#e8a33d] border border-[#e8a33d]/20">
                        {tech.category}
                      </span>
                    </div>
                    <div className="space-y-1 mt-1.5">
                      {tech.evidence.map((ev: string, i: number) => (
                        <p key={i} className="text-[9px] text-[#a09f9c] bg-[#0a0a0b] p-1 rounded-[2px] border border-white/5 truncate">
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
          className="w-1 hover:w-1.5 bg-white/5 hover:bg-[#e8a33d] cursor-col-resize shrink-0 transition-all z-30 flex items-center justify-center group"
          title="Drag to resize left sidebar"
        >
          <div className="h-6 w-0.5 bg-[#4b5563] group-hover:bg-white rounded-full" />
        </div>

        {/* CENTER PANE: Interactive Canvas & Request Flow */}
        <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden relative">
          {/* Canvas View */}
          <div className="flex-1 relative overflow-hidden bg-[#0a0a0b] flex flex-col min-h-0">
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
            className="h-1 hover:h-1.5 bg-white/5 hover:bg-[#e8a33d] cursor-row-resize shrink-0 transition-all z-30 flex items-center justify-center group"
            title="Drag to resize source editor"
          >
            <div className="w-8 h-0.5 bg-[#4b5563] group-hover:bg-white rounded-full" />
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
          className="w-1 hover:w-1.5 bg-white/5 hover:bg-[#e8a33d] cursor-col-resize shrink-0 transition-all z-30 flex items-center justify-center group"
          title="Drag to resize AI assistant"
        >
          <div className="h-6 w-0.5 bg-[#4b5563] group-hover:bg-white rounded-full" />
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
