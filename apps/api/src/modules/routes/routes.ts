import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';
import { RequestFlowTrace, RequestFlowHop } from '@gitlens/shared-types';
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
    const { id } = request.params as { id: string };
    const parseResult = traceSchema.safeParse(request.body || {});
    const routeId = parseResult.success && parseResult.data.routeId ? parseResult.data.routeId : 'route-post-ocr';

    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    const routes = await db.getRoutesForAnalysis(analysis.id);
    const symbols = await db.getSymbolsForAnalysis(analysis.id);
    const files = await db.getFilesForAnalysis(analysis.id);

    if (routes.length === 0) {
      return {
        trace: {
          routeId: '',
          method: '',
          path: '',
          hops: [],
        },
      };
    }

    const route = routes.find((r) => r.id === routeId || r.path === routeId) || routes[0];
    const routeFile = files.find((f) => f.id === route.fileId || f.path === route.filePath) || {
      path: route.filePath || 'src/routes.js',
    };

    // Extract domain from route path (e.g. /api/v1/users -> User, /orders -> Order)
    const segments = route.path.split('/').filter((s) => s && !s.startsWith(':') && !s.startsWith('v1') && !s.startsWith('api'));
    const domainSegment = segments[0] || 'App';
    const domainName = domainSegment.charAt(0).toUpperCase() + domainSegment.slice(1);

    // Find controller symbol/file
    const controllerFile = files.find(
      (f) =>
        f.path.toLowerCase().includes(`${domainSegment.toLowerCase()}.controller`) ||
        f.path.toLowerCase().includes('controller')
    );
    const controllerSymbol = symbols.find(
      (s) =>
        s.name.toLowerCase().includes(domainSegment.toLowerCase()) &&
        (s.kind === 'class' || s.kind === 'method' || s.kind === 'function')
    );

    // Find service file
    const serviceFile = files.find(
      (f) =>
        f.path.toLowerCase().includes(`${domainSegment.toLowerCase()}.service`) ||
        f.path.toLowerCase().includes('service')
    );

    // Find middleware file
    const middlewareFile = files.find(
      (f) =>
        f.path.toLowerCase().includes('middleware') ||
        f.path.toLowerCase().includes('guard') ||
        f.path.toLowerCase().includes('auth')
    );

    // Find model / DB file
    const modelFile = files.find(
      (f) =>
        f.path.toLowerCase().includes(`${domainSegment.toLowerCase()}.model`) ||
        f.path.toLowerCase().includes('model') ||
        f.path.toLowerCase().includes('schema') ||
        f.path.toLowerCase().includes('entity') ||
        f.path.toLowerCase().includes('prisma')
    );

    const hops: RequestFlowHop[] = [
      {
        id: 'hop-1',
        nodeId: 'node-route-entry',
        label: `${route.method} ${route.path} (Route Handler Definition)`,
        type: 'route',
        file: route.filePath || routeFile.path,
        line: route.startLine || 1,
        confidence: 'static',
        confidenceScore: 1.0,
        details: `HTTP endpoint declared with ${route.method} method in ${route.filePath || routeFile.path}.`,
      },
    ];

    if (route.middleware && route.middleware.length > 0) {
      hops.push({
        id: `hop-${hops.length + 1}`,
        nodeId: 'node-guard',
        label: `${route.middleware.join(', ')} (Guard & Security Middleware)`,
        type: 'controller',
        file: middlewareFile?.path || route.filePath || 'src/middleware.js',
        line: 1,
        confidence: 'static',
        confidenceScore: 0.95,
        details: 'Executes authentication, request validation, and CORS/rate-limiting checks.',
      });
    }

    hops.push({
      id: `hop-${hops.length + 1}`,
      nodeId: 'node-controller',
      label: controllerSymbol
        ? `${controllerSymbol.name} (Route Controller Execution)`
        : `${domainName}Controller.${route.handlerName || 'handle'}`,
      type: 'controller',
      file: controllerFile?.path || route.filePath || routeFile.path,
      line: controllerSymbol?.startLine || route.startLine || 1,
      confidence: 'static',
      confidenceScore: 1.0,
      details: 'Unpacks HTTP payload, validates request schema, and orchestrates domain business logic.',
    });

    if (serviceFile) {
      hops.push({
        id: `hop-${hops.length + 1}`,
        nodeId: 'node-service',
        label: `${domainName}Service (Domain Business Logic Engine)`,
        type: 'service',
        file: serviceFile.path,
        line: 1,
        confidence: 'inferred',
        confidenceScore: 0.9,
        details: 'Executes core transactional business rules, calculations, and data processing.',
      });
    }

    if (modelFile) {
      hops.push({
        id: `hop-${hops.length + 1}`,
        nodeId: 'node-db',
        label: `${domainName} Persistence Store (${modelFile.path})`,
        type: 'database',
        file: modelFile.path,
        line: 1,
        confidence: 'static',
        confidenceScore: 0.85,
        details: 'Executes persistent CRUD operations, schema validations, and database queries.',
      });
    }

    const trace: RequestFlowTrace = {
      routeId: route.id,
      method: route.method,
      path: route.path,
      hops,
    };

    return { trace };
  });
};
