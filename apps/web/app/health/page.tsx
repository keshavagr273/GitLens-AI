'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Server, Database, Radio } from 'lucide-react';
import { API_BASE_URL } from '../../lib/api';

interface HealthData {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: { status: string; mode: string };
  redis: { status: string; mode: string };
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/health`);
      if (!res.ok) throw new Error('API server returned error');
      const data = await res.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || 'Unable to reach backend API');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto bg-[#0a0a0b] text-[#f5f3ee] font-sans selection:bg-[#e8a33d]/30 selection:text-[#f5f3ee]">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-[#a09f9c] hover:text-[#f5f3ee] px-3.5 py-1.5 rounded-[3px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Landing</span>
        </Link>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="btn-amber px-4 py-1.5 text-xs"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="mb-8">
        <h1 className="font-serif text-3xl font-normal text-[#f5f3ee] mb-2 flex items-center gap-3">
          <div className="h-8 w-8 rounded-[3px] bg-[#141312] border border-[#e8a33d] flex items-center justify-center text-[#e8a33d]">
            <Server className="h-4 w-4" />
          </div>
          <span>System Diagnostic & Health Status</span>
        </h1>
        <p className="text-xs text-[#a09f9c] font-normal">Real-time status of backend services, queues, and database engines.</p>
      </div>

      {loading && !health ? (
        <div className="p-8 rounded-[4px] bg-[#141312] border border-white/8 text-center text-[#a09f9c] text-xs font-mono">
          Checking microservice endpoints...
        </div>
      ) : error ? (
        <div className="p-5 rounded-[4px] bg-red-950/40 border border-red-800/40 text-red-300 text-xs flex items-start gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <div>
            <p className="font-semibold font-mono">Backend Unreachable</p>
            <p className="text-xs text-red-400/80 mt-1 font-mono">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d]">
                <Server className="h-4 w-4" />
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="font-mono font-semibold text-[#f5f3ee] text-xs mb-1 uppercase tracking-wider">Fastify API Server</h3>
            <p className="text-[11px] text-[#a09f9c] mb-3">Core HTTP & SSE Gateway</p>
            <div className="text-[10px] font-mono px-2.5 py-0.5 rounded-[2px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 inline-block font-semibold">
              {health?.status.toUpperCase()}
            </div>
          </div>

          <div className="p-5 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d]">
                <Database className="h-4 w-4" />
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="font-mono font-semibold text-[#f5f3ee] text-xs mb-1 uppercase tracking-wider">Database Engine</h3>
            <p className="text-[11px] text-[#a09f9c] mb-3">{health?.database.mode}</p>
            <div className="text-[10px] font-mono px-2.5 py-0.5 rounded-[2px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 inline-block font-semibold">
              {health?.database.status.toUpperCase()}
            </div>
          </div>

          <div className="p-5 rounded-[4px] bg-[#141312] border border-white/8 hover:border-[#e8a33d]/40 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="h-8 w-8 rounded-[3px] bg-[#0a0a0b] border border-white/10 flex items-center justify-center text-[#e8a33d]">
                <Radio className="h-4 w-4" />
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <h3 className="font-mono font-semibold text-[#f5f3ee] text-xs mb-1 uppercase tracking-wider">SSE Progress Bus</h3>
            <p className="text-[11px] text-[#a09f9c] mb-3">{health?.redis.mode}</p>
            <div className="text-[10px] font-mono px-2.5 py-0.5 rounded-[2px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 inline-block font-semibold">
              {health?.redis.status.toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
