import { findStronglyConnectedComponents } from './tarjan-scc';
import { computePageRank, computeCompositeImportance } from './pagerank';
import { buildCodeGraph } from './builder';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Starting Phase 2 Graph-Core Quality Test Suite...\n');

// 1. Tarjan SCC Cycle Detection Tests (CP-2.4)
console.log('--- CP-2.4: Tarjan SCC Cycle Detection ---');

// Circular fixture: A -> B -> C -> A, and independent D -> E
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

// Acyclic fixture: DAG A -> B -> C
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

// 3. Full Graph Builder Integration Test
console.log('\n--- CP-2.4: Full Graph Builder Integration ---');

const built = buildCodeGraph({
  repositoryId: 'test-repo',
  analysisId: 'test-analysis',
  files: [
    { id: 'f1', path: 'src/A.ts', language: 'typescript' },
    { id: 'f2', path: 'src/B.ts', language: 'typescript' },
    { id: 'f3', path: 'src/C.ts', language: 'typescript' },
  ],
  imports: [
    { sourcePath: 'src/A.ts', targetPath: 'src/B.ts', isExternal: false },
    { sourcePath: 'src/B.ts', targetPath: 'src/C.ts', isExternal: false },
    { sourcePath: 'src/C.ts', targetPath: 'src/A.ts', isExternal: false },
    { sourcePath: 'src/A.ts', targetPath: 'external:express', isExternal: true },
  ],
  calls: [],
});

assert(built.nodes.length >= 4, `Graph built with ${built.nodes.length} nodes (including external package)`);
assert(built.edges.length === 4, `Graph built with ${built.edges.length} edges`);
assert(built.cycles.length === 1, 'Graph builder annotated circular dependency cycle');

console.log('\n🎉 ALL PHASE 2 GRAPH-CORE TESTS PASSED CLEANLY!\n');
