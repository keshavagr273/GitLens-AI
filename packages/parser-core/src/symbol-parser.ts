import { SymbolNode, SymbolKind } from '@gitlens/shared-types';
import { generateUuid } from '@gitlens/utils';

export interface ParseResult {
  symbols: SymbolNode[];
  error?: string | null;
}

export function calculateComplexity(codeBlock: string): number {
  let complexity = 1;
  const patterns = [
    /\bif\s*\(/g,
    /\belse\s+if\s*\(/g,
    /\bfor\s*\(/g,
    /\bwhile\s*\(/g,
    /\bcatch\s*\(/g,
    /\bcase\s+[^:]+:/g,
    /\?/g,
    /&&/g,
    /\|\|/g,
    /\?\?/g,
  ];

  for (const pattern of patterns) {
    const matches = codeBlock.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
}

export function extractParameterCount(paramStr: string): number {
  if (!paramStr || paramStr.trim() === '') return 0;
  const clean = paramStr.trim();
  if (clean === '()' || clean === '') return 0;
  const inner = clean.replace(/^\(|\)$/g, '').trim();
  if (!inner) return 0;

  // Split on commas not inside nested generic or object types
  let depth = 0;
  let count = 1;
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i];
    if (ch === '<' || ch === '{' || ch === '(' || ch === '[') depth++;
    else if (ch === '>' || ch === '}' || ch === ')' || ch === ']') depth--;
    else if (ch === ',' && depth === 0) count++;
  }
  return count;
}

export function parseSymbols(fileId: string, content: string, language = 'typescript'): ParseResult {
  const symbols: SymbolNode[] = [];
  if (!content || typeof content !== 'string') {
    return { symbols: [] };
  }

  try {
    const lines = content.split('\n');

    // 1. Class declarations
    const classRegex = /(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z0-9_$]+)(?:\s+extends\s+([A-Za-z0-9_$.]+))?(?:\s+implements\s+([A-Za-z0-9_$,\s]+))?/g;
    let match: RegExpExecArray | null;

    let currentClassSymbol: SymbolNode | null = null;
    let classEndLine = -1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check if we exited current class
      if (currentClassSymbol && lineNum > classEndLine) {
        currentClassSymbol = null;
      }

      // Check for class declaration
      classRegex.lastIndex = 0;
      const classMatch = classRegex.exec(line);
      if (classMatch) {
        const className = classMatch[1];
        const startLine = lineNum;
        const endLine = findBlockEnd(lines, i);
        classEndLine = endLine;

        const classBody = lines.slice(i, endLine).join('\n');
        const classSym: SymbolNode = {
          id: `sym-class-${className}-${generateUuid().slice(0, 6)}`,
          fileId,
          name: className,
          kind: 'class',
          startLine,
          endLine,
          startColumn: line.indexOf(className) + 1,
          endColumn: line.length + 1,
          metrics: {
            cyclomaticComplexity: calculateComplexity(classBody),
            loc: endLine - startLine + 1,
            parameterCount: 0,
          },
        };
        symbols.push(classSym);
        currentClassSymbol = classSym;
        continue;
      }

      // Check for methods inside class
      if (currentClassSymbol) {
        const methodRegex = /^\s*(?:public|private|protected|async|static|\s)*([A-Za-z0-9_$]+)\s*(\([^)]*\))\s*(?::\s*[^;{]+)?\s*\{?/;
        const methodMatch = methodRegex.exec(line);
        if (
          methodMatch &&
          !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(methodMatch[1])
        ) {
          const methodName = methodMatch[1];
          const paramStr = methodMatch[2];
          const startLine = lineNum;
          const endLine = findBlockEnd(lines, i);
          const methodBody = lines.slice(i, endLine).join('\n');

          symbols.push({
            id: `sym-method-${methodName}-${generateUuid().slice(0, 6)}`,
            fileId,
            parentId: currentClassSymbol.id,
            name: methodName,
            kind: 'method',
            startLine,
            endLine,
            startColumn: line.indexOf(methodName) + 1,
            endColumn: line.length + 1,
            signature: paramStr,
            metrics: {
              cyclomaticComplexity: calculateComplexity(methodBody),
              loc: endLine - startLine + 1,
              parameterCount: extractParameterCount(paramStr),
            },
          });
          continue;
        }
      }

      // Check for function declarations
      const funcRegex = /(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*(\([^)]*\))/;
      const funcMatch = funcRegex.exec(line);
      if (funcMatch) {
        const funcName = funcMatch[1];
        const paramStr = funcMatch[2];
        const startLine = lineNum;
        const endLine = findBlockEnd(lines, i);
        const funcBody = lines.slice(i, endLine).join('\n');

        symbols.push({
          id: `sym-func-${funcName}-${generateUuid().slice(0, 6)}`,
          fileId,
          name: funcName,
          kind: 'function',
          startLine,
          endLine,
          startColumn: line.indexOf(funcName) + 1,
          endColumn: line.length + 1,
          signature: paramStr,
          metrics: {
            cyclomaticComplexity: calculateComplexity(funcBody),
            loc: endLine - startLine + 1,
            parameterCount: extractParameterCount(paramStr),
          },
        });
        continue;
      }

      // Check for arrow function / constant declarations (e.g. export const authRoutes = async (...) => ...)
      const arrowRegex = /(?:export\s+)?(?:const|let)\s+([A-Za-z0-9_$]+)\s*(?::\s*[^=]+)?\s*=\s*(?:async\s*)?(?:\(([^)]*)\)|[A-Za-z0-9_$]+)\s*=>/;
      const arrowMatch = arrowRegex.exec(line);
      if (arrowMatch) {
        const varName = arrowMatch[1];
        const paramStr = arrowMatch[2] ? `(${arrowMatch[2]})` : '()';
        const startLine = lineNum;
        const endLine = findBlockEnd(lines, i);
        const arrowBody = lines.slice(i, endLine).join('\n');

        symbols.push({
          id: `sym-arrow-${varName}-${generateUuid().slice(0, 6)}`,
          fileId,
          name: varName,
          kind: 'function',
          startLine,
          endLine,
          startColumn: line.indexOf(varName) + 1,
          endColumn: line.length + 1,
          signature: paramStr,
          metrics: {
            cyclomaticComplexity: calculateComplexity(arrowBody),
            loc: endLine - startLine + 1,
            parameterCount: extractParameterCount(paramStr),
          },
        });
        continue;
      }

      // Check for interface declarations
      const ifaceRegex = /(?:export\s+)?interface\s+([A-Za-z0-9_$]+)/;
      const ifaceMatch = ifaceRegex.exec(line);
      if (ifaceMatch) {
        const ifaceName = ifaceMatch[1];
        const startLine = lineNum;
        const endLine = findBlockEnd(lines, i);

        symbols.push({
          id: `sym-iface-${ifaceName}-${generateUuid().slice(0, 6)}`,
          fileId,
          name: ifaceName,
          kind: 'interface',
          startLine,
          endLine,
          startColumn: line.indexOf(ifaceName) + 1,
          endColumn: line.length + 1,
          metrics: {
            cyclomaticComplexity: 1,
            loc: endLine - startLine + 1,
            parameterCount: 0,
          },
        });
        continue;
      }

      // Check for type alias declarations
      const typeRegex = /(?:export\s+)?type\s+([A-Za-z0-9_$]+)\s*=/;
      const typeMatch = typeRegex.exec(line);
      if (typeMatch) {
        const typeName = typeMatch[1];
        symbols.push({
          id: `sym-type-${typeName}-${generateUuid().slice(0, 6)}`,
          fileId,
          name: typeName,
          kind: 'type',
          startLine: lineNum,
          endLine: lineNum,
          startColumn: line.indexOf(typeName) + 1,
          endColumn: line.length + 1,
          metrics: {
            cyclomaticComplexity: 1,
            loc: 1,
            parameterCount: 0,
          },
        });
      }
    }

    return { symbols };
  } catch (err: any) {
    return {
      symbols: [],
      error: err.message || 'AST parsing failed',
    };
  }
}

function findBlockEnd(lines: string[], startLineIndex: number): number {
  let openBraces = 0;
  let started = false;

  for (let i = startLineIndex; i < lines.length; i++) {
    const line = lines[i];
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '{') {
        openBraces++;
        started = true;
      } else if (ch === '}') {
        openBraces--;
        if (started && openBraces <= 0) {
          return i + 1;
        }
      }
    }
  }
  return Math.min(lines.length, startLineIndex + 1);
}
