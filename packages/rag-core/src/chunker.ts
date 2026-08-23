import { CodeChunk, SymbolNode, SourceFile } from '@gitlens/shared-types';
import { generateUuid, sha256Hash } from '@gitlens/utils';

export interface ChunkOptions {
  maxLinesPerChunk?: number;
  overlapLines?: number;
}

export function chunkSourceFile(
  file: SourceFile,
  symbols: SymbolNode[] = [],
  options: ChunkOptions = {}
): CodeChunk[] {
  const maxLines = options.maxLinesPerChunk || 60;
  const overlap = options.overlapLines || 15;
  const chunks: CodeChunk[] = [];

  if (!file.content) return chunks;

  const lines = file.content.split('\n');
  const fileSymbols = symbols.filter((s) => s.fileId === file.id);

  if (fileSymbols.length > 0) {
    // 1. AST-aligned chunking per symbol
    for (const sym of fileSymbols) {
      // Get exact symbol lines
      const symLines = lines.slice(sym.startLine - 1, sym.endLine);
      const rawCode = symLines.join('\n');

      // Structured context header
      const header = `// File: ${file.path} | Symbol: ${sym.name} | Kind: ${sym.kind} | Complexity: ${sym.metrics.cyclomaticComplexity}\n`;
      const chunkContent = header + rawCode;

      chunks.push({
        id: `chunk-${file.id}-${sym.id}-${generateUuid().slice(0, 6)}`,
        analysisId: file.analysisId,
        fileId: file.id,
        filePath: file.path,
        symbolId: sym.id,
        symbolName: sym.name,
        content: chunkContent,
        startLine: sym.startLine,
        endLine: sym.endLine,
        contentHash: sha256Hash(chunkContent),
      });
    }
  } else {
    // 2. Sliding window fallback for files without explicit AST symbols
    for (let i = 0; i < lines.length; i += (maxLines - overlap)) {
      const chunkEnd = Math.min(lines.length, i + maxLines);
      const chunkLines = lines.slice(i, chunkEnd);
      const rawCode = chunkLines.join('\n');

      const header = `// File: ${file.path} | Lines: ${i + 1}-${chunkEnd} | Language: ${file.language}\n`;
      const chunkContent = header + rawCode;

      chunks.push({
        id: `chunk-win-${file.id}-${i + 1}-${generateUuid().slice(0, 6)}`,
        analysisId: file.analysisId,
        fileId: file.id,
        filePath: file.path,
        content: chunkContent,
        startLine: i + 1,
        endLine: chunkEnd,
        contentHash: sha256Hash(chunkContent),
      });

      if (chunkEnd >= lines.length) break;
    }
  }

  return chunks;
}
