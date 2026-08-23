import { GraphNode, GraphEdge, ConfidenceLevel, EdgeType } from '@gitlens/shared-types';
import { generateUuid } from '@gitlens/utils';
import { findStronglyConnectedComponents } from './tarjan-scc';
import { computePageRank, computeCompositeImportance } from './pagerank';

export interface RawGraphInput {
  repositoryId: string;
  analysisId: string;
  files: Array<{ id: string; path: string; language: string }>;
  imports: Array<{ sourcePath: string; targetPath: string; isExternal: boolean }>;
  calls: Array<{ sourcePath: string; targetSymbol: string; confidence: ConfidenceLevel }>;
}

export interface BuiltGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  cycles: string[][];
  importanceMap: Map<string, number>;
}

export function buildCodeGraph(input: RawGraphInput): BuiltGraph {
  const { repositoryId, analysisId, files, imports, calls } = input;

  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  // 1. Create file & module nodes
  for (const f of files) {
    const isModule = f.path.includes('server.') || f.path.includes('index.') || f.path.includes('app.');
    const node: GraphNode = {
      id: f.id || `file-${f.path}`,
      type: isModule ? 'module' : 'file',
      name: f.path.split('/').pop() || f.path,
      path: f.path,
      metadata: { language: f.language },
    };
    nodes.push(node);
    nodeMap.set(f.path, node);
  }

  // 2. Build adjacency list for import graph
  const adjacencyList = new Map<string, string[]>();
  for (const f of files) {
    adjacencyList.set(f.path, []);
  }

  for (const imp of imports) {
    if (!imp.isExternal && nodeMap.has(imp.targetPath)) {
      const sourceList = adjacencyList.get(imp.sourcePath) || [];
      if (!sourceList.includes(imp.targetPath)) {
        sourceList.push(imp.targetPath);
        adjacencyList.set(imp.sourcePath, sourceList);
      }

      const sourceNode = nodeMap.get(imp.sourcePath)!;
      const targetNode = nodeMap.get(imp.targetPath)!;

      edges.push({
        id: `edge-imp-${generateUuid().slice(0, 6)}`,
        analysisId,
        sourceId: sourceNode.id,
        targetId: targetNode.id,
        type: 'IMPORTS',
        confidence: 'static',
      });
    } else if (imp.isExternal) {
      // External package node
      const extId = `ext-${imp.targetPath.replace('external:', '')}`;
      if (!nodeMap.has(extId)) {
        const extNode: GraphNode = {
          id: extId,
          type: 'module',
          name: imp.targetPath.replace('external:', ''),
          metadata: { isExternal: true },
        };
        nodes.push(extNode);
        nodeMap.set(extId, extNode);
      }
      const sourceNode = nodeMap.get(imp.sourcePath);
      if (sourceNode) {
        edges.push({
          id: `edge-ext-${generateUuid().slice(0, 6)}`,
          analysisId,
          sourceId: sourceNode.id,
          targetId: extId,
          type: 'IMPORTS',
          confidence: 'static',
        });
      }
    }
  }

  // 3. Tarjan SCC cycle detection
  const sccResult = findStronglyConnectedComponents(adjacencyList);

  // 4. PageRank calculation
  const allFilePaths = files.map((f) => f.path);
  const pageRankScores = computePageRank(allFilePaths, adjacencyList);

  // 5. Calculate composite importance scores and tag nodes
  const inDegreeMap = new Map<string, number>();
  for (const edge of edges) {
    inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
  }

  const importanceMap = new Map<string, number>();
  for (const node of nodes) {
    const inDeg = inDegreeMap.get(node.id) || 0;
    const pr = node.path ? pageRankScores.get(node.path) || 0.1 : 0.05;
    const importance = computeCompositeImportance(inDeg, 0, 1, pr);
    importanceMap.set(node.id, importance);
    node.metadata = {
      ...node.metadata,
      importanceScore: importance,
      inCycle: sccResult.cycles.some((c) => node.path && c.includes(node.path)),
    };
  }

  return {
    nodes,
    edges,
    cycles: sccResult.cycles,
    importanceMap,
  };
}
