import { GraphNode, GraphEdge } from '@gitlens/shared-types';
import { detectArchitecturalSmells } from './smell-detector';
import { findCyclesTarjan } from './tarjan-scc';

export interface HealthScoreBreakdown {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  cycleCount: number;
  smellCount: number;
  criticalViolationCount: number;
  metrics: {
    couplingPenalty: number;
    cyclePenalty: number;
    violationPenalty: number;
  };
  summary: string;
}

export function calculateArchitectureHealthScore(
  nodes: GraphNode[],
  edges: GraphEdge[]
): HealthScoreBreakdown {
  const cycles = findCyclesTarjan(nodes, edges);
  const smells = detectArchitecturalSmells(nodes, edges);

  const criticalViolations = smells.filter((s) => s.severity === 'critical');
  const warnings = smells.filter((s) => s.severity === 'warning');

  let score = 100;

  // Penalties
  const cyclePenalty = cycles.length * 12;
  const violationPenalty = criticalViolations.length * 15;
  const couplingPenalty = warnings.length * 5;

  score = Math.max(0, Math.min(100, score - cyclePenalty - violationPenalty - couplingPenalty));

  let grade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 50) grade = 'D';
  else grade = 'F';

  return {
    score,
    grade,
    cycleCount: cycles.length,
    smellCount: smells.length,
    criticalViolationCount: criticalViolations.length,
    metrics: {
      cyclePenalty,
      violationPenalty,
      couplingPenalty,
    },
    summary: `Repository Architecture Grade: ${grade} (${score}/100) with ${cycles.length} circular cycles and ${smells.length} architectural smell warnings.`,
  };
}
