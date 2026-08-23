export interface PageRankOptions {
  dampingFactor?: number;
  maxIterations?: number;
  tolerance?: number;
}

export function computePageRank(
  nodes: string[],
  outgoingEdges: Map<string, string[]>,
  options: PageRankOptions = {}
): Map<string, number> {
  const alpha = options.dampingFactor ?? 0.85;
  const maxIter = options.maxIterations ?? 100;
  const tol = options.tolerance ?? 1e-6;

  const N = nodes.length;
  if (N === 0) return new Map();

  let scores = new Map<string, number>();
  const initialScore = 1 / N;
  for (const node of nodes) {
    scores.set(node, initialScore);
  }

  // Precompute in-degrees and inbound neighbors
  const inboundNeighbors = new Map<string, string[]>();
  for (const node of nodes) {
    inboundNeighbors.set(node, []);
  }
  for (const [source, targets] of outgoingEdges.entries()) {
    for (const target of targets) {
      if (inboundNeighbors.has(target)) {
        inboundNeighbors.get(target)!.push(source);
      }
    }
  }

  for (let iter = 0; iter < maxIter; iter++) {
    const nextScores = new Map<string, number>();
    let diff = 0;

    // Distribute dangling nodes (nodes with 0 outgoing edges)
    let danglingSum = 0;
    for (const node of nodes) {
      const outCount = (outgoingEdges.get(node) || []).length;
      if (outCount === 0) {
        danglingSum += scores.get(node)!;
      }
    }

    const baseScore = (1 - alpha) / N + (alpha * danglingSum) / N;

    for (const node of nodes) {
      let inboundSum = 0;
      const inbounds = inboundNeighbors.get(node) || [];

      for (const inNode of inbounds) {
        const outDegree = (outgoingEdges.get(inNode) || []).length;
        if (outDegree > 0) {
          inboundSum += scores.get(inNode)! / outDegree;
        }
      }

      const newScore = baseScore + alpha * inboundSum;
      nextScores.set(node, newScore);
      diff += Math.abs(newScore - scores.get(node)!);
    }

    scores = nextScores;
    if (diff < tol) {
      break;
    }
  }

  return scores;
}

export function computeCompositeImportance(
  inDegree: number,
  routeRefs: number,
  exportCount: number,
  pageRankScore: number
): number {
  const rawScore = 2 * inDegree + 5 * routeRefs + exportCount + 30 * pageRankScore;
  return Number(rawScore.toFixed(2));
}
