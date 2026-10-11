'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnalysisProgressEvent, AnalysisStage } from '@gitlens/shared-types';
import { CheckCircle2, Loader2, AlertCircle, Sparkles, Terminal } from 'lucide-react';
import { API_BASE_URL, fetchAnalysisStatus } from '../../lib/api';

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

  // Holding the callback in a ref keeps an unrelated parent re-render from
  // tearing down and restarting the progress stream mid-analysis.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!isOpen || !analysisId) return;

    let settled = false;
    let sawLiveEvent = false;
    let streamFailures = 0;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    const eventSource = new EventSource(`${API_BASE_URL}/api/analyses/${analysisId}/progress`);

    const appendLog = (message: string) =>
      setLogs((prev) => [...prev.slice(-15), `[${new Date().toLocaleTimeString()}] ${message}`]);

    const succeed = () => {
      if (settled) return;
      settled = true;
      setIsDone(true);
      eventSource.close();
      setTimeout(() => onCompleteRef.current(), 1000);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      setError(message);
      eventSource.close();
    };

    // The stream can be cut by a proxy, or refused outright, before it ever
    // delivers an event. The analysis record is the source of truth, so poll it
    // as a safety net: the workspace must only open once its data exists.
    const poll = async () => {
      const analysis = await fetchAnalysisStatus(analysisId);
      if (settled) return;

      if (analysis?.status === 'COMPLETED') {
        appendLog('Analysis complete.');
        succeed();
        return;
      }
      if (analysis?.status === 'FAILED') {
        fail(analysis.error || 'Analysis failed.');
        return;
      }
      if (analysis && !sawLiveEvent) {
        setCurrentEvent({
          analysisId,
          stage: analysis.stage,
          progress: analysis.progress ?? 0,
          processedFiles: analysis.processedFiles ?? 0,
          totalFiles: analysis.totalFiles ?? 0,
          message: `Stage: ${analysis.stage}`,
          timestamp: new Date().toISOString(),
        });
      }
      pollTimer = setTimeout(poll, 2000);
    };

    pollTimer = setTimeout(poll, 2000);

    eventSource.onmessage = (event) => {
      try {
        const data: AnalysisProgressEvent = JSON.parse(event.data);
        sawLiveEvent = true;
        setCurrentEvent(data);
        appendLog(data.message);

        if (data.stage === 'COMPLETED') {
          succeed();
        } else if (data.stage === 'FAILED') {
          fail(data.message || 'Analysis failed.');
        }
      } catch (err) {
        console.error('Failed to parse SSE event', err);
      }
    };

    // A dropped stream is not a finished analysis. Let the poll decide, and
    // stop the browser's reconnect loop once the stream is clearly unusable.
    eventSource.onerror = () => {
      if (settled) return;
      streamFailures += 1;
      if (streamFailures === 1) {
        appendLog('Live stream interrupted - polling analysis status...');
      }
      if (streamFailures >= 3 && !sawLiveEvent) {
        eventSource.close();
      }
    };

    return () => {
      settled = true;
      if (pollTimer) clearTimeout(pollTimer);
      eventSource.close();
    };
  }, [analysisId, isOpen]);

  if (!isOpen) return null;

  const progressPercent = Math.round((currentEvent?.progress || 0) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in font-sans">
      <div className="w-full max-w-lg rounded-[4px] bg-[#141312] border border-white/10 p-6 shadow-2xl text-[#f5f3ee]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-[2px] bg-[#0a0a0b] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-normal text-[#f5f3ee]">Analyzing Repository</h3>
              <p className="text-[11px] text-[#a09f9c] font-mono">Deterministic static analysis & AST parsing</p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-[2px] bg-[#0a0a0b] text-[#e8a33d] border border-[#e8a33d]/30 font-semibold">
            {progressPercent}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-[#0a0a0b] rounded-[2px] h-2 mb-5 overflow-hidden border border-white/8">
          <div
            className="bg-[#e8a33d] h-full transition-all duration-300"
            style={{ width: `${Math.max(5, progressPercent)}%` }}
          />
        </div>

        {/* Stage Timeline */}
        <div className="space-y-1.5 mb-5 font-mono text-[11px]">
          {STAGES_ORDER.map((item, idx) => {
            const currentStageIdx = STAGES_ORDER.findIndex((s) => s.stage === currentEvent?.stage);
            const isFinished = isDone || (currentStageIdx !== -1 && idx < currentStageIdx);
            const isCurrent = currentEvent?.stage === item.stage && !isDone;

            return (
              <div
                key={item.stage}
                className={`flex items-center justify-between px-3 py-2 rounded-[2px] transition-colors ${
                  isCurrent
                    ? 'bg-[#0a0a0b] border border-[#e8a33d]/40 text-[#f5f3ee]'
                    : isFinished
                    ? 'text-[#a09f9c]'
                    : 'text-[#4b5563]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isFinished ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="h-3.5 w-3.5 text-[#e8a33d] animate-spin" />
                  ) : (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#4b5563] ml-1 mr-1" />
                  )}
                  <span>{item.label}</span>
                </div>
                {isCurrent && currentEvent && (
                  <span className="text-[10px] text-[#e8a33d]">
                    {currentEvent.processedFiles} / {currentEvent.totalFiles}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Live Terminal Log Box */}
        <div className="rounded-[3px] bg-[#0a0a0b] border border-white/8 p-3 font-mono text-[10px] text-[#a09f9c] max-h-24 overflow-y-auto">
          <div className="flex items-center gap-1.5 text-[#4b5563] mb-1 border-b border-white/5 pb-1">
            <Terminal className="h-3 w-3 text-[#e8a33d]" />
            <span className="font-medium text-[10px]">Worker Stream</span>
          </div>
          {logs.map((log, index) => (
            <div key={index} className="leading-tight text-[#a09f9c]">
              {log}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-[2px] bg-red-950/40 border border-red-800/40 text-red-300 text-[11px] flex items-center gap-2 font-mono">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
