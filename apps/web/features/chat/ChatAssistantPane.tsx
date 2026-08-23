'use client';

import React, { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSendMessage: (message: string) => void;
  onOpenCitation: (filePath: string, lineRange: [number, number]) => void;
}

export function ChatAssistantPane({
  messages,
  isLoading,
  onSendMessage,
  onOpenCitation,
}: Props) {
  const [input, setInput] = useState('');
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
    'Explain overall repository architecture & entry points.',
    'How does order creation flow from route to database?',
    'Where is authentication middleware implemented?',
    'Are there any circular dependencies detected?',
  ];

  return (
    <aside className="w-84 border-l border-slate-800/80 glass-panel flex flex-col shrink-0 z-20 select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-800/80 bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-glow">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <h4 className="font-bold text-xs text-white">AI Code Assistant</h4>
            <p className="text-[10px] text-slate-400">Grounded in AST & Call Graph</p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
          <ShieldCheck className="h-3 w-3" />
          <span>Verified</span>
        </span>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 text-xs">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`p-3.5 rounded-2xl transition-all ${
                isUser
                  ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-100 ml-4 shadow-md'
                  : 'bg-slate-900/90 border border-slate-800/90 text-slate-200 mr-2 shadow-lg backdrop-blur-md'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
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

              {/* Message text body */}
              <div className="leading-relaxed whitespace-pre-wrap font-sans text-xs text-slate-100">
                {msg.content}
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
                        <span className="truncate max-w-[170px]">
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

      {/* Preset Quick Prompts */}
      <div className="p-2.5 border-t border-slate-800/80 bg-slate-950/40 flex flex-wrap gap-1.5">
        {presetQueries.map((query, idx) => (
          <button
            key={idx}
            onClick={() => onSendMessage(query)}
            className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-indigo-950/50 border border-slate-800 hover:border-indigo-500/40 text-slate-400 hover:text-cyan-200 transition-colors truncate max-w-[170px]"
          >
            {query.split(' ')[0]} {query.split(' ')[1]}...
          </button>
        ))}
      </div>

      {/* Chat Input Box */}
      <form onSubmit={handleSubmit} className="p-2.5 border-t border-slate-800/90 bg-slate-900/90 flex items-center gap-2">
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
