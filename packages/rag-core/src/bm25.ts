import { CodeChunk } from '@gitlens/shared-types';

export function tokenizeCode(text: string): string[] {
  if (!text) return [];

  // Split on camelCase (e.g. createOrder -> create, order) and snake_case (e.g. order_service)
  const expanded = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_/.-]/g, ' ')
    .toLowerCase();

  return expanded
    .replace(/[^a-z0-9$\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

export class BM25Engine {
  private chunks: CodeChunk[] = [];
  private docTokens: string[][] = [];
  private docLengths: number[] = [];
  private avgDocLength: number = 0;
  private dfMap: Map<string, number> = new Map();
  private k1: number = 1.2;
  private b: number = 0.75;

  constructor(chunks: CodeChunk[]) {
    this.chunks = chunks;
    this.index();
  }

  private index() {
    this.docTokens = [];
    this.docLengths = [];
    this.dfMap.clear();

    let totalLength = 0;
    for (const chunk of this.chunks) {
      const tokens = tokenizeCode(chunk.content);
      this.docTokens.push(tokens);
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const uniqueTokens = new Set(tokens);
      for (const tok of uniqueTokens) {
        this.dfMap.set(tok, (this.dfMap.get(tok) || 0) + 1);
      }
    }

    this.avgDocLength = this.chunks.length > 0 ? totalLength / this.chunks.length : 0;
  }

  public score(query: string, topK: number = 20): Array<{ chunk: CodeChunk; score: number }> {
    const queryTokens = tokenizeCode(query);
    if (queryTokens.length === 0 || this.chunks.length === 0) return [];

    const N = this.chunks.length;
    const scores: Array<{ chunk: CodeChunk; score: number }> = [];

    for (let i = 0; i < N; i++) {
      const doc = this.docTokens[i];
      const docLen = this.docLengths[i];
      let docScore = 0;

      // Count term frequencies in this document
      const tfMap = new Map<string, number>();
      for (const tok of doc) {
        tfMap.set(tok, (tfMap.get(tok) || 0) + 1);
      }

      for (const qTok of queryTokens) {
        const tf = tfMap.get(qTok) || 0;
        if (tf === 0) continue;

        const df = this.dfMap.get(qTok) || 1;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));

        const numerator = tf * (this.k1 + 1);
        const denominator = tf + this.k1 * (1 - this.b + this.b * (docLen / (this.avgDocLength || 1)));

        docScore += idf * (numerator / denominator);
      }

      if (docScore > 0) {
        scores.push({ chunk: this.chunks[i], score: docScore });
      }
    }

    scores.sort((a, b) => b.score - a.score);
    return scores.slice(0, topK);
  }
}
