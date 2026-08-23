export interface ImportStatement {
  sourcePath: string;
  targetSpecifier: string;
  resolvedPath: string;
  isExternal: boolean;
  importedSymbols: string[];
  isDefault: boolean;
  isNamespace: boolean;
}

export interface ExportStatement {
  sourcePath: string;
  exportedSymbol: string;
  isDefault: boolean;
}

export function resolveImportPath(
  currentFilePath: string,
  specifier: string,
  allKnownFiles: string[] = []
): { resolvedPath: string; isExternal: boolean } {
  // 1. External packages
  if (!specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('@/')) {
    return { resolvedPath: `external:${specifier}`, isExternal: true };
  }

  // 2. Tsconfig path aliases (@/...)
  let targetPath = specifier;
  if (specifier.startsWith('@/')) {
    targetPath = specifier.replace(/^@\//, 'src/');
  } else if (specifier.startsWith('.')) {
    // Relative path resolution
    const currentDir = currentFilePath.split('/').slice(0, -1).join('/');
    const parts = (currentDir ? `${currentDir}/${specifier}` : specifier).split('/');
    const resolvedParts: string[] = [];

    for (const part of parts) {
      if (part === '.' || part === '') continue;
      if (part === '..') {
        resolvedParts.pop();
      } else {
        resolvedParts.push(part);
      }
    }
    targetPath = resolvedParts.join('/');
  }

  // 3. Match against known files with extensions
  const candidates = [
    targetPath,
    `${targetPath}.ts`,
    `${targetPath}.tsx`,
    `${targetPath}.js`,
    `${targetPath}.jsx`,
    `${targetPath}/index.ts`,
    `${targetPath}/index.js`,
  ];

  for (const cand of candidates) {
    if (allKnownFiles.includes(cand)) {
      return { resolvedPath: cand, isExternal: false };
    }
  }

  // Fallback to closest canonical path
  return {
    resolvedPath: targetPath.endsWith('.ts') || targetPath.endsWith('.js') ? targetPath : `${targetPath}.ts`,
    isExternal: false,
  };
}

export function extractImports(currentFilePath: string, content: string, allFiles: string[] = []): ImportStatement[] {
  const imports: ImportStatement[] = [];
  if (!content) return imports;

  // Regex matching various ES6 import formats
  const importRegex = /import\s+(?:([\w$]+)\s*,?\s*)?(?:(?:\*\s+as\s+([\w$]+))|(?:\s*\{([^}]+)\}))?\s*from\s*['"]([^'"]+)['"]/g;

  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    const defaultImport = match[1];
    const namespaceImport = match[2];
    const namedImportsStr = match[3];
    const specifier = match[4];

    const importedSymbols: string[] = [];
    if (defaultImport) importedSymbols.push(defaultImport);
    if (namespaceImport) importedSymbols.push(namespaceImport);
    if (namedImportsStr) {
      const names = namedImportsStr.split(',').map((s) => {
        const parts = s.trim().split(/\s+as\s+/);
        return parts[parts.length - 1];
      }).filter(Boolean);
      importedSymbols.push(...names);
    }

    const { resolvedPath, isExternal } = resolveImportPath(currentFilePath, specifier, allFiles);

    imports.push({
      sourcePath: currentFilePath,
      targetSpecifier: specifier,
      resolvedPath,
      isExternal,
      importedSymbols,
      isDefault: !!defaultImport,
      isNamespace: !!namespaceImport,
    });
  }

  // Also support require() syntax
  const requireRegex = /(?:const|let|var)\s+(?:\{([^}]+)\}|([\w$]+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = requireRegex.exec(content)) !== null) {
    const namedReq = match[1];
    const defaultReq = match[2];
    const specifier = match[3];

    const importedSymbols: string[] = [];
    if (defaultReq) importedSymbols.push(defaultReq);
    if (namedReq) {
      importedSymbols.push(...namedReq.split(',').map((s) => s.trim()).filter(Boolean));
    }

    const { resolvedPath, isExternal } = resolveImportPath(currentFilePath, specifier, allFiles);

    imports.push({
      sourcePath: currentFilePath,
      targetSpecifier: specifier,
      resolvedPath,
      isExternal,
      importedSymbols,
      isDefault: !!defaultReq,
      isNamespace: false,
    });
  }

  return imports;
}
