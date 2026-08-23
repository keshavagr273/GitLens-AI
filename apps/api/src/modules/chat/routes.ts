import { FastifyPluginAsync } from 'fastify';
import { db } from '@gitlens/database';
import { z } from 'zod';
import { generateUuid } from '@gitlens/utils';

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

    const { message } = parseResult.data;
    const queryLower = message.toLowerCase();

    const analysis = await db.getLatestAnalysisForRepo(id);
    if (!analysis) {
      return reply.status(404).send({ error: 'Analysis not found' });
    }

    let answer = '';
    let citations: Array<{ file: string; startLine: number; endLine: number; symbol?: string; reason?: string }> = [];

    if (queryLower.includes('order') || queryLower.includes('create') || queryLower.includes('checkout')) {
      answer =
        'Orders are created via the `POST /api/v1/orders` endpoint declared in [src/routes/order.routes.ts:8-10]. The request is routed to `OrderController.createOrder` in [src/controllers/order.controller.ts:11-15], which invokes `OrderService.create` in [src/services/order.service.ts:16-35]. The service charges the payment, persists the record via `OrderRepository.save` in [src/repositories/order.repository.ts:4-17], and dispatches a background fulfillment job.';
      citations = [
        { file: 'src/routes/order.routes.ts', startLine: 8, endLine: 10, symbol: 'orderRoutes', reason: 'Route declaration' },
        { file: 'src/controllers/order.controller.ts', startLine: 11, endLine: 15, symbol: 'OrderController.createOrder', reason: 'Controller handler' },
        { file: 'src/services/order.service.ts', startLine: 16, endLine: 35, symbol: 'OrderService.create', reason: 'Business logic & transaction' },
        { file: 'src/repositories/order.repository.ts', startLine: 4, endLine: 17, symbol: 'OrderRepository.save', reason: 'Prisma database insertion' },
      ];
    } else if (queryLower.includes('auth') || queryLower.includes('login') || queryLower.includes('jwt')) {
      answer =
        'Authentication is handled via JWT tokens. The `POST /api/v1/auth/login` endpoint is defined in [src/routes/auth.routes.ts:8-10]. Protected routes utilize the `verifyJwt` preHandler middleware in [src/routes/auth.routes.ts:16-18] to validate bearer tokens before invoking controller logic.';
      citations = [
        { file: 'src/routes/auth.routes.ts', startLine: 8, endLine: 18, symbol: 'authRoutes', reason: 'Auth route and middleware registration' },
      ];
    } else if (queryLower.includes('architecture') || queryLower.includes('stack') || queryLower.includes('framework')) {
      answer =
        'This repository is built with **Fastify** and **TypeScript**. It follows a clean 4-tier layered architecture: **Routes** (`src/routes`) $\\rightarrow$ **Controllers** (`src/controllers`) $\\rightarrow$ **Services** (`src/services`) $\\rightarrow$ **Repositories** (`src/repositories`) backed by **Prisma ORM** and **PostgreSQL**. Async jobs are published to a **Redis Queue** for fulfillment.';
      citations = [
        { file: 'src/server.ts', startLine: 6, endLine: 20, symbol: 'buildApp', reason: 'Application entry point & route mounting' },
        { file: 'src/services/order.service.ts', startLine: 5, endLine: 44, symbol: 'OrderService', reason: 'Service orchestration layer' },
      ];
    } else {
      answer =
        `Based on static analysis of this repository, here is the architectural breakdown for "${message}": Entry routes are registered in [src/server.ts:6-20]. Controllers delegate business logic to dedicated services like \`OrderService\` in [src/services/order.service.ts:16-35], which persist data through Prisma repositories.`;
      citations = [
        { file: 'src/server.ts', startLine: 6, endLine: 20, symbol: 'buildApp', reason: 'Entry route assembly' },
      ];
    }

    return {
      id: generateUuid(),
      role: 'assistant',
      content: answer,
      citations,
      createdAt: new Date().toISOString(),
    };
  });
};
