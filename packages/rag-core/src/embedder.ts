import { config } from '@gitlens/config';

export const EMBEDDING_DIMENSION = config.EMBEDDING_DIMENSION || 384;

export function generateDenseEmbedding(text: string): number[] {
  const vector = new Array<number>(EMBEDDING_DIMENSION).fill(0);
  if (!text) return vector;

  // Split on camelCase (createOrder -> create, order) and snake_case (order_repo -> order, repo)
  const expanded = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_/.-]/g, ' ')
    .toLowerCase();

  const words = expanded
    .replace(/[^a-z0-9$\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);

  if (words.length === 0) return vector;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Hash whole word
    let hash = 0;
    for (let j = 0; j < word.length; j++) {
      hash = (hash << 5) - hash + word.charCodeAt(j);
      hash |= 0;
    }

    const idx = Math.abs(hash) % EMBEDDING_DIMENSION;
    vector[idx] += 1.0;

    // Hash character trigrams for subword robustness
    if (word.length >= 3) {
      for (let g = 0; g <= word.length - 3; g++) {
        const tri = word.slice(g, g + 3);
        let triHash = 0;
        for (let j = 0; j < tri.length; j++) {
          triHash = (triHash << 5) - triHash + tri.charCodeAt(j);
          triHash |= 0;
        }
        const triIdx = Math.abs(triHash) % EMBEDDING_DIMENSION;
        vector[triIdx] += 0.3;
      }
    }
  }

  // L2-Normalize vector
  let norm = 0;
  for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
    norm += vector[i] * vector[i];
  }
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}
