import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';

export const symbolRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Get all symbols for a repository
  fastify.get('/api/repositories/:id/symbols', async (request, reply) => {
    const { id } = request.params as { id: string };
    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const symbols = await db.getSymbolsForAnalysis(analysis.id);
    return { symbols };
  });

  // 2. Get symbol details by ID
  fastify.get('/api/repositories/:id/symbols/:symbolId', async (request, reply) => {
    const { id, symbolId } = request.params as { id: string; symbolId: string };
    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const symbols = await db.getSymbolsForAnalysis(analysis.id);
    const symbol = symbols.find((s) => s.id === symbolId || s.name === symbolId);
    if (!symbol) {
      return reply.status(404).send({ error: 'Symbol not found' });
    }

    const parent = symbol.parentId ? symbols.find((s) => s.id === symbol.parentId) : null;
    const children = symbols.filter((s) => s.parentId === symbol.id);

    return {
      symbol,
      parent,
      children,
    };
  });
};
