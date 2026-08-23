import { FastifyPluginAsync } from 'fastify';
import { metrics } from '@gitlens/telemetry';

export const diagnosticsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health/detailed', async () => {
    return metrics.getDiagnostics();
  });

  fastify.get('/api/diagnostics', async () => {
    return metrics.getDiagnostics();
  });
};
