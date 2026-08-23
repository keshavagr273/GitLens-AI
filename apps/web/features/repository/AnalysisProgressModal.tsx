'use client';

import React, { useEffect, useState } from 'react';
import { AnalysisProgressEvent, AnalysisStage } from '@gitlens/shared-types';
import { CheckCircle2, Loader2, AlertCircle, Sparkles, Terminal } from 'lucide-react';

interface Props {
  analysisId: string;
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}

const STAGES_ORDER: Array<{ stage: AnalysisStage; label: string }> = [
  { stage: 'FETCHING', label: 'Fetching Git Tree' },
  { stage: 'FILTERING', label: 'Filtering Source Files' },
  { stage: 'PARSING', label: 'Tree-sitter AST & Symbols' },
  { stage: 'GRAPH', label: 'Graph & SCC Cycles' },
  { stage: 'ROUTES', label: 'API Route Extraction' },
  { stage: 'EMBEDDING', label: 'Semantic Embeddings' },
  { stage: 'FINALIZING', label: 'Finalizing Workspace' },
];

export function AnalysisProgressModal({ analysisId, isOpen, onComplete, onClose }: Props) {
  const [currentEvent, setCurrentEvent] = useState<AnalysisProgressEvent | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !analysisId) return;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${apiBase}/api/analyses/${analysisId}/progress`);

    eventSource.onmessage = (event) => {
      try {
        const data: AnalysisProgressEvent = JSON.parse(event.data);
        setCurrentEvent(data);
        setLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${data.message}`]);

        if (data.stage === 'COMPLETED') {
          setIsDone(true);
          eventSource.close();
          setTimeout(() => {
            onComplete();
          }, 1000);
        } else if (data.stage === 'FAILED') {
          setError(data.message || 'Analysis failed.');
          eventSource.close();
        }
      } catch (err) {
        console.error('Failed to parse SSE event', err);
      }
    };

    eventSource.onerror = () => {
      // In case SSE closes or errors
      setIsDone(true);
      eventSource.close();
      setTimeout(() => {
        onComplete();
      }, 1200);
    };

    return () => {
      eventSource.close();
    };
  }, [analysisId, isOpen, onComplete]);

  if (!isOpen) return null;

  const progressPercent = Math.round((currentEvent?.progress || 0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-2xl glass-panel-elevated p-6 shadow-2xl border border-indigo-500/20 text-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">Analyzing Repository</h3>
              <p className="text-xs text-slate-400">Deterministic static analysis & semantic grounding</p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-2.5 mb-6 overflow-hidden p-0.5 border border-slate-700/50">
          <div
            className="bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 h-full rounded-full transition-all duration-300 shadow-glow"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>

        {/* Stage Timeline */}
        <div className="space-y-2 mb-6">
          {STAGES_ORDER.map((item, idx) => {
            const currentStageIdx = STAGES_ORDER.findIndex((s) => s.stage === currentEvent?.stage);
            const isFinished = isDone || (currentStageIdx !== -1 && idx < currentStageIdx);
            const isCurrent = currentEvent?.stage === item.stage && !isDone;

            return (
              <div
                key={item.stage}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${
                  isCurrent
                    ? 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-200'
                    : isFinished
                    ? 'text-slate-300'
                    : 'text-slate-500 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isFinished ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-600 ml-1 mr-1" />
                  )}
                  <span>{item.label}</span>
                </div>
                {isCurrent && currentEvent && (
                  <span className="text-[11px] font-mono text-cyan-300">
                    {currentEvent.processedFiles} / {currentEvent.totalFiles} files
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Terminal Log Box */}
        <div className="rounded-lg bg-slate-950/90 border border-slate-800 p-3 font-mono text-[11px] text-slate-300 max-h-28 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1 border-b border-slate-800 pb-1">
            <Terminal className="h-3 w-3" />
            <span>Analysis Worker Stream</span>
          </div>
          {logs.map((log, index) => (
            <div key={index} className="leading-relaxed text-slate-400">
              {log}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
