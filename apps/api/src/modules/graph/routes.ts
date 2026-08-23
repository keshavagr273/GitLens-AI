import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';

export const graphRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/api/repositories/:id/graph', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { mode } = request.query as { mode?: 'architecture' | 'dependency' | 'flow' };

    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const { nodes, edges } = await db.getGraphForAnalysis(analysis.id, mode || 'architecture');

    return {
      repositoryId: id,
      analysisId: analysis.id,
      mode: mode || 'architecture',
      nodes,
      edges,
    };
  });
};
