import { chunkSourceFile } from './chunker';
import { generateDenseEmbedding, cosineSimilarity, EMBEDDING_DIMENSION } from './embedder';
import { BM25Engine } from './bm25';
import { HybridRetriever } from './hybrid-retriever';
import { SourceFile, SymbolNode, CodeChunk } from '@gitlens/shared-types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Starting Phase 5 RAG-Core Quality Test Suite...\n');

// 1. AST-Aligned Hierarchical Code Chunking (CP-5.1)
console.log('--- CP-5.1: AST-Aligned Hierarchical Code Chunking ---');

const mockFile: SourceFile = {
  id: 'file-order-service',
  analysisId: 'analysis-123',
  path: 'src/services/order.service.ts',
  language: 'typescript',
  content: `
import { OrderRepository } from '../db/order.repo';

export class OrderService {
  private repo: OrderRepository;

  constructor() {
    this.repo = new OrderRepository();
  }

  async createOrder(userId: string, items: any[]): Promise<Order> {
    if (!items || items.length === 0) throw new Error("Empty items");
    const total = items.reduce((acc, i) => acc + i.price, 0);
    return this.repo.insert({ userId, items, total, status: 'PENDING' });
  }

  async getOrderById(orderId: string): Promise<Order | null> {
    return this.repo.findById(orderId);
  }
}
`,
  sizeBytes: 600,
  contentHash: 'hash-123',
  isGenerated: false,
  importanceScore: 10.0,
  createdAt: new Date().toISOString(),
};

const mockSymbols: SymbolNode[] = [
  {
    id: 'sym-class-order-svc',
    fileId: 'file-order-service',
    name: 'OrderService',
    kind: 'class',
    startLine: 4,
    endLine: 19,
    startColumn: 1,
    endColumn: 25,
    metrics: { cyclomaticComplexity: 4, loc: 16, parameterCount: 0 },
  },
  {
    id: 'sym-method-create-order',
    fileId: 'file-order-service',
    name: 'createOrder',
    kind: 'method',
    parentId: 'sym-class-order-svc',
    startLine: 10,
    endLine: 14,
    startColumn: 3,
    endColumn: 67,
    metrics: { cyclomaticComplexity: 3, loc: 5, parameterCount: 2 },
  },
  {
    id: 'sym-method-get-order',
    fileId: 'file-order-service',
    name: 'getOrderById',
    kind: 'method',
    parentId: 'sym-class-order-svc',
    startLine: 16,
    endLine: 18,
    startColumn: 3,
    endColumn: 62,
    metrics: { cyclomaticComplexity: 1, loc: 3, parameterCount: 1 },
  },
];

const chunks = chunkSourceFile(mockFile, mockSymbols);
assert(chunks.length === 3, `Generated ${chunks.length} AST-aligned chunks (3 expected)`);
assert(chunks[1].symbolName === 'createOrder', 'Chunk 1 matches createOrder method');
assert(chunks[1].content.includes('// File: src/services/order.service.ts | Symbol: createOrder'), 'Chunk prepended structured context header');
assert(chunks[1].contentHash.length === 64, 'Computed valid SHA-256 contentHash for chunk');

// 2. Dense Vector Embedding & Cosine Similarity
console.log('\n--- CP-5.1: Dense Vector Embeddings ---');

const vecA = generateDenseEmbedding('async createOrder(userId: string, items: any[])');
const vecB = generateDenseEmbedding('order creation transaction process');
const vecC = generateDenseEmbedding('database configuration ssl connection pool');

assert(vecA.length === EMBEDDING_DIMENSION, `Generated ${EMBEDDING_DIMENSION}-dimensional dense vector`);
const simAB = cosineSimilarity(vecA, vecB);
const simAC = cosineSimilarity(vecA, vecC);

assert(simAB > simAC, `Semantic similarity higher for related query (${simAB.toFixed(3)}) than unrelated (${simAC.toFixed(3)})`);

// 3. BM25 Lexical Keyword Ranking
console.log('\n--- CP-5.2: BM25 Lexical Search ---');

const bm25 = new BM25Engine(chunks);
const bm25Results = bm25.score('createOrder items total price');

assert(bm25Results.length > 0, 'BM25 returned keyword matches');
assert(bm25Results[0].chunk.symbolName === 'createOrder', `BM25 top match is createOrder (score: ${bm25Results[0].score.toFixed(2)})`);

// 4. Hybrid RRF Retrieval & Structural Graph Boost Benchmark (CP-5.2)
console.log('\n--- CP-5.2: Hybrid RRF Retrieval & Hit@5 Benchmark ---');

const retriever = new HybridRetriever(chunks);
const importanceScores = new Map<string, number>([['file-order-service', 25.0]]);
const routeSymbols = new Set<string>(['createOrder']);
retriever.setGraphContext(importanceScores, routeSymbols);

const searchResults = retriever.search('How are orders created in the service layer?', 5);

assert(searchResults.length > 0, 'Hybrid retriever returned search results');
assert(searchResults[0].chunk.symbolName === 'createOrder', `Hit@1 result is createOrder method (RRF Score: ${searchResults[0].finalScore.toFixed(4)})`);
assert(!!searchResults[0].citation.file, 'Citation contains source file reference');
assert(searchResults[0].citation.startLine === 10, 'Citation points to exact start line');

console.log('\n🎉 ALL PHASE 5 RAG-CORE TESTS & BENCHMARKS PASSED CLEANLY!\n');
