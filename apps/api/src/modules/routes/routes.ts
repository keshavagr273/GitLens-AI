import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';
import { z } from 'zod';

const traceSchema = z.object({
  routeId: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
});

export const apiRouteEndpoints: FastifyPluginAsync = async (fastify) => {
  // 1. Get routes for repository
  fastify.get('/api/repositories/:id/routes', async (request, reply) => {
    const { id } = request.params as { id: string };
    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const routes = await db.getRoutesForAnalysis(analysis.id);
    return { routes };
  });

  // 2. Trace request flow for an endpoint
  fastify.post('/api/repositories/:id/trace', async (request, reply) => {
    const parseResult = traceSchema.safeParse(request.body || {});
    const routeId = parseResult.success && parseResult.data.routeId ? parseResult.data.routeId : 'route-post-orders';

    const trace = await db.getRequestFlowTrace(routeId);
    if (!trace) {
      return reply.status(404).send({ error: 'Request flow trace could not be determined' });
    }

    return { trace };
  });
};
