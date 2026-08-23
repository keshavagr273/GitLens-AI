import {
  ApiRoute,
  RequestFlowHop,
  RequestFlowTrace,
  SymbolNode,
  GraphEdge,
  ConfidenceLevel,
} from '@gitlens/shared-types';
import { generateUuid } from '@gitlens/utils';

export interface TraceContext {
  route: ApiRoute;
  symbols: SymbolNode[];
  edges?: GraphEdge[];
  fileContents?: Map<string, string>;
}

export function traceRequestFlow(context: TraceContext): RequestFlowTrace {
  const { route, symbols, edges = [], fileContents = new Map() } = context;
  const hops: RequestFlowHop[] = [];
  const visited = new Set<string>();

  // 1. Hop: Route Entry Point
  const entryHopId = `hop-entry-${generateUuid().slice(0, 6)}`;
  hops.push({
    id: entryHopId,
    nodeId: `node-route-${route.id}`,
    label: `${route.method} ${route.path}`,
    type: 'route',
    file: route.filePath || 'src/routes/index.ts',
    line: route.startLine,
    confidence: 'static',
    confidenceScore: 1.0,
    details: `HTTP route handler defined in ${route.filePath || 'routes'} with method ${route.method}.`,
  });
  visited.add(`entry:${route.path}`);

  // 2. Hop: Middleware (if any defined)
  if (route.middleware && route.middleware.length > 0) {
    for (const mw of route.middleware) {
      const mwSymbol = symbols.find((s) => s.name === mw);
      const hopId = `hop-mw-${generateUuid().slice(0, 6)}`;
      hops.push({
        id: hopId,
        nodeId: `node-mw-${mw}`,
        label: `Middleware: ${mw}()`,
        type: 'controller',
        file: mwSymbol ? mwSymbol.fileId : 'src/middleware/index.ts',
        line: mwSymbol ? mwSymbol.startLine : 1,
        confidence: 'static',
        confidenceScore: 0.95,
        details: `Intercepts request for validation and authentication pipeline (${mw}).`,
      });
      visited.add(`mw:${mw}`);
    }
  }

  // 3. Hop: Controller Handler
  let controllerSymbol: SymbolNode | undefined;
  if (route.handlerName) {
    const handler = route.handlerName;
    controllerSymbol = symbols.find(
      (s) =>
        s.name === handler ||
        (s.name === 'create' && handler.includes('create')) ||
        (s.name === 'handle' && handler.includes('handle'))
    );
  }

  if (controllerSymbol) {
    const hopId = `hop-ctrl-${generateUuid().slice(0, 6)}`;
    hops.push({
      id: hopId,
      nodeId: `node-ctrl-${controllerSymbol.name}`,
      label: `Controller: ${controllerSymbol.name}()`,
      type: 'controller',
      file: controllerSymbol.fileId,
      line: controllerSymbol.startLine,
      confidence: 'static',
      confidenceScore: 0.92,
      details: `Executes HTTP controller request validation and parameter unmarshalling.`,
    });
    visited.add(`ctrl:${controllerSymbol.name}`);
  }

  // 4. Hop: Service Layer Invocation
  const targetEntity = route.path.split('/')[2] || route.path.split('/')[1] || 'entity';
  const cleanEntity = targetEntity.replace(/[^a-zA-Z0-9]/g, '');

  const serviceSymbol = symbols.find(
    (s) =>
      s.kind === 'class' &&
      (s.name.toLowerCase().includes(cleanEntity.toLowerCase()) ||
        s.name.toLowerCase().includes('service'))
  );

  const serviceMethod = symbols.find(
    (s) =>
      s.parentId === serviceSymbol?.id ||
      (s.kind === 'method' && s.name.toLowerCase().includes('create')) ||
      (s.kind === 'function' && s.name.toLowerCase().includes('create'))
  );

  if (serviceSymbol || serviceMethod) {
    const sym = serviceMethod || serviceSymbol!;
    const hopId = `hop-svc-${generateUuid().slice(0, 6)}`;
    hops.push({
      id: hopId,
      nodeId: `node-svc-${sym.name}`,
      label: `Service: ${sym.name}()`,
      type: 'service',
      file: sym.fileId,
      line: sym.startLine,
      confidence: 'static',
      confidenceScore: 0.88,
      details: `Executes core business domain logic, validation invariants, and transaction management.`,
    });
    visited.add(`svc:${sym.name}`);
  }

  // 5. Hop: Repository / Data Access Layer
  const repoSymbol = symbols.find(
    (s) =>
      (s.name.toLowerCase().includes(cleanEntity.toLowerCase()) &&
        s.name.toLowerCase().includes('repo')) ||
      s.name.toLowerCase().includes('repository') ||
      s.name.toLowerCase().includes('db')
  );

  if (repoSymbol) {
    const hopId = `hop-repo-${generateUuid().slice(0, 6)}`;
    hops.push({
      id: hopId,
      nodeId: `node-repo-${repoSymbol.name}`,
      label: `Repository: ${repoSymbol.name}`,
      type: 'repository',
      file: repoSymbol.fileId,
      line: repoSymbol.startLine,
      confidence: 'inferred',
      confidenceScore: 0.82,
      details: `Executes SQL query or ORM entity persistence for ${cleanEntity}.`,
    });
    visited.add(`repo:${repoSymbol.name}`);
  }

  // 6. Hop: Database Table / Persistence Layer
  const hopDbId = `hop-db-${generateUuid().slice(0, 6)}`;
  hops.push({
    id: hopDbId,
    nodeId: `node-db-${cleanEntity || 'records'}`,
    label: `Database: ${cleanEntity || 'records'} table`,
    type: 'database',
    file: 'prisma/schema.prisma',
    line: 1,
    confidence: 'heuristic',
    confidenceScore: 0.78,
    details: `Performs persistent storage transaction (INSERT/SELECT) against relational PostgreSQL table.`,
  });

  return {
    routeId: route.id,
    method: route.method,
    path: route.path,
    hops,
  };
}
