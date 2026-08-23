import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { config } from '@gitlens/config';
import { healthRoutes } from './modules/health/routes';
import { repositoryRoutes } from './modules/repositories/routes';
import { analysisRoutes } from './modules/analysis/routes';
import { graphRoutes } from './modules/graph/routes';
import { apiRouteEndpoints } from './modules/routes/routes';
import { chatRoutes } from './modules/chat/routes';

export async function createServer() {
  const app = Fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'silent' : 'info',
    },
  });

  // Plugins
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  await app.register(sensible);

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    app.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.status(statusCode).send({
      error: {
        message: error.message || 'Internal Server Error',
        code: error.code || 'INTERNAL_ERROR',
      },
    });
  });

  // Register Modules
  await app.register(healthRoutes);
  await app.register(repositoryRoutes);
  await app.register(analysisRoutes);
  await app.register(graphRoutes);
  await app.register(apiRouteEndpoints);
  await app.register(chatRoutes);

  return app;
}

if (require.main === module) {
  createServer().then((app) => {
    app.listen({ port: config.PORT, host: config.HOST }, (err, address) => {
      if (err) {
        app.log.error(err);
        process.exit(1);
      }
      console.log(`🚀 GitLens AI API Server running at ${address}`);
      console.log(`👉 Health check: ${address}/health`);
    });
  });
}
