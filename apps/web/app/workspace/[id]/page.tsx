'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  GitBranch,
  Network,
  Layers,
  Search,
  Bot,
  Code2,
  Database,
  ArrowRight,
  Send,
  Sparkles,
  FileCode2,
  Folder,
  ChevronRight,
  ChevronDown,
  Activity,
  CheckCircle2,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Radio,
  Minimize2,
  Info,
  ShieldCheck,
  Server,
  Zap,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useWorkspaceStore } from '@/lib/store';
import {
  fetchRepositoryById,
  fetchFiles,
  fetchFileContent,
  fetchGraph,
  fetchRoutes,
  traceRequestFlow,
  fetchTechnologies,
  sendChatMessage,
} from '@/lib/api';
import { FileTreeView } from '@/features/explorer/FileTreeView';
import { GraphNode, SourceFile, ApiRoute, RequestFlowHop } from '@gitlens/shared-types';

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
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [isCodeViewerExpanded, setIsCodeViewerExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'routes' | 'tech'>('files');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    src: true,
    'src/routes': true,
    'src/controllers': true,
    'src/services': true,
  });
  const [zoomLevel, setZoomLevel] = useState(1);

  // Load all initial repository workspace data
  useEffect(() => {
    async function loadWorkspace() {
      setLoading(true);
      try {
        const repoData = await fetchRepositoryById(repoId);
        setRepository(repoData.repository, repoData.latestAnalysis);

        const [fileList, graphData, routeList, techList] = await Promise.all([
          fetchFiles(repoId),
          fetchGraph(repoId, 'architecture'),
          fetchRoutes(repoId),
          fetchTechnologies(repoId),
        ]);

        setFiles(fileList);
        setGraphData(graphData.nodes, graphData.edges);
        setRoutes(routeList);
        setTechnologies(techList);

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

  // Handle opening a file at a specific line range
  const handleOpenFile = async (fileId: string, lineRange?: [number, number]) => {
    try {
      const file = await fetchFileContent(repoId, fileId);
      setActiveFile(file, lineRange || null);
    } catch (err) {
      console.error('Failed to open file', err);
    }
  };

  // Handle chat submission
  const handleSendChat = async (presetMessage?: string) => {
    const text = presetMessage || chatInput;
    if (!text.trim() || chatLoading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      sessionId: 'default',
      role: 'user' as const,
      content: text,
      createdAt: new Date().toISOString(),
    };
    addMessage(userMsg);
    setChatInput('');
    setChatLoading(true);

    try {
      const aiResponse = await sendChatMessage(repoId, text);
      addMessage(aiResponse);
    } catch (err) {
      addMessage({
        id: `err-${Date.now()}`,
        sessionId: 'default',
        role: 'assistant',
        content: 'I encountered an issue querying the code graph. Please try again.',
        createdAt: new Date().toISOString(),
      });
    } finally {
      setChatLoading(false);
    }
  };

  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folder]: !prev[folder] }));
  };

  if (loading && !repository) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-300">
        <div className="flex items-center gap-3 glass-panel p-6 rounded-2xl">
          <Activity className="h-5 w-5 text-indigo-400 animate-spin" />
          <span className="text-sm font-medium">Loading GitLens AI Workspace...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-slate-100 overflow-hidden font-sans">
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
            onClick={() => setGraphMode('architecture')}
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
            onClick={() => setGraphMode('dependency')}
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
            onClick={() => setGraphMode('flow')}
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

        {/* Right Tools */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSendChat('Explain overall repository architecture and entry points.')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:text-white text-xs transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span>Explain Architecture</span>
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE: File Tree, Routes & Technologies */}
        <aside className="w-72 border-r border-slate-800/80 glass-panel flex flex-col shrink-0 z-20">
          <div className="flex items-center border-b border-slate-800/80 p-1.5 bg-slate-900/60 text-xs">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'files' ? 'bg-slate-800 text-indigo-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Files ({files.length})
            </button>
            <button
              onClick={() => setActiveTab('routes')}
              className={`flex-1 py-1.5 rounded-lg font-medium transition-colors ${
                activeTab === 'routes' ? 'bg-slate-800 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
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
                        <p className="text-[11px] text-slate-400 mt-1 truncate">$\rightarrow$ {route.handlerName}</p>
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

        {/* CENTER PANE: Interactive Canvas & Request Flow */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {/* Canvas View */}
          <div className="flex-1 relative overflow-hidden bg-slate-950/50 flex flex-col">
            {/* Canvas Header / Controls */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
              <div className="px-3 py-1 rounded-xl glass-panel text-xs text-slate-300 flex items-center gap-2 border border-slate-800">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <span className="font-medium capitalize">{graphMode} Canvas</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-400">{graphNodes.length} nodes</span>
              </div>
            </div>

            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 glass-panel p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.1))}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="px-2 py-1 text-[11px] font-mono text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                {Math.round(zoomLevel * 100)}%
              </button>
            </div>

            {/* Interactive Graph Canvas Render */}
            {graphMode !== 'flow' ? (
              <div
                className="flex-1 flex items-center justify-center p-8 transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
                  {graphNodes.map((node) => {
                    const isSelected = selectedNode?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        onClick={() => {
                          setSelectedNode(node);
                          if (node.path) {
                            handleOpenFile(node.path);
                          }
                        }}
                        className={`p-5 rounded-2xl glass-panel border cursor-pointer transition-all hover:scale-105 ${
                          isSelected
                            ? 'border-cyan-400 shadow-glow-cyan bg-cyan-950/20'
                            : 'border-slate-800 hover:border-indigo-500/50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            {node.type === 'module' ? (
                              <Server className="h-4 w-4" />
                            ) : node.type === 'database_table' ? (
                              <Database className="h-4 w-4 text-cyan-400" />
                            ) : (
                              <Code2 className="h-4 w-4 text-emerald-400" />
                            )}
                          </div>
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                            {node.type}
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm text-white mb-1">{node.name}</h4>
                        {node.path && (
                          <p className="text-[11px] font-mono text-slate-400 truncate">{node.path}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Request Flow Stepper View */
              <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center">
                <div className="w-full max-w-2xl bg-slate-900/80 rounded-2xl border border-slate-800 p-6 shadow-2xl">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
                        Trace Request Flow
                      </span>
                      <h3 className="font-bold text-lg text-white font-mono">
                        {activeTrace?.method} {activeTrace?.path}
                      </h3>
                    </div>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                      Static & Inferred Traversal
                    </span>
                  </div>

                  <div className="space-y-4">
                    {activeTrace?.hops.map((hop: RequestFlowHop, idx: number) => (
                      <div
                        key={hop.id}
                        onClick={() => {
                          if (hop.file) {
                            handleOpenFile(hop.file, [hop.line || 1, (hop.line || 1) + 15]);
                          }
                        }}
                        className="flex items-start gap-4 p-3.5 rounded-xl glass-panel hover:border-cyan-500/50 cursor-pointer transition-all group"
                      >
                        <div className="h-7 w-7 rounded-full bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-xs font-mono font-bold text-indigo-300 shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
                              {hop.label}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                hop.confidence === 'static'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {hop.confidence.toUpperCase()} ({(hop.confidenceScore * 100).toFixed(0)}%)
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-1.5">{hop.details}</p>
                          {hop.file && (
                            <span className="text-[11px] font-mono text-indigo-300 underline">
                              {hop.file}:{hop.line}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Monaco Editor Bottom Pane */}
          <div
            className={`border-t border-slate-800/80 glass-panel flex flex-col transition-all duration-300 ${
              isCodeViewerExpanded ? 'h-[500px]' : 'h-64'
            }`}
          >
            {/* Viewer Header */}
            <div className="h-9 px-4 border-b border-slate-800/80 bg-slate-900/90 flex items-center justify-between text-xs shrink-0">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-indigo-400" />
                <span className="font-mono text-slate-200 font-medium">
                  {activeFile?.path || 'Select a file to inspect'}
                </span>
                {highlightedLines && (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono">
                    Lines {highlightedLines[0]} - {highlightedLines[1]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsCodeViewerExpanded((v) => !v)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  {isCodeViewerExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Monaco Editor Component */}
            <div className="flex-1">
              <Editor
                height="100%"
                theme="vs-dark"
                language={activeFile?.language || 'typescript'}
                value={activeFile?.content || '// Click any node, route, or citation to view source code.'}
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  fontSize: 12,
                  fontFamily: 'Fira Code, monospace',
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                  automaticLayout: true,
                }}
              />
            </div>
          </div>
        </main>

        {/* RIGHT PANE: Grounded AI Assistant */}
        <aside className="w-80 border-l border-slate-800/80 glass-panel flex flex-col shrink-0 z-20">
          <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold text-xs text-white">AI Code Assistant</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">
              Grounded
            </span>
          </div>

          {/* Message Thread */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 ml-4'
                    : 'bg-slate-900/80 border border-slate-800 text-slate-200 mr-2'
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-semibold text-slate-400 uppercase">
                  {msg.role === 'user' ? 'You' : 'GitLens AI'}
                </div>
                <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                {/* Evidence Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800 space-y-1">
                    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                      Citations:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          onClick={() => handleOpenFile(c.file, [c.startLine, c.endLine])}
                          className="px-2 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-[11px] font-mono text-cyan-300 flex items-center gap-1 transition-all"
                        >
                          <FileCode2 className="h-3 w-3" />
                          <span>
                            {c.file}:{c.startLine}-{c.endLine}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {chatLoading && (
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                <span>Searching code graph & synthesizing evidence...</span>
              </div>
            )}
          </div>

          {/* Quick prompt suggestions */}
          <div className="px-3 py-2 border-t border-slate-800/60 bg-slate-950/40 flex flex-wrap gap-1.5">
            <button
              onClick={() => handleSendChat('How does the order creation flow work?')}
              className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200"
            >
              Order flow?
            </button>
            <button
              onClick={() => handleSendChat('Where is authentication middleware implemented?')}
              className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200"
            >
              Auth logic?
            </button>
          </div>

          {/* Chat Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="p-2 border-t border-slate-800/80 bg-slate-900/90 flex items-center gap-1.5"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ask question about codebase..."
              className="flex-1 bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={chatLoading}
              className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
