import {
  Repository,
  RepositoryAnalysis,
  SourceFile,
  SymbolNode,
  GraphNode,
  GraphEdge,
  ApiRoute,
  Technology,
  RequestFlowTrace,
} from '@gitlens/shared-types';

export const SEED_REPOSITORIES: Repository[] = [
  {
    id: 'repo-fastify-core',
    owner: 'fastify',
    name: 'fastify',
    githubUrl: 'https://github.com/fastify/fastify',
    defaultBranch: 'main',
    isPrivate: false,
    description: 'Fast and low overhead web framework, for Node.js',
    primaryLanguage: 'TypeScript',
    sizeKb: 14200,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'repo-express-app',
    owner: 'expressjs',
    name: 'express',
    githubUrl: 'https://github.com/expressjs/express',
    defaultBranch: 'master',
    isPrivate: false,
    description: 'Fast, unopinionated, minimalist web framework for node.',
    primaryLanguage: 'JavaScript',
    sizeKb: 8900,
    createdAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const SEED_ANALYSES: Record<string, RepositoryAnalysis> = {
  'repo-fastify-core': {
    id: 'analysis-fastify-001',
    repositoryId: 'repo-fastify-core',
    commitSha: '7a8f9c2d1e0b',
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 1.0,
    totalFiles: 148,
    processedFiles: 148,
    error: null,
    analysisVersion: {
      parser: '1.3.0',
      detectors: '1.1.0',
      embeddingModel: 'text-embedding-3-small',
      schemaVersion: 4,
    },
    startedAt: new Date(Date.now() - 3600000).toISOString(),
    completedAt: new Date(Date.now() - 3500000).toISOString(),
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  'repo-express-app': {
    id: 'analysis-express-001',
    repositoryId: 'repo-express-app',
    commitSha: '5c2e8a1f4b9d',
    status: 'COMPLETED',
    stage: 'COMPLETED',
    progress: 1.0,
    totalFiles: 82,
    processedFiles: 82,
    error: null,
    analysisVersion: {
      parser: '1.3.0',
      detectors: '1.1.0',
      embeddingModel: 'text-embedding-3-small',
      schemaVersion: 4,
    },
    startedAt: new Date(Date.now() - 7200000).toISOString(),
    completedAt: new Date(Date.now() - 7100000).toISOString(),
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
};

export const SEED_FILES: Record<string, SourceFile[]> = {
  'analysis-fastify-001': [
    {
      id: 'file-fastify-app',
      analysisId: 'analysis-fastify-001',
      path: 'src/server.ts',
      language: 'typescript',
      sizeBytes: 1240,
      contentHash: 'a1b2c3d4e5f6',
      isGenerated: false,
      importanceScore: 9.8,
      createdAt: new Date().toISOString(),
      content: `import Fastify, { FastifyInstance } from 'fastify';
import { authRoutes } from './routes/auth.routes';
import { orderRoutes } from './routes/order.routes';
import { setupDatabase } from './db/connection';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await setupDatabase();

  app.register(authRoutes, { prefix: '/api/v1/auth' });
  app.register(orderRoutes, { prefix: '/api/v1/orders' });

  app.get('/health', async () => {
    return { status: 'ok', timestamp: Date.now() };
  });

  return app;
}

if (require.main === module) {
  buildApp().then((server) => {
    server.listen({ port: 3000, host: '0.0.0.0' }, (err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
    });
  });
}
`,
    },
    {
      id: 'file-fastify-auth-routes',
      analysisId: 'analysis-fastify-001',
      path: 'src/routes/auth.routes.ts',
      language: 'typescript',
      sizeBytes: 1680,
      contentHash: 'b2c3d4e5f6a1',
      isGenerated: false,
      importanceScore: 8.5,
      createdAt: new Date().toISOString(),
      content: `import { FastifyPluginAsync } from 'fastify';
import { AuthController } from '../controllers/auth.controller';
import { verifyJwt } from '../middleware/jwt.middleware';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const controller = new AuthController();

  fastify.post('/login', async (request, reply) => {
    return controller.login(request, reply);
  });

  fastify.post('/register', async (request, reply) => {
    return controller.register(request, reply);
  });

  fastify.get('/me', { preHandler: [verifyJwt] }, async (request, reply) => {
    return controller.getProfile(request, reply);
  });
};
`,
    },
    {
      id: 'file-fastify-order-routes',
      analysisId: 'analysis-fastify-001',
      path: 'src/routes/order.routes.ts',
      language: 'typescript',
      sizeBytes: 1920,
      contentHash: 'c3d4e5f6a1b2',
      isGenerated: false,
      importanceScore: 9.1,
      createdAt: new Date().toISOString(),
      content: `import { FastifyPluginAsync } from 'fastify';
import { OrderController } from '../controllers/order.controller';
import { verifyJwt } from '../middleware/jwt.middleware';

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  const orderController = new OrderController();

  fastify.post('/', { preHandler: [verifyJwt] }, async (request, reply) => {
    return orderController.createOrder(request, reply);
  });

  fastify.get('/:id', { preHandler: [verifyJwt] }, async (request, reply) => {
    return orderController.getOrderById(request, reply);
  });

  fastify.get('/', { preHandler: [verifyJwt] }, async (request, reply) => {
    return orderController.listOrders(request, reply);
  });
};
`,
    },
    {
      id: 'file-fastify-order-controller',
      analysisId: 'analysis-fastify-001',
      path: 'src/controllers/order.controller.ts',
      language: 'typescript',
      sizeBytes: 2400,
      contentHash: 'd4e5f6a1b2c3',
      isGenerated: false,
      importanceScore: 8.9,
      createdAt: new Date().toISOString(),
      content: `import { FastifyRequest, FastifyReply } from 'fastify';
import { OrderService } from '../services/order.service';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as { items: Array<{ id: string; qty: number }>; paymentMethod: string };
    const order = await this.orderService.create(body);
    return reply.status(201).send(order);
  }

  async getOrderById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const order = await this.orderService.findById(id);
    if (!order) {
      return reply.status(404).send({ error: 'Order not found' });
    }
    return reply.send(order);
  }

  async listOrders(request: FastifyRequest, reply: FastifyReply) {
    const orders = await this.orderService.list();
    return reply.send({ orders });
  }
}
`,
    },
    {
      id: 'file-fastify-order-service',
      analysisId: 'analysis-fastify-001',
      path: 'src/services/order.service.ts',
      language: 'typescript',
      sizeBytes: 2800,
      contentHash: 'e5f6a1b2c3d4',
      isGenerated: false,
      importanceScore: 9.4,
      createdAt: new Date().toISOString(),
      content: `import { OrderRepository } from '../repositories/order.repository';
import { PaymentClient } from '../clients/payment.client';
import { RedisQueue } from '../queues/redis.queue';

export class OrderService {
  private repository: OrderRepository;
  private paymentClient: PaymentClient;
  private queue: RedisQueue;

  constructor() {
    this.repository = new OrderRepository();
    this.paymentClient = new PaymentClient();
    this.queue = new RedisQueue();
  }

  async create(data: { items: Array<{ id: string; qty: number }>; paymentMethod: string }) {
    // 1. Calculate order total
    const total = data.items.reduce((sum, item) => sum + item.qty * 100, 0);

    // 2. Charge via payment gateway
    const payment = await this.paymentClient.charge({ amount: total, method: data.paymentMethod });

    // 3. Persist order in PostgreSQL
    const order = await this.repository.save({
      items: data.items,
      totalAmount: total,
      paymentId: payment.id,
      status: 'PAID'
    });

    // 4. Dispatch async fulfillment job
    await this.queue.publish('order-fulfillment', { orderId: order.id });

    return order;
  }

  async findById(id: string) {
    return this.repository.findById(id);
  }

  async list() {
    return this.repository.findAll();
  }
}
`,
    },
    {
      id: 'file-fastify-order-repo',
      analysisId: 'analysis-fastify-001',
      path: 'src/repositories/order.repository.ts',
      language: 'typescript',
      sizeBytes: 1800,
      contentHash: 'f6a1b2c3d4e5',
      isGenerated: false,
      importanceScore: 8.7,
      createdAt: new Date().toISOString(),
      content: `import { prisma } from '../db/prisma.client';

export class OrderRepository {
  async save(data: { items: any; totalAmount: number; paymentId: string; status: string }) {
    return prisma.order.create({
      data: {
        totalAmount: data.totalAmount,
        paymentId: data.paymentId,
        status: data.status,
        items: {
          create: data.items.map((item: any) => ({
            productId: item.id,
            quantity: item.qty,
          }))
        }
      }
    });
  }

  async findById(id: string) {
    return prisma.order.findUnique({
      where: { id },
      include: { items: true }
    });
  }

  async findAll() {
    return prisma.order.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }
}
`,
    },
  ],
};

export const SEED_SYMBOLS: Record<string, SymbolNode[]> = {
  'analysis-fastify-001': [
    {
      id: 'sym-build-app',
      fileId: 'file-fastify-app',
      name: 'buildApp',
      kind: 'function',
      startLine: 6,
      endLine: 20,
      startColumn: 0,
      endColumn: 1,
      signature: '(): Promise<FastifyInstance>',
      metrics: { cyclomaticComplexity: 2, loc: 14, parameterCount: 0 },
    },
    {
      id: 'sym-auth-routes',
      fileId: 'file-fastify-auth-routes',
      name: 'authRoutes',
      kind: 'variable',
      startLine: 5,
      endLine: 19,
      startColumn: 13,
      endColumn: 1,
      signature: 'FastifyPluginAsync',
      metrics: { cyclomaticComplexity: 1, loc: 14, parameterCount: 1 },
    },
    {
      id: 'sym-order-routes',
      fileId: 'file-fastify-order-routes',
      name: 'orderRoutes',
      kind: 'variable',
      startLine: 5,
      endLine: 19,
      startColumn: 13,
      endColumn: 1,
      signature: 'FastifyPluginAsync',
      metrics: { cyclomaticComplexity: 1, loc: 14, parameterCount: 1 },
    },
    {
      id: 'sym-order-ctrl-class',
      fileId: 'file-fastify-order-controller',
      name: 'OrderController',
      kind: 'class',
      startLine: 4,
      endLine: 28,
      startColumn: 0,
      endColumn: 1,
      metrics: { cyclomaticComplexity: 4, loc: 24, parameterCount: 0 },
    },
    {
      id: 'sym-order-ctrl-create',
      fileId: 'file-fastify-order-controller',
      parentId: 'sym-order-ctrl-class',
      name: 'createOrder',
      kind: 'method',
      startLine: 11,
      endLine: 15,
      startColumn: 2,
      endColumn: 3,
      signature: '(request: FastifyRequest, reply: FastifyReply)',
      metrics: { cyclomaticComplexity: 1, loc: 5, parameterCount: 2 },
    },
    {
      id: 'sym-order-svc-class',
      fileId: 'file-fastify-order-service',
      name: 'OrderService',
      kind: 'class',
      startLine: 5,
      endLine: 44,
      startColumn: 0,
      endColumn: 1,
      metrics: { cyclomaticComplexity: 5, loc: 39, parameterCount: 0 },
    },
    {
      id: 'sym-order-svc-create',
      fileId: 'file-fastify-order-service',
      parentId: 'sym-order-svc-class',
      name: 'create',
      kind: 'method',
      startLine: 16,
      endLine: 35,
      startColumn: 2,
      endColumn: 3,
      signature: '(data: { items: Array<{ id: string; qty: number }>; paymentMethod: string })',
      metrics: { cyclomaticComplexity: 2, loc: 20, parameterCount: 1 },
    },
    {
      id: 'sym-order-repo-class',
      fileId: 'file-fastify-order-repo',
      name: 'OrderRepository',
      kind: 'class',
      startLine: 3,
      endLine: 29,
      startColumn: 0,
      endColumn: 1,
      metrics: { cyclomaticComplexity: 3, loc: 26, parameterCount: 0 },
    },
    {
      id: 'sym-order-repo-save',
      fileId: 'file-fastify-order-repo',
      parentId: 'sym-order-repo-class',
      name: 'save',
      kind: 'method',
      startLine: 4,
      endLine: 17,
      startColumn: 2,
      endColumn: 3,
      signature: '(data: { items: any; totalAmount: number; paymentId: string; status: string })',
      metrics: { cyclomaticComplexity: 1, loc: 14, parameterCount: 1 },
    },
  ],
};

export const SEED_ROUTES: Record<string, ApiRoute[]> = {
  'analysis-fastify-001': [
    {
      id: 'route-post-orders',
      analysisId: 'analysis-fastify-001',
      method: 'POST',
      path: '/api/v1/orders',
      fileId: 'file-fastify-order-routes',
      filePath: 'src/routes/order.routes.ts',
      handlerSymbolId: 'sym-order-ctrl-create',
      handlerName: 'OrderController.createOrder',
      startLine: 8,
      middleware: ['verifyJwt'],
    },
    {
      id: 'route-get-order-id',
      analysisId: 'analysis-fastify-001',
      method: 'GET',
      path: '/api/v1/orders/:id',
      fileId: 'file-fastify-order-routes',
      filePath: 'src/routes/order.routes.ts',
      handlerSymbolId: 'sym-order-ctrl-class',
      handlerName: 'OrderController.getOrderById',
      startLine: 12,
      middleware: ['verifyJwt'],
    },
    {
      id: 'route-post-login',
      analysisId: 'analysis-fastify-001',
      method: 'POST',
      path: '/api/v1/auth/login',
      fileId: 'file-fastify-auth-routes',
      filePath: 'src/routes/auth.routes.ts',
      handlerSymbolId: 'sym-auth-routes',
      handlerName: 'AuthController.login',
      startLine: 8,
      middleware: [],
    },
    {
      id: 'route-get-health',
      analysisId: 'analysis-fastify-001',
      method: 'GET',
      path: '/health',
      fileId: 'file-fastify-app',
      filePath: 'src/server.ts',
      handlerSymbolId: 'sym-build-app',
      handlerName: 'healthCheck',
      startLine: 15,
      middleware: [],
    },
  ],
};

export const SEED_TECHNOLOGIES: Record<string, Technology[]> = {
  'analysis-fastify-001': [
    {
      id: 'tech-fastify',
      analysisId: 'analysis-fastify-001',
      name: 'Fastify',
      category: 'backend',
      confidence: 1.0,
      evidence: ['package.json: fastify@^4.26', 'src/server.ts:1: Fastify()'],
    },
    {
      id: 'tech-typescript',
      analysisId: 'analysis-fastify-001',
      name: 'TypeScript',
      category: 'backend',
      confidence: 1.0,
      evidence: ['tsconfig.json detected', 'Source files .ts format'],
    },
    {
      id: 'tech-prisma',
      analysisId: 'analysis-fastify-001',
      name: 'Prisma ORM',
      category: 'database',
      confidence: 0.95,
      evidence: ['prisma/schema.prisma detected', 'src/repositories/order.repository.ts: prisma.order.create'],
    },
    {
      id: 'tech-postgres',
      analysisId: 'analysis-fastify-001',
      name: 'PostgreSQL',
      category: 'database',
      confidence: 0.9,
      evidence: ['schema.prisma: datasource db = postgresql', 'docker-compose.yml: postgres:16'],
    },
    {
      id: 'tech-redis',
      analysisId: 'analysis-fastify-001',
      name: 'Redis / BullMQ',
      category: 'queue',
      confidence: 0.85,
      evidence: ['package.json: ioredis', 'src/services/order.service.ts: RedisQueue.publish'],
    },
    {
      id: 'tech-jwt',
      analysisId: 'analysis-fastify-001',
      name: 'JWT Auth',
      category: 'auth',
      confidence: 0.9,
      evidence: ['src/routes/auth.routes.ts: verifyJwt middleware'],
    },
  ],
};

export const SEED_GRAPH_NODES: Record<string, GraphNode[]> = {
  'analysis-fastify-001': [
    { id: 'node-app', type: 'module', name: 'Server Core (Fastify)', path: 'src/server.ts' },
    { id: 'node-auth-routes', type: 'route', name: 'Auth Routes', path: 'src/routes/auth.routes.ts' },
    { id: 'node-order-routes', type: 'route', name: 'Order Routes', path: 'src/routes/order.routes.ts' },
    { id: 'node-order-ctrl', type: 'symbol', name: 'OrderController', path: 'src/controllers/order.controller.ts' },
    { id: 'node-order-svc', type: 'symbol', name: 'OrderService', path: 'src/services/order.service.ts' },
    { id: 'node-payment-client', type: 'symbol', name: 'PaymentClient (Stripe API)', path: 'src/clients/payment.client.ts' },
    { id: 'node-order-repo', type: 'symbol', name: 'OrderRepository', path: 'src/repositories/order.repository.ts' },
    { id: 'node-orders-table', type: 'database_table', name: 'orders (PostgreSQL)', path: 'prisma/schema.prisma' },
    { id: 'node-redis-queue', type: 'queue', name: 'order-fulfillment (Redis Queue)' },
  ],
};

export const SEED_GRAPH_EDGES: Record<string, GraphEdge[]> = {
  'analysis-fastify-001': [
    { id: 'e1', analysisId: 'analysis-fastify-001', sourceId: 'node-app', targetId: 'node-auth-routes', type: 'IMPORTS', confidence: 'static' },
    { id: 'e2', analysisId: 'analysis-fastify-001', sourceId: 'node-app', targetId: 'node-order-routes', type: 'IMPORTS', confidence: 'static' },
    { id: 'e3', analysisId: 'analysis-fastify-001', sourceId: 'node-order-routes', targetId: 'node-order-ctrl', type: 'ROUTES_TO', confidence: 'static' },
    { id: 'e4', analysisId: 'analysis-fastify-001', sourceId: 'node-order-ctrl', targetId: 'node-order-svc', type: 'CALLS', confidence: 'static' },
    { id: 'e5', analysisId: 'analysis-fastify-001', sourceId: 'node-order-svc', targetId: 'node-payment-client', type: 'CALLS', confidence: 'inferred' },
    { id: 'e6', analysisId: 'analysis-fastify-001', sourceId: 'node-order-svc', targetId: 'node-order-repo', type: 'CALLS', confidence: 'static' },
    { id: 'e7', analysisId: 'analysis-fastify-001', sourceId: 'node-order-svc', targetId: 'node-redis-queue', type: 'WRITES', confidence: 'static' },
    { id: 'e8', analysisId: 'analysis-fastify-001', sourceId: 'node-order-repo', targetId: 'node-orders-table', type: 'WRITES', confidence: 'heuristic' },
  ],
};

export const SEED_TRACES: Record<string, RequestFlowTrace> = {
  'route-post-orders': {
    routeId: 'route-post-orders',
    method: 'POST',
    path: '/api/v1/orders',
    hops: [
      {
        id: 'hop-1',
        nodeId: 'node-order-routes',
        label: 'POST /api/v1/orders (Route Definition)',
        type: 'route',
        file: 'src/routes/order.routes.ts',
        line: 8,
        confidence: 'static',
        confidenceScore: 1.0,
        details: 'Route mounted with preHandler [verifyJwt]',
      },
      {
        id: 'hop-2',
        nodeId: 'node-order-ctrl',
        label: 'OrderController.createOrder',
        type: 'controller',
        file: 'src/controllers/order.controller.ts',
        line: 11,
        confidence: 'static',
        confidenceScore: 1.0,
        details: 'Parses request body and invokes OrderService.create',
      },
      {
        id: 'hop-3',
        nodeId: 'node-order-svc',
        label: 'OrderService.create',
        type: 'service',
        file: 'src/services/order.service.ts',
        line: 16,
        confidence: 'static',
        confidenceScore: 1.0,
        details: 'Calculates total amount, charges payment, saves order, dispatches queue job',
      },
      {
        id: 'hop-4',
        nodeId: 'node-payment-client',
        label: 'PaymentClient.charge (Stripe API)',
        type: 'client',
        file: 'src/clients/payment.client.ts',
        line: 24,
        confidence: 'inferred',
        confidenceScore: 0.6,
        details: 'External HTTP call to Stripe charge API endpoint',
      },
      {
        id: 'hop-5',
        nodeId: 'node-order-repo',
        label: 'OrderRepository.save',
        type: 'repository',
        file: 'src/repositories/order.repository.ts',
        line: 4,
        confidence: 'static',
        confidenceScore: 1.0,
        details: 'Prisma Client query: prisma.order.create({ data: {...} })',
      },
      {
        id: 'hop-6',
        nodeId: 'node-orders-table',
        label: 'orders Table (PostgreSQL)',
        type: 'database',
        file: 'prisma/schema.prisma',
        line: 12,
        confidence: 'heuristic',
        confidenceScore: 0.8,
        details: 'Persists order row and nested product items',
      },
    ],
  },
};
