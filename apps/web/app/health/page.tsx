'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, AlertCircle, RefreshCw, Server, Database, Layers, Radio } from 'lucide-react';

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
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiBase}/health`);
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
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg glass-panel hover:border-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Landing</span>
        </Link>
        <button
          onClick={fetchHealth}
          disabled={loading}
          className="inline-flex items-center gap-2 text-xs text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
          <Server className="h-6 w-6 text-indigo-400" />
          <span>System Diagnostic & Health Status</span>
        </h1>
        <p className="text-xs text-slate-400">Real-time status of backend services, queues, and database engines.</p>
      </div>

      {loading && !health ? (
        <div className="p-8 rounded-2xl glass-panel text-center text-slate-400 text-sm">
          Checking microservice endpoints...
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Backend Unreachable</p>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <Server className="h-5 w-5 text-indigo-400" />
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Fastify API Server</h3>
            <p className="text-xs text-slate-400 mb-3">Core HTTP & SSE Gateway</p>
            <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 text-emerald-400 border border-slate-800 inline-block">
              {health?.status.toUpperCase()}
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <Database className="h-5 w-5 text-cyan-400" />
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">Database Engine</h3>
            <p className="text-xs text-slate-400 mb-3">{health?.database.mode}</p>
            <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 text-cyan-400 border border-slate-800 inline-block">
              {health?.database.status.toUpperCase()}
            </div>
          </div>

          <div className="p-6 rounded-2xl glass-panel border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <Radio className="h-5 w-5 text-emerald-400" />
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="font-semibold text-white text-sm mb-1">SSE Progress Bus</h3>
            <p className="text-xs text-slate-400 mb-3">{health?.redis.mode}</p>
            <div className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 text-emerald-400 border border-slate-800 inline-block">
              {health?.redis.status.toUpperCase()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
