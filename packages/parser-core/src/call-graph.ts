import { ConfidenceLevel, EdgeType } from '@gitlens/shared-types';

export interface ExtractedCall {
  sourceSymbol: string;
  targetSymbol: string;
  confidence: ConfidenceLevel;
  line: number;
}

export interface ExtractedHeritage {
  childSymbol: string;
  parentSymbol: string;
  type: 'EXTENDS' | 'IMPLEMENTS';
  line: number;
}

export function extractCallEdges(content: string, knownSymbols: string[] = []): ExtractedCall[] {
  const calls: ExtractedCall[] = [];
  if (!content) return calls;

  const lines = content.split('\n');
  const callPattern = /(?:await\s+)?([A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*)\s*\(/g;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comment lines
    if (line.trim().startsWith('//') || line.trim().startsWith('/*') || line.trim().startsWith('*')) {
      continue;
    }

    callPattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = callPattern.exec(line)) !== null) {
      const callTarget = match[1];

      // Ignore language primitives
      if (['if', 'for', 'while', 'switch', 'catch', 'require', 'import', 'function', 'return', 'typeof'].includes(callTarget)) {
        continue;
      }

      const isDirectKnown = knownSymbols.some((s) => s === callTarget || s.endsWith(`.${callTarget}`));

      calls.push({
        sourceSymbol: 'file-scope',
        targetSymbol: callTarget,
        confidence: isDirectKnown ? 'static' : 'inferred',
        line: lineNum,
      });
    }
  }

  return calls;
}

export function extractHeritageEdges(content: string): ExtractedHeritage[] {
  const heritage: ExtractedHeritage[] = [];
  if (!content) return heritage;

  const lines = content.split('\n');
  const classHeritageRegex = /class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$]+))?(?:\s+implements\s+([A-Za-z0-9_$,\s]+))?/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = classHeritageRegex.exec(line);
    if (match) {
      const child = match[1];
      const extendsTarget = match[2];
      const implementsList = match[3];

      if (extendsTarget) {
        heritage.push({
          childSymbol: child,
          parentSymbol: extendsTarget,
          type: 'EXTENDS',
          line: i + 1,
        });
      }

      if (implementsList) {
        const parents = implementsList.split(',').map((s) => s.trim()).filter(Boolean);
        for (const parent of parents) {
          heritage.push({
            childSymbol: child,
            parentSymbol: parent,
            type: 'IMPLEMENTS',
            line: i + 1,
          });
        }
      }
    }
  }

  return heritage;
}
