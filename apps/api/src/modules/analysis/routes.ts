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

    // Trigger pipeline asynchronously in background. runOnce de-duplicates
    // against the run the SSE progress stream may also start.
    ingestionPipeline.runOnce(repo.id, analysis.id).catch((err: any) => {
      fastify.log.error({ err, analysisId: analysis.id }, 'Background ingestion failed');
    });

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

    // @fastify/cors stores its headers on the Fastify reply, and they are only
    // written to the socket by reply.send(). This handler writes to reply.raw
    // directly, so they have to be copied across by hand - without them the
    // browser rejects the cross-origin EventSource before the first event and
    // the client never learns the analysis finished.
    for (const [key, value] of Object.entries(reply.getHeaders())) {
      if (value !== undefined) {
        reply.raw.setHeader(key, value as number | string | string[]);
      }
    }

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no');
    // Fastify must not try to send a payload of its own over this stream.
    reply.hijack();
    reply.raw.flushHeaders();

    let closed = false;
    const sendEvent = (event: AnalysisProgressEvent) => {
      if (closed) return;
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    // Proxies drop idle connections; a periodic comment keeps the stream
    // alive during long FETCHING stages that emit no events.
    const heartbeat = setInterval(() => {
      if (!closed) reply.raw.write(': keepalive' + String.fromCharCode(10, 10));
    }, 15000);

    const finish = () => {
      if (closed) return;
      closed = true;
      clearInterval(heartbeat);
      reply.raw.end();
    };

    // If already completed, emit completed event immediately
    if (analysis.status === 'COMPLETED' || analysis.status === 'FAILED') {
      const total = analysis.totalFiles ?? 0;
      sendEvent({
        analysisId: analysis.id,
        stage: analysis.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
        progress: 1.0,
        processedFiles: analysis.processedFiles ?? total,
        totalFiles: total,
        message: analysis.status === 'COMPLETED' ? 'Analysis already completed.' : analysis.error || 'Analysis failed.',
        timestamp: new Date().toISOString(),
      });
      finish();
      return;
    }

    // Subscribe to live pipeline events
    const unsubscribe = ingestionPipeline.subscribe(analysis.id, (event: AnalysisProgressEvent) => {
      sendEvent(event);
      if (event.stage === 'COMPLETED' || event.stage === 'FAILED') {
        setTimeout(() => {
          unsubscribe();
          finish();
        }, 500);
      }
    });

    // If analysis was queued and nothing is running it yet, start it.
    if (analysis.status === 'QUEUED' && !ingestionPipeline.isRunning(analysis.id)) {
      ingestionPipeline.runOnce(analysis.repositoryId, analysis.id).catch((err: any) => {
        fastify.log.error({ err, analysisId: analysis.id }, 'Ingestion run failed');
      });
    }

    request.raw.on('close', () => {
      unsubscribe();
      finish();
    });
  });
};

