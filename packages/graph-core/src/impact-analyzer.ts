import { GraphNode, GraphEdge, ApiRoute } from '@gitlens/shared-types';

export interface ImpactAnalysisResult {
  modifiedFiles: string[];
  affectedNodeIds: string[];
  affectedNodes: GraphNode[];
  affectedRoutes: ApiRoute[];
  blastRadiusScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export function analyzeChangeImpact(
  modifiedFiles: string[],
  nodes: GraphNode[],
  edges: GraphEdge[],
  routes: ApiRoute[] = []
): ImpactAnalysisResult {
  // Find seed nodes matching modified files
  const seedNodeIds = new Set<string>();
  for (const node of nodes) {
    if (modifiedFiles.some((f) => node.id === f || node.name === f || node.path?.includes(f))) {
      seedNodeIds.add(node.id);
    }
  }

  // Reverse adjacency graph: target -> sources (who depends on target)
  const reverseAdj = new Map<string, string[]>();
  for (const edge of edges) {
    const list = reverseAdj.get(edge.targetId) || [];
    list.push(edge.sourceId);
    reverseAdj.set(edge.targetId, list);
  }

  // BFS reverse traversal
  const visited = new Set<string>(seedNodeIds);
  const queue = Array.from(seedNodeIds);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const callers = reverseAdj.get(current) || [];
    for (const caller of callers) {
      if (!visited.has(caller)) {
        visited.add(caller);
        queue.push(caller);
      }
    }
  }

  const affectedNodes = nodes.filter((n) => visited.has(n.id));

  // Find affected API routes
  const affectedRoutes = routes.filter((r) =>
    affectedNodes.some(
      (n) =>
        (r.fileId && n.id === r.fileId) ||
        (r.handlerName && n.name.includes(r.handlerName)) ||
        (r.filePath && n.path && n.path.includes(r.filePath))
    )
  );

  const totalNodes = Math.max(1, nodes.length);
  const blastRadiusScore = Number((affectedNodes.length / totalNodes).toFixed(3));

  let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
  if (blastRadiusScore > 0.4 || affectedRoutes.length > 5) riskLevel = 'CRITICAL';
  else if (blastRadiusScore > 0.2 || affectedRoutes.length > 2) riskLevel = 'HIGH';
  else if (blastRadiusScore > 0.05 || affectedRoutes.length > 0) riskLevel = 'MEDIUM';

  return {
    modifiedFiles,
    affectedNodeIds: Array.from(visited),
    affectedNodes,
    affectedRoutes,
    blastRadiusScore,
    riskLevel,
  };
}
