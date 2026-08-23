import { CodeChunk, Citation } from '@gitlens/shared-types';
import { BM25Engine } from './bm25';
import { generateDenseEmbedding, cosineSimilarity } from './embedder';

export interface ChunkWithEmbedding {
  chunk: CodeChunk;
  embedding: number[];
  importanceScore?: number;
  isRouteHandler?: boolean;
}

export interface HybridSearchResult {
  chunk: CodeChunk;
  rrfScore: number;
  finalScore: number;
  denseRank?: number;
  lexicalRank?: number;
  citation: Citation;
}

export class HybridRetriever {
  private indexedChunks: ChunkWithEmbedding[] = [];
  private bm25: BM25Engine;

  constructor(chunks: CodeChunk[], embeddings?: number[][]) {
    this.indexedChunks = chunks.map((c, i) => ({
      chunk: c,
      embedding: embeddings && embeddings[i] ? embeddings[i] : generateDenseEmbedding(c.content),
    }));
    this.bm25 = new BM25Engine(chunks);
  }

  public setGraphContext(importanceScores: Map<string, number>, routeSymbols: Set<string>) {
    for (const item of this.indexedChunks) {
      if (item.chunk.symbolName) {
        item.importanceScore = importanceScores.get(item.chunk.fileId) || 1.0;
        item.isRouteHandler = routeSymbols.has(item.chunk.symbolName);
      }
    }
  }

  public search(query: string, topK: number = 5): HybridSearchResult[] {
    const k = 60; // Standard RRF constant

    // 1. Lexical BM25 Search
    const lexicalResults = this.bm25.score(query, 30);
    const lexicalRanks = new Map<string, number>();
    lexicalResults.forEach((res, rank) => {
      lexicalRanks.set(res.chunk.id, rank + 1);
    });

    // 2. Dense Semantic Search
    const queryEmbedding = generateDenseEmbedding(query);
    const denseScores: Array<{ chunk: CodeChunk; score: number }> = [];

    for (const item of this.indexedChunks) {
      const sim = cosineSimilarity(queryEmbedding, item.embedding);
      if (sim > 0.05) {
        denseScores.push({ chunk: item.chunk, score: sim });
      }
    }
    denseScores.sort((a, b) => b.score - a.score);

    const denseRanks = new Map<string, number>();
    denseScores.slice(0, 30).forEach((res, rank) => {
      denseRanks.set(res.chunk.id, rank + 1);
    });

    // 3. Reciprocal Rank Fusion (RRF)
    const chunkMap = new Map<string, ChunkWithEmbedding>();
    this.indexedChunks.forEach((c) => chunkMap.set(c.chunk.id, c));

    const candidateIds = new Set<string>([...lexicalRanks.keys(), ...denseRanks.keys()]);
    const fusedResults: HybridSearchResult[] = [];

    for (const id of candidateIds) {
      const item = chunkMap.get(id);
      if (!item) continue;

      const dRank = denseRanks.get(id);
      const lRank = lexicalRanks.get(id);

      const denseRrf = dRank ? 1.0 / (k + dRank) : 0;
      const lexicalRrf = lRank ? 1.0 / (k + lRank) : 0;
      const rrfScore = denseRrf + lexicalRrf;

      // 4. Structural Graph Re-Ranking Boost
      const importanceBoost = item.importanceScore ? Math.min(1.0, item.importanceScore / 30.0) * 0.3 : 0;
      const routeBoost = item.isRouteHandler ? 0.5 : 0;
      const finalScore = rrfScore * (1.0 + importanceBoost + routeBoost);

      fusedResults.push({
        chunk: item.chunk,
        rrfScore,
        finalScore,
        denseRank: dRank,
        lexicalRank: lRank,
        citation: {
          file: item.chunk.filePath,
          startLine: item.chunk.startLine,
          endLine: item.chunk.endLine,
          symbol: item.chunk.symbolName || undefined,
          reason: `Hybrid RRF Match (Score: ${(finalScore * 100).toFixed(2)})`,
        },
      });
    }

    fusedResults.sort((a, b) => b.finalScore - a.finalScore);
    return fusedResults.slice(0, topK);
  }
}
