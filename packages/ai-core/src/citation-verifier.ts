import { Citation, SourceFile, SymbolNode } from '@gitlens/shared-types';

export interface VerificationResult {
  validCitations: Citation[];
  rejectedCitations: Array<{ citation: Citation; reason: string }>;
}

export function verifyCitations(
  citations: Citation[],
  knownFiles: SourceFile[],
  knownSymbols: SymbolNode[] = []
): VerificationResult {
  const validCitations: Citation[] = [];
  const rejectedCitations: Array<{ citation: Citation; reason: string }> = [];

  const fileMap = new Map<string, SourceFile>();
  for (const f of knownFiles) {
    fileMap.set(f.path, f);
    fileMap.set(f.id, f);
  }

  for (const citation of citations) {
    // 1. Verify file exists
    const file = fileMap.get(citation.file) || knownFiles.find((f) => f.path.endsWith(citation.file));
    if (!file) {
      rejectedCitations.push({
        citation,
        reason: `Referenced file '${citation.file}' does not exist in repository.`,
      });
      continue;
    }

    // 2. Verify line numbers
    const totalLines = file.content ? file.content.split('\n').length : 1000;
    if (
      citation.startLine < 1 ||
      citation.endLine < citation.startLine ||
      citation.startLine > totalLines
    ) {
      rejectedCitations.push({
        citation,
        reason: `Invalid line range ${citation.startLine}-${citation.endLine} (file has ${totalLines} lines).`,
      });
      continue;
    }

    // 3. Normalize path and include verified citation
    validCitations.push({
      file: file.path,
      startLine: citation.startLine,
      endLine: Math.min(totalLines, citation.endLine),
      symbol: citation.symbol,
      reason: citation.reason || 'Verified source code span',
    });
  }

  return {
    validCitations,
    rejectedCitations,
  };
}
