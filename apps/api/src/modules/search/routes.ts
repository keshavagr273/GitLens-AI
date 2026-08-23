import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';
import { HybridRetriever } from '@gitlens/rag-core';

export const searchRoutes: FastifyPluginAsync = async (fastify) => {
  // Hybrid RRF Search endpoint
  fastify.post('/api/repositories/:id/search', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { query, topK = 5 } = request.body as { query?: string; topK?: number };

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return reply.status(400).send({ error: 'Search query is required' });
    }

    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const chunks = await db.getChunksForAnalysis(analysis.id);
    if (chunks.length === 0) {
      return { results: [], query, totalIndexed: 0 };
    }

    const retriever = new HybridRetriever(chunks);
    const results = retriever.search(query, topK);

    return {
      query,
      results,
      totalIndexed: chunks.length,
    };
  });
};
