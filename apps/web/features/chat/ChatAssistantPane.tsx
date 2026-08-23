'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage, Citation } from '@gitlens/shared-types';
import {
  Bot,
  Send,
  Sparkles,
  FileCode2,
  Activity,
  ShieldCheck,
  Zap,
  Code2,
  CheckCircle2,
  Trash2,
  MessageSquare,
  Search,
} from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onOpenCitation: (filePath: string, lineRange: [number, number]) => void;
  width?: number;
}

export function ChatAssistantPane({
  messages,
  isLoading,
  onSendMessage,
  onOpenCitation,
  width,
}: Props) {
  const [input, setInput] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const presetQueries = [
    { title: 'Explain Architecture', query: 'Explain overall repository architecture and main entry points.' },
    { title: 'Document Pipeline', query: 'How does DocSaarthi process OCR documents from HTTP upload to BullMQ worker?' },
    { title: 'Auth & Security', query: 'Where are authentication guards and middleware implemented?' },
    { title: 'Vector Search Flow', query: 'How does SearchService execute hybrid vector and BM25 search?' },
  ];

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 right-6 z-40 p-3.5 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-glow hover:scale-105 transition-all flex items-center gap-2 font-bold text-xs"
        title="Open AI Assistant"
      >
        <Bot className="h-5 w-5" />
        <span>Ask AI Assistant</span>
      </button>
    );
  }

  return (
    <aside
      style={{ width: `${width || 340}px` }}
      className="border-l border-slate-800/80 glass-panel flex flex-col shrink-0 z-20 select-none h-full overflow-hidden"
    >
      {/* Header */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-glow">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white">AI Code Assistant</h4>
            <p className="text-[10px] text-slate-400">Grounded in AST & Call Graph</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified</span>
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Minimize Assistant"
          >
            <span className="text-xs">✕</span>
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5 text-xs min-h-0">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`p-3 rounded-2xl transition-all ${
                isUser
                  ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-100 ml-4 shadow-md'
                  : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 mr-1 shadow-lg backdrop-blur-md'
              }`}
            >
              <div className="flex items-center justify-between mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  {isUser ? (
                    <span className="text-indigo-400">You</span>
                  ) : (
                    <span className="text-cyan-400 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      GitLens Engine
                    </span>
                  )}
                </div>
                <span className="text-[9px] text-slate-500 font-mono">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Rich Markdown Message text body */}
              <div className="leading-relaxed font-sans text-xs text-slate-100 space-y-2 prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-2 leading-relaxed text-slate-200">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-cyan-300">{children}</strong>,
                    em: ({ children }) => <em className="italic text-slate-300">{children}</em>,
                    h1: ({ children }) => <h3 className="font-bold text-sm text-white mt-3 mb-1.5 border-b border-slate-800 pb-1">{children}</h3>,
                    h2: ({ children }) => <h4 className="font-bold text-xs text-white mt-2.5 mb-1">{children}</h4>,
                    h3: ({ children }) => <h5 className="font-bold text-xs text-cyan-300 mt-2 mb-1">{children}</h5>,
                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 my-1.5 text-slate-300">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-1 my-1.5 text-slate-300">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-300 leading-normal">{children}</li>,
                    code: ({ node, className, children, ...props }) => {
                      const isInline = !className?.includes('language-');
                      return isInline ? (
                        <code className="bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px] text-indigo-300 border border-slate-800" {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="font-mono text-[11px] text-slate-200" {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-slate-950/90 p-2.5 rounded-xl border border-slate-800 my-2 overflow-x-auto text-[11px] font-mono leading-tight">
                        {children}
                      </pre>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2 rounded-xl border border-slate-800">
                        <table className="w-full text-[11px] border-collapse bg-slate-950/60">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-slate-900 border-b border-slate-800 text-cyan-400">{children}</thead>,
                    th: ({ children }) => <th className="px-2 py-1.5 text-left font-bold text-[10px] uppercase font-mono">{children}</th>,
                    td: ({ children }) => <td className="px-2 py-1.5 border-t border-slate-800/80 text-slate-300 leading-normal">{children}</td>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-indigo-500 pl-2.5 py-1 text-slate-400 italic my-2 bg-indigo-950/20 rounded-r">
                        {children}
                      </blockquote>
                    ),
                  }}
                >
                  {msg.content}
                </ReactMarkdown>
              </div>

              {/* Verified Citations Badges */}
              {msg.citations && msg.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono font-bold uppercase">
                    <span className="flex items-center gap-1 text-slate-400">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      Verified Citations ({msg.citations.length}):
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {msg.citations.map((c: Citation, i: number) => (
                      <button
                        key={i}
                        onClick={() => onOpenCitation(c.file, [c.startLine, c.endLine])}
                        className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-600/30 border border-indigo-500/40 text-[11px] font-mono text-cyan-300 hover:text-white flex items-center gap-1.5 transition-all group shadow-sm hover:scale-[1.02]"
                        title={`Click to jump to ${c.file}:${c.startLine}-${c.endLine}`}
                      >
                        <FileCode2 className="h-3 w-3 text-indigo-400 group-hover:text-cyan-300 shrink-0" />
                        <span className="truncate max-w-[200px]">
                          {c.file.split('/').pop()}:{c.startLine}-{c.endLine}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {isLoading && (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 flex items-center gap-2.5 shadow-lg">
            <Activity className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Synthesizing answer & verifying code citations...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Quick Prompts Bar (Adaptive & Fully Visible) */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/60 flex flex-wrap gap-1.5 shrink-0">
        {presetQueries.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(item.query)}
            title={item.query}
            className="flex-1 min-w-[120px] text-[10px] px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-cyan-200 transition-all text-left flex items-center gap-1.5 group shadow-sm"
          >
            <Sparkles className="h-3 w-3 text-indigo-400 group-hover:text-cyan-400 shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>

      {/* Chat Input Box */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-slate-800/90 bg-slate-900/90 flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask grounded questions about this codebase..."
          className="flex-1 bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-sans"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white transition-all shadow-glow"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </aside>
  );
}
