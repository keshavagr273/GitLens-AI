import { GraphNode, GraphEdge } from '@gitlens/shared-types';

export interface ArchitecturalSmell {
  id: string;
  type: 'layer_violation' | 'god_module' | 'orphaned_component' | 'cyclic_coupling';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  nodeIds: string[];
  recommendation: string;
}

export function detectArchitecturalSmells(
  nodes: GraphNode[],
  edges: GraphEdge[]
): ArchitecturalSmell[] {
  const smells: ArchitecturalSmell[] = [];

  const outDegreeMap = new Map<string, number>();
  const inDegreeMap = new Map<string, number>();

  for (const edge of edges) {
    outDegreeMap.set(edge.sourceId, (outDegreeMap.get(edge.sourceId) || 0) + 1);
    inDegreeMap.set(edge.targetId, (inDegreeMap.get(edge.targetId) || 0) + 1);
  }

  for (const node of nodes) {
    const outDegree = outDegreeMap.get(node.id) || 0;
    const inDegree = inDegreeMap.get(node.id) || 0;

    // 1. God Module Detection: component with excessively high fan-out (> 20 dependencies)
    if (outDegree > 20) {
      smells.push({
        id: `smell-god-${node.id}`,
        type: 'god_module',
        severity: 'warning',
        title: `High Coupling God Module: ${node.name}`,
        description: `Node '${node.name}' has ${outDegree} outgoing dependencies, exceeding the architectural threshold of 20.`,
        nodeIds: [node.id],
        recommendation: `Refactor '${node.name}' by splitting responsibilities into smaller focused domain services.`,
      });
    }

    // 2. Orphaned Component Detection: non-entrypoint component with 0 incoming & 0 outgoing edges
    if (inDegree === 0 && outDegree === 0 && node.type === 'symbol') {
      smells.push({
        id: `smell-orphan-${node.id}`,
        type: 'orphaned_component',
        severity: 'info',
        title: `Dead Code / Orphaned Symbol: ${node.name}`,
        description: `Symbol '${node.name}' has 0 callers and 0 dependencies in the repository graph.`,
        nodeIds: [node.id],
        recommendation: `Verify if '${node.name}' is dead code and safe to deprecate or export cleanly.`,
      });
    }
  }

  // 3. Layer Violation Detection: Controller directly importing/calling DB Table without Service layer
  for (const edge of edges) {
    const source = nodes.find((n) => n.id === edge.sourceId);
    const target = nodes.find((n) => n.id === edge.targetId);

    if (
      source &&
      target &&
      (source.name.toLowerCase().includes('controller') || source.path?.includes('controllers')) &&
      (target.type === 'database_table' || target.name.toLowerCase().includes('repo'))
    ) {
      smells.push({
        id: `smell-layer-${edge.id}`,
        type: 'layer_violation',
        severity: 'critical',
        title: `Layer Violation: ${source.name} ➔ ${target.name}`,
        description: `Controller '${source.name}' directly accesses data persistence '${target.name}' bypassing the business domain service layer.`,
        nodeIds: [source.id, target.id],
        recommendation: `Introduce a domain service between '${source.name}' and '${target.name}' to encapsulate business invariants.`,
      });
    }
  }

  return smells;
}
