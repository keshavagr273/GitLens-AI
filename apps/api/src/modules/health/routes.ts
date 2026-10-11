import { FastifyPluginAsync } from 'fastify';
import { config } from '@gitlens/config';
import { githubClient } from '@gitlens/ingestion';

/**
 * Describes a configured backing service. The analysis store is currently
 * in-process, so persistence is reported as such rather than claiming a
 * connection to a database the server never opens.
 */
function describePersistence() {
  const isSupabase = config.DATABASE_URL.includes('supabase');
  return {
    status: 'in-memory' as const,
    mode: 'In-process analysis store (not persisted across restarts)',
    configuredUrl: isSupabase ? 'Supabase PostgreSQL (configured, not yet wired)' : 'PostgreSQL (configured, not yet wired)',
  };
}

function describeCache() {
  const isUpstash = config.REDIS_URL.includes('upstash');
  return {
    status: 'in-memory' as const,
    mode: 'In-process cache (no Redis client attached)',
    configuredUrl: isUpstash ? 'Upstash Redis (configured, not yet wired)' : 'Redis (configured, not yet wired)',
  };
}

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Liveness: cheap, never touches the network.
  fastify.get('/health', async () => ({
    status: 'ok',
    service: 'gitlens-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: describePersistence(),
    redis: describeCache(),
  }));

  // Readiness: actually probes the upstreams the analysis pipeline depends on.
  fastify.get('/health/ready', async (_request, reply) => {
    const github = await githubClient.checkAccess();
    const llm = await probeLlm();

    const degraded = !github.ok || !llm.ok;
    reply.status(degraded ? 503 : 200);

    return {
      status: degraded ? 'degraded' : 'ok',
      timestamp: new Date().toISOString(),
      checks: {
        github,
        llm,
        database: describePersistence(),
        redis: describeCache(),
      },
    };
  });
};

async function probeLlm(): Promise<{ ok: boolean; detail: string }> {
  const key = config.GROQ_API_KEY || config.LLM_API_KEY;
  if (!key) {
    return { ok: false, detail: 'No LLM API key configured; chat falls back to deterministic synthesis.' };
  }
  try {
    const base = (config.GROQ_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/models`, {
      headers: { Authorization: `Bearer ${key.trim()}` },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      return { ok: false, detail: `LLM provider returned HTTP ${res.status}.` };
    }
    return { ok: true, detail: `${config.LLM_PROVIDER} reachable (model: ${config.GROQ_MODEL}).` };
  } catch (err: any) {
    return { ok: false, detail: `LLM provider unreachable: ${err.message || err}` };
  }
}
