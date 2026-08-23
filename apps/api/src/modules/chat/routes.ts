import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';
import { z } from 'zod';
import { aiOrchestrator } from '@gitlens/ai-core';

const chatSchema = z.object({
  message: z.string().min(1),
  sessionId: z.string().optional(),
});

export const chatRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/api/repositories/:id/chat', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parseResult = chatSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({ error: 'Message is required' });
    }

    const { message, sessionId = 'default' } = parseResult.data;

    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const [files, symbols, chunks] = await Promise.all([
      db.getFilesForAnalysis(analysis.id),
      db.getSymbolsForAnalysis(analysis.id),
      db.getChunksForAnalysis(analysis.id),
    ]);

    const chatResponse = await aiOrchestrator.processQuery({
      repositoryId: id,
      sessionId,
      userPrompt: message,
      files,
      symbols,
      chunks,
    });

    return chatResponse;
  });
};
