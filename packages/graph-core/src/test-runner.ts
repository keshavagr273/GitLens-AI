import { findStronglyConnectedComponents } from './tarjan-scc';
import { computePageRank, computeCompositeImportance } from './pagerank';
import { buildCodeGraph } from './builder';
import { traceRequestFlow } from './request-flow-tracer';
import { ApiRoute, SymbolNode } from '@gitlens/shared-types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Starting Phase 2 & 4 Graph-Core Quality Test Suite...\n');

// 1. Tarjan SCC Cycle Detection Tests (CP-2.4)
console.log('--- CP-2.4: Tarjan SCC Cycle Detection ---');

const cyclicAdj = new Map<string, string[]>([
  ['src/A.ts', ['src/B.ts']],
  ['src/B.ts', ['src/C.ts']],
  ['src/C.ts', ['src/A.ts']],
  ['src/D.ts', ['src/E.ts']],
  ['src/E.ts', []],
]);

const sccCyclic = findStronglyConnectedComponents(cyclicAdj);
assert(sccCyclic.hasCycles, 'Tarjan SCC detected circular dependency cycle');
assert(sccCyclic.cycles.length === 1, 'Isolated exactly 1 cycle component');
assert(sccCyclic.cycles[0].length === 3, 'Cycle component contains all 3 cyclic nodes (A, B, C)');

const acyclicAdj = new Map<string, string[]>([
  ['src/A.ts', ['src/B.ts']],
  ['src/B.ts', ['src/C.ts']],
  ['src/C.ts', []],
]);

const sccAcyclic = findStronglyConnectedComponents(acyclicAdj);
assert(!sccAcyclic.hasCycles, 'Correctly reported no cycles for pure DAG');
assert(sccAcyclic.cycles.length === 0, 'Zero cycle components for DAG');

// 2. PageRank Centrality Ranking (CP-2.4)
console.log('\n--- CP-2.4: PageRank Centrality Ranking ---');

const nodes = ['src/server.ts', 'src/services/order.ts', 'src/db/connection.ts'];
const graphAdj = new Map<string, string[]>([
  ['src/server.ts', ['src/services/order.ts', 'src/db/connection.ts']],
  ['src/services/order.ts', ['src/db/connection.ts']],
  ['src/db/connection.ts', []],
]);

const prScores = computePageRank(nodes, graphAdj);
const dbScore = prScores.get('src/db/connection.ts') || 0;
const serverScore = prScores.get('src/server.ts') || 0;

assert(dbScore > serverScore, `Most-imported dependency (db) has higher PageRank (${dbScore.toFixed(3)}) than leaf server (${serverScore.toFixed(3)})`);

const compImportance = computeCompositeImportance(2, 1, 3, dbScore);
assert(compImportance > 0, `Computed composite importance score: ${compImportance}`);

// 3. Request-Flow Traversal Tests (CP-4.2)
console.log('\n--- CP-4.2: Constrained Request-Flow Traversal Engine ---');

const testRoute: ApiRoute = {
  id: 'route-post-orders',
  analysisId: 'analysis-123',
  method: 'POST',
  path: '/api/v1/orders',
  fileId: 'src/routes/order.routes.ts',
  filePath: 'src/routes/order.routes.ts',
  handlerName: 'create',
  startLine: 12,
  middleware: ['authenticateJwt'],
};

const testSymbols: SymbolNode[] = [
  {
    id: 'sym-mw-auth',
    fileId: 'src/middleware/auth.ts',
    name: 'authenticateJwt',
    kind: 'function',
    startLine: 5,
    endLine: 18,
    startColumn: 1,
    endColumn: 30,
    metrics: { cyclomaticComplexity: 2, loc: 14, parameterCount: 3 },
  },
  {
    id: 'sym-ctrl-create',
    fileId: 'src/controllers/order.controller.ts',
    name: 'create',
    kind: 'method',
    startLine: 20,
    endLine: 45,
    startColumn: 3,
    endColumn: 50,
    metrics: { cyclomaticComplexity: 3, loc: 26, parameterCount: 2 },
  },
  {
    id: 'sym-svc-class',
    fileId: 'src/services/order.service.ts',
    name: 'OrderService',
    kind: 'class',
    startLine: 10,
    endLine: 90,
    startColumn: 1,
    endColumn: 25,
    metrics: { cyclomaticComplexity: 5, loc: 81, parameterCount: 0 },
  },
  {
    id: 'sym-repo-class',
    fileId: 'src/db/order.repo.ts',
    name: 'OrderRepository',
    kind: 'class',
    startLine: 5,
    endLine: 60,
    startColumn: 1,
    endColumn: 28,
    metrics: { cyclomaticComplexity: 2, loc: 56, parameterCount: 0 },
  },
];

const trace = traceRequestFlow({
  route: testRoute,
  symbols: testSymbols,
});

assert(trace.hops.length >= 5, `Request flow tracer generated ${trace.hops.length} execution hops (>= 5 expected)`);
assert(trace.hops[0].label === 'POST /api/v1/orders', 'Hop 1 is HTTP route entry point');
assert(trace.hops[1].label.includes('authenticateJwt'), 'Hop 2 is Middleware invocation');
assert(trace.hops[2].label.includes('Controller'), 'Hop 3 is Controller handler execution');
assert(trace.hops[3].label.includes('Service'), 'Hop 4 is Service domain execution');
assert(trace.hops[trace.hops.length - 1].label.includes('Database'), 'Final hop is Database persistence');

// Verify confidence scores
assert(trace.hops[0].confidence === 'static' && trace.hops[0].confidenceScore === 1.0, 'Static hop has confidence 1.0');

console.log('\n🎉 ALL PHASE 2 & 4 GRAPH-CORE TESTS PASSED CLEANLY!\n');
