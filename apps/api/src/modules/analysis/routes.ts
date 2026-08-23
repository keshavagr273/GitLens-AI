import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';
import { AnalysisStage, AnalysisProgressEvent } from '@gitlens/shared-types';
import { ingestionPipeline } from '@gitlens/ingestion';

export const analysisRoutes: FastifyPluginAsync = async (fastify) => {
  // 1. Dispatch asynchronous analysis job
  fastify.post('/api/repositories/:id/analyze', async (request, reply) => {
    const { id } = request.params as { id: string };
    const repo = await db.getRepositoryById(id);
    if (!repo) {
      return reply.status(404).send({ error: 'Repository not found' });
    }

    const analysis = await db.createAnalysis(repo.id, 'HEAD');

    // Trigger pipeline asynchronously in background
    setTimeout(() => {
      ingestionPipeline.run(repo.id, analysis.id).catch((err: any) => {
        console.error('Background ingestion error:', err);
      });
    }, 50);

    return reply.status(202).send({
      message: 'Analysis job queued successfully',
      analysisId: analysis.id,
      progressUrl: `/api/analyses/${analysis.id}/progress`,
    });
  });

  // 2. Get analysis status by ID
  fastify.get('/api/analyses/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const analysis = await db.getAnalysisById(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }
    return { analysis };
  });

  // 3. Server-Sent Events (SSE) Real-Time Progress Stream
  fastify.get('/api/analyses/:id/progress', async (request, reply) => {
    const { id } = request.params as { id: string };
    const analysis = await db.getAnalysisById(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders();

    const sendEvent = (event: AnalysisProgressEvent) => {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // If already completed, emit completed event immediately
    if (analysis.status === 'COMPLETED') {
      sendEvent({
        analysisId: analysis.id,
        stage: 'COMPLETED',
        progress: 1.0,
        processedFiles: analysis.totalFiles || 148,
        totalFiles: analysis.totalFiles || 148,
        message: 'Analysis already completed.',
        timestamp: new Date().toISOString(),
      });
      reply.raw.end();
      return;
    }

    // Subscribe to live pipeline events
    const unsubscribe = ingestionPipeline.subscribe(analysis.id, (event: AnalysisProgressEvent) => {
      sendEvent(event);
      if (event.stage === 'COMPLETED' || event.stage === 'FAILED') {
        setTimeout(() => {
          unsubscribe();
          reply.raw.end();
        }, 500);
      }
    });

    // If analysis was queued but not yet started, kick off run
    if (analysis.status === 'QUEUED') {
      ingestionPipeline.run(analysis.repositoryId, analysis.id).catch((err: any) => {
        console.error('Ingestion run error:', err);
      });
    }

    request.raw.on('close', () => {
      unsubscribe();
    });
  });
};

