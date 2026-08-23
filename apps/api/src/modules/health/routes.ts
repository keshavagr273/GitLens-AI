import { FastifyPluginAsync } from 'fastify';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async () => {
    return {
      status: 'ok',
      service: 'gitlens-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      database: { status: 'connected', mode: 'in-memory-with-pg-fallback' },
      redis: { status: 'ready', mode: 'in-memory-sse-stream' },
    };
  });
};
