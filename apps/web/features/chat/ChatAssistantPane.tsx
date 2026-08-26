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
  ShieldCheck,
  CheckCircle2,
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
    { title: 'Document Pipeline', query: 'How does this codebase process and handle incoming requests across controllers and services?' },
    { title: 'Auth & Security', query: 'Where are authentication guards and middleware implemented?' },
    { title: 'Data Flow & Storage', query: 'How does the storage and database layer persist data models?' },
  ];

  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-[3px] bg-[#e8a33d] text-black shadow-lg hover:bg-[#f0b252] transition-all flex items-center gap-2 font-mono font-semibold text-xs uppercase tracking-wider"
        title="Open AI Assistant"
      >
        <Bot className="h-4 w-4" />
        <span>Ask AI</span>
      </button>
    );
  }

  return (
    <aside
      style={{ width: `${width || 340}px` }}
      className="border-l border-white/8 bg-[#0a0a0b] flex flex-col shrink-0 z-20 select-none h-full overflow-hidden font-sans"
    >
      {/* Header */}
      <div className="p-3 border-b border-white/8 bg-[#141312] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="h-6 w-6 rounded-[2px] bg-[#0a0a0b] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d]">
            <Bot className="h-3.5 w-3.5" />
          </div>
          <div>
            <h4 className="font-mono font-semibold text-xs text-[#f5f3ee] tracking-wide">AI Code Assistant</h4>
            <p className="text-[9px] text-[#a09f9c] font-mono">AST-Grounded Architecture</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono px-2 py-0.2 rounded-[2px] bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 flex items-center gap-1 font-medium">
            <ShieldCheck className="h-2.5 w-2.5" />
            <span>Verified</span>
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded text-[#a09f9c] hover:text-[#f5f3ee] transition-colors"
            title="Minimize Assistant"
          >
            <span className="text-xs">✕</span>
          </button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs min-h-0">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`p-3 rounded-[3px] transition-all ${
                isUser
                  ? 'bg-[#e8a33d] text-black ml-4 shadow-sm'
                  : 'bg-[#141312] border border-white/8 text-[#f5f3ee] mr-1'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 text-[9px] font-mono font-bold uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  {isUser ? (
                    <span className="text-black/80 font-bold">You</span>
                  ) : (
                    <span className="text-[#e8a33d] flex items-center gap-1">
                      <Sparkles className="h-2.5 w-2.5" />
                      GitLens Engine
                    </span>
                  )}
                </div>
                <span className={`font-mono text-[8px] ${isUser ? 'text-black/60' : 'text-[#4b5563]'}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Rich Markdown Message text body */}
              <div className={`leading-relaxed text-xs space-y-2 ${isUser ? 'text-black font-medium' : 'text-[#f5f3ee]'}`}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    p: ({ children }) => <p className="mb-1.5 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className={`font-semibold ${isUser ? 'text-black' : 'text-[#e8a33d]'}`}>{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    h1: ({ children }) => <h3 className={`font-serif text-sm font-normal mt-2.5 mb-1 border-b pb-0.5 ${isUser ? 'border-black/20 text-black' : 'border-white/10 text-[#f5f3ee]'}`}>{children}</h3>,
                    h2: ({ children }) => <h4 className={`font-serif text-xs font-normal mt-2 mb-1 ${isUser ? 'text-black' : 'text-[#f5f3ee]'}`}>{children}</h4>,
                    h3: ({ children }) => <h5 className={`font-mono font-semibold text-xs mt-1.5 mb-0.5 ${isUser ? 'text-black' : 'text-[#e8a33d]'}`}>{children}</h5>,
                    ul: ({ children }) => <ul className="list-disc pl-4 space-y-0.5 my-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 space-y-0.5 my-1">{children}</ol>,
                    li: ({ children }) => <li className="leading-normal">{children}</li>,
                    code: ({ node, className, children, ...props }) => {
                      const isInline = !className?.includes('language-');
                      return isInline ? (
                        <code className={`px-1 py-0.2 rounded font-mono text-[10px] ${isUser ? 'bg-black/10 text-black border border-black/20' : 'bg-[#0a0a0b] text-[#e8a33d] border border-white/10'}`} {...props}>
                          {children}
                        </code>
                      ) : (
                        <code className="font-mono text-[10px] text-[#f5f3ee]" {...props}>
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-[#0a0a0b] p-2.5 rounded-[2px] border border-white/10 my-2 overflow-x-auto text-[10px] font-mono leading-tight">
                        {children}
                      </pre>
                    ),
                    table: ({ children }) => (
                      <div className="overflow-x-auto my-2 rounded-[2px] border border-white/10">
                        <table className="w-full text-[10px] font-mono border-collapse bg-[#0a0a0b]">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => <thead className="bg-[#141312] border-b border-white/10 text-[#e8a33d]">{children}</thead>,
                    th: ({ children }) => <th className="px-2 py-1 text-left font-bold text-[9px] uppercase font-mono">{children}</th>,
                    td: ({ children }) => <td className="px-2 py-1 border-t border-white/5 leading-normal">{children}</td>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-[#e8a33d] pl-2 py-0.5 text-[#a09f9c] italic my-1.5 bg-[#0a0a0b]">
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
                <div className="mt-2.5 pt-2 border-t border-white/8 space-y-1 font-mono">
                  <div className="flex items-center justify-between text-[9px] text-[#a09f9c] font-bold uppercase">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                      Verified Receipts ({msg.citations.length}):
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {msg.citations.map((c: Citation, i: number) => (
                      <button
                        key={i}
                        onClick={() => onOpenCitation(c.file, [c.startLine, c.endLine])}
                        className="px-2 py-0.5 rounded-[2px] bg-[#0a0a0b] hover:bg-[#e8a33d] hover:text-black border border-[#e8a33d]/30 text-[10px] font-mono text-[#e8a33d] flex items-center gap-1 transition-all group"
                        title={`Jump to ${c.file}:${c.startLine}-${c.endLine}`}
                      >
                        <FileCode2 className="h-2.5 w-2.5 text-[#e8a33d] group-hover:text-black shrink-0" />
                        <span className="truncate max-w-[180px]">
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
          <div className="p-3 rounded-[3px] bg-[#141312] border border-white/8 text-xs text-[#a09f9c] flex items-center gap-2 font-mono">
            <span className="h-2 w-2 rounded-full bg-[#e8a33d] animate-ping" />
            <span>Synthesizing grounded answer with code citations...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Preset Quick Prompts Bar */}
      <div className="p-2 border-t border-white/8 bg-[#0a0a0b] flex flex-wrap gap-1 shrink-0 font-mono">
        {presetQueries.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(item.query)}
            title={item.query}
            className="flex-1 min-w-[120px] text-[9px] px-2 py-1 rounded-[2px] bg-[#141312] hover:bg-[#1a1918] border border-white/8 hover:border-[#e8a33d]/40 text-[#a09f9c] hover:text-[#f5f3ee] transition-all text-left flex items-center gap-1 truncate"
          >
            <Sparkles className="h-2.5 w-2.5 text-[#e8a33d] shrink-0" />
            <span className="truncate">{item.title}</span>
          </button>
        ))}
      </div>

      {/* Chat Input Box */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-white/8 bg-[#141312] flex items-center gap-2 shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask grounded questions about codebase..."
          className="flex-1 bg-[#0a0a0b] border border-white/10 rounded-[3px] px-3 py-1.5 text-xs text-[#f5f3ee] placeholder-[#4b5563] focus:outline-none focus:border-[#e8a33d] transition-all font-mono"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2 rounded-[3px] bg-[#e8a33d] hover:bg-[#f0b252] disabled:opacity-30 text-black transition-all"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </aside>
  );
}
