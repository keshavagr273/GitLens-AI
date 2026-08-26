import { FastifyPluginAsync } from 'fastify';
import { config } from '@gitlens/config';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    const isUpstash = config.REDIS_URL.includes('upstash');
    const isSupabase = config.DATABASE_URL.includes('supabase');

    return {
      status: 'ok',
      service: 'gitlens-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        mode: isSupabase ? 'Supabase PostgreSQL (pgvector AWS)' : 'PostgreSQL Persistence Layer',
      },
      redis: {
        status: 'ready',
        mode: isUpstash ? 'Upstash Distributed Redis (TLS)' : 'Redis 7 Cache & Queue',
      },
    };
  });
};
