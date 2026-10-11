import { db } from '@gitlens/database';
import {
  AnalysisProgressEvent,
  AnalysisStage,
  SourceFile,
  SymbolNode,
  ApiRoute,
  Technology,
  GraphNode,
  GraphEdge,
} from '@gitlens/shared-types';
import { computeSha256, generateUuid, sleep } from '@gitlens/utils';
import { parseSymbols, detectRoutes, extractImports, extractMountPrefixes, RouterMountInfo } from '@gitlens/parser-core';
import { githubClient } from './github';
import { shouldProcessFile } from './filter';

export type ProgressCallback = (event: AnalysisProgressEvent) => void;

export class IngestionPipeline {
  private progressListeners: Map<string, Set<ProgressCallback>> = new Map();
  /** Analyses currently executing, so the same run is never started twice. */
  private activeRuns: Map<string, Promise<void>> = new Map();

  /** True while the given analysis is mid-flight. */
  isRunning(analysisId: string): boolean {
    return this.activeRuns.has(analysisId);
  }

  /**
   * Starts an analysis, or returns the in-flight promise if one is already
   * running. POST /analyze and the SSE progress stream both trigger a run,
   * which previously produced two concurrent pipelines writing the same keys.
   */
  runOnce(repositoryId: string, analysisId: string): Promise<void> {
    const existing = this.activeRuns.get(analysisId);
    if (existing) return existing;

    const task = this.run(repositoryId, analysisId).finally(() => {
      this.activeRuns.delete(analysisId);
    });
    this.activeRuns.set(analysisId, task);
    return task;
  }

  subscribe(analysisId: string, callback: ProgressCallback): () => void {
    if (!this.progressListeners.has(analysisId)) {
      this.progressListeners.set(analysisId, new Set());
    }
    this.progressListeners.get(analysisId)!.add(callback);

    return () => {
      this.progressListeners.get(analysisId)?.delete(callback);
    };
  }

  private emitProgress(
    analysisId: string,
    stage: AnalysisStage,
    progress: number,
    processedFiles: number,
    totalFiles: number,
    message: string,
    currentFile?: string
  ) {
    const event: AnalysisProgressEvent = {
      analysisId,
      stage,
      progress,
      processedFiles,
      totalFiles,
      currentFile,
      message,
      timestamp: new Date().toISOString(),
    };

    const listeners = this.progressListeners.get(analysisId);
    if (listeners) {
      for (const cb of listeners) {
        cb(event);
      }
    }
  }

  async run(repositoryId: string, analysisId: string): Promise<void> {
    const repo = await db.getRepositoryById(repositoryId);
    if (!repo) {
      throw new Error(`Repository ${repositoryId} not found`);
    }

    try {
      // 1. Stage: FETCHING metadata & recursive Git tree
      this.emitProgress(analysisId, 'FETCHING', 0.1, 0, 0, `Fetching Git tree for ${repo.owner}/${repo.name}...`);
      await db.updateAnalysisProgress(analysisId, { stage: 'FETCHING', progress: 0.1, status: 'RUNNING' });

      let fileEntries: Array<{ path: string; content?: string }> = [];

      {
        const metadata = await githubClient.fetchRepoMetadata(repo.owner, repo.name);
        const rawTree = await githubClient.fetchRecursiveTree(repo.owner, repo.name, metadata.commitSha);
        fileEntries = rawTree.map((e) => ({ path: e.path }));

        // Filter valid source code files before downloading blobs
        const candidateFiles = fileEntries.filter((entry) => {
          return shouldProcessFile({
            path: entry.path,
            mode: '100644',
            type: 'blob',
            sha: 'blob-sha',
          }).process;
        });

        // Sort by architectural importance and cap at 250 files for mega-repos
        const prioritizedCandidates = candidateFiles
          .filter((f) => !f.path.startsWith('.') || f.path.includes('.env.example'))
          .sort((a, b) => {
            const aPriority = a.path.includes('package.json')
              ? 100
              : a.path.includes('/src/') || a.path.startsWith('src/')
              ? 50
              : a.path.includes('packages/')
              ? 40
              : 20;
            const bPriority = b.path.includes('package.json')
              ? 100
              : b.path.includes('/src/') || b.path.startsWith('src/')
              ? 50
              : b.path.includes('packages/')
              ? 40
              : 20;
            return bPriority - aPriority;
          })
          .slice(0, 250);

        console.log(`🌐 Downloading ${prioritizedCandidates.length} remote source files from GitHub (${repo.owner}/${repo.name})...`);
        const remoteMap = await githubClient.fetchFilesBatch(
          repo.owner,
          repo.name,
          metadata.defaultBranch || 'main',
          prioritizedCandidates.map((f) => f.path),
          20,
          (completed, total) => {
            const fetchProgress = 0.05 + 0.20 * (completed / total);
            this.emitProgress(
              analysisId,
              'FETCHING',
              Number(fetchProgress.toFixed(2)),
              completed,
              total,
              `Downloading source code (${completed}/${total})...`
            );
          }
        );

        fileEntries = prioritizedCandidates
          .map((f) => ({ path: f.path, content: remoteMap.get(f.path) || '' }))
          .filter((f) => f.content.length > 0);

        if (fileEntries.length === 0) {
          throw new Error(
            `Downloaded 0 of ${prioritizedCandidates.length} source files from ${repo.owner}/${repo.name}. ` +
              'The repository may be empty, private, or the GitHub rate limit was exhausted.'
          );
        }
      }

      await sleep(150);

      // 2. Stage: FILTERING files
      this.emitProgress(
        analysisId,
        'FILTERING',
        0.3,
        0,
        fileEntries.length,
        `Filtering ${fileEntries.length} files (excluding binaries, vendor, lockfiles)...`
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'FILTERING', progress: 0.3 });

      const filteredFiles: SourceFile[] = [];
      for (const entry of fileEntries) {
        const filterResult = shouldProcessFile({
          path: entry.path,
          mode: '100644',
          type: 'blob',
          sha: 'blob-sha',
        });
        if (filterResult.process) {
          // Skip files whose content could not be retrieved - a placeholder
          // comment parses to zero symbols and silently empties the graph.
          if (!entry.content) continue;
          const content = entry.content;
          filteredFiles.push({
            id: `file-${generateUuid().slice(0, 8)}`,
            analysisId,
            path: entry.path,
            language: filterResult.language,
            contentHash: computeSha256(content),
            sizeBytes: content.length,
            content,
            importanceScore: 1.0,
            isGenerated: filterResult.isGenerated,
            createdAt: new Date().toISOString(),
          });
        }
      }

      const totalFiles = filteredFiles.length;
      // Declared dependency names across every package.json in the repository.
      // Matching these beats substring-scanning all source text, where "pg"
      // or "express" hit unrelated prose and comments.
      const declaredDeps = new Set<string>();
      for (const f of filteredFiles) {
        if (!f.path.endsWith('package.json') || !f.content) continue;
        try {
          const pkg = JSON.parse(f.content);
          for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
            for (const name of Object.keys(pkg[field] || {})) declaredDeps.add(name);
          }
          // A framework's own repository never depends on itself, so count the
          // package's own name too (e.g. analysing expressjs/express).
          if (typeof pkg.name === 'string') declaredDeps.add(pkg.name);
        } catch {}
      }
      const hasDep = (...names: string[]) => names.some((n) => declaredDeps.has(n));
      const hasFile = (pattern: RegExp) => filteredFiles.some((f) => pattern.test(f.path));
      await sleep(150);

      // 3. Stage: PARSING & AST extraction
      this.emitProgress(
        analysisId,
        'PARSING',
        0.5,
        0,
        totalFiles,
        `Extracting AST symbols across ${totalFiles} source files...`
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'PARSING', progress: 0.5, totalFiles });

      const allSymbols: SymbolNode[] = [];
      const parsedFileImports: Array<{ fileId: string; filePath: string; imports: string[] }> = [];

      for (let i = 0; i < totalFiles; i++) {
        const file = filteredFiles[i];
        try {
          if (file.content && (file.language === 'typescript' || file.language === 'javascript' || file.language === 'tsx')) {
            const symResult = parseSymbols(file.id, file.content, file.language);
            allSymbols.push(...symResult.symbols);

            const impResult = extractImports(file.path, file.content);
            parsedFileImports.push({
              fileId: file.id,
              filePath: file.path,
              imports: impResult.map((imp) => imp.targetSpecifier),
            });
          }
        } catch (parseErr) {
          console.warn(`AST Parse error for ${file.path}:`, parseErr);
        }

        if (i % 10 === 0 || i === totalFiles - 1) {
          const currentProgress = 0.5 + 0.25 * ((i + 1) / totalFiles);
          this.emitProgress(
            analysisId,
            'PARSING',
            Number(currentProgress.toFixed(2)),
            i + 1,
            totalFiles,
            `Parsed ${file.path}`,
            file.path
          );
        }
        await sleep(5);
      }

      // 4. Stage: ROUTES Detection
      this.emitProgress(
        analysisId,
        'ROUTES',
        0.75,
        totalFiles,
        totalFiles,
        'Detecting NestJS/Express/Fastify/Next.js routes...'
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'ROUTES', progress: 0.75 });

      // Extract router mount prefixes from entry points e.g. app.use('/api/v1/users', userRouter)
      const mountPrefixes: RouterMountInfo[] = [];
      for (const f of filteredFiles) {
        if (
          f.content &&
          (f.path.endsWith('app.js') ||
            f.path.endsWith('app.ts') ||
            f.path.endsWith('server.js') ||
            f.path.endsWith('server.ts') ||
            f.path.endsWith('main.js') ||
            f.path.endsWith('main.ts') ||
            f.path.endsWith('index.js') ||
            f.path.endsWith('index.ts'))
        ) {
          mountPrefixes.push(...extractMountPrefixes(f.content, f.path));
        }
      }

      const allRoutes: ApiRoute[] = [];
      const seenRouteKeys = new Set<string>();

      for (const f of filteredFiles) {
        if (f.content) {
          const detected = detectRoutes(f.id, f.path, f.content, mountPrefixes);
          for (const route of detected) {
            const key = `${route.method}:${route.path}`;
            if (!seenRouteKeys.has(key)) {
              seenRouteKeys.add(key);
              allRoutes.push(route);
            }
          }
        }
      }

      await sleep(150);

      // 5. Stage: HIGH-LEVEL ARCHITECTURE GRAPH CONSTRUCTION WITH RICH METADATA & ASSOCIATED FILES
      this.emitProgress(
        analysisId,
        'GRAPH',
        0.85,
        totalFiles,
        totalFiles,
        'Synthesizing high-level module architecture graph...'
      );
      await db.updateAnalysisProgress(analysisId, { stage: 'GRAPH', progress: 0.85 });

      const graphNodes: GraphNode[] = [];
      const graphEdges: GraphEdge[] = [];

      // --------------------------------------------------------------------------
      // 1. UNIVERSAL WORKSPACE & MONOREPO PACKAGE DETECTOR
      // --------------------------------------------------------------------------
      const subpackageDirs = new Map<
        string,
        {
          name: string;
          folder: string;
          pkgJsonPath?: string;
          packageJson?: any;
          files: SourceFile[];
        }
      >();

      for (const file of filteredFiles) {
        const parts = file.path.split('/');
        if (
          parts.length >= 2 &&
          ['packages', 'apps', 'libs', 'services', 'modules', 'components', 'crates', 'pkg'].includes(parts[0])
        ) {
          const pkgFolder = `${parts[0]}/${parts[1]}`;
          if (!subpackageDirs.has(pkgFolder)) {
            subpackageDirs.set(pkgFolder, {
              name: parts[1],
              folder: pkgFolder,
              files: [],
            });
          }
          const pkg = subpackageDirs.get(pkgFolder)!;
          pkg.files.push(file);
          if (file.path.endsWith('package.json') && file.content) {
            try {
              pkg.packageJson = JSON.parse(file.content);
              pkg.pkgJsonPath = file.path;
            } catch (e) {}
          }
        }
      }

      if (subpackageDirs.size >= 2) {
        // MONOREPO / MULTI-PACKAGE SUITE ARCHITECTURE
        const pkgNodesMap = new Map<string, string>(); // pkgName or folder -> nodeId

        for (const [folder, pkg] of subpackageDirs.entries()) {
          const cleanName = pkg.packageJson?.name || pkg.name;
          const nodeId = `node-pkg-${folder.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          pkgNodesMap.set(cleanName, nodeId);
          pkgNodesMap.set(folder, nodeId);
          pkgNodesMap.set(pkg.name, nodeId);

          // Infer Layer dynamically
          const lowerName = cleanName.toLowerCase();
          const lowerFolder = folder.toLowerCase();
          let layer: string = 'service';

          if (
            lowerName.includes('web') ||
            lowerName.includes('client') ||
            lowerName.includes('ui') ||
            lowerName.includes('frontend') ||
            lowerFolder.startsWith('apps/web')
          ) {
            layer = 'client';
          } else if (
            lowerName.includes('api') ||
            lowerName.includes('gateway') ||
            lowerName.includes('server') ||
            lowerName.includes('reconciler') ||
            lowerFolder.startsWith('apps/api') ||
            lowerFolder.startsWith('packages/react')
          ) {
            layer = lowerName === 'react' ? 'client' : 'gateway';
          } else if (
            lowerName.includes('controller') ||
            lowerName.includes('route') ||
            lowerName.includes('dom') ||
            lowerName.includes('native') ||
            lowerName.includes('art') ||
            lowerName.includes('render')
          ) {
            layer = 'controller';
          } else if (
            lowerName.includes('worker') ||
            lowerName.includes('queue') ||
            lowerName.includes('scheduler') ||
            lowerName.includes('job') ||
            lowerFolder.startsWith('apps/worker')
          ) {
            layer = 'worker';
          } else if (
            lowerName.includes('db') ||
            lowerName.includes('database') ||
            lowerName.includes('data') ||
            lowerName.includes('store') ||
            lowerName.includes('model') ||
            lowerName.includes('shared') ||
            lowerName.includes('cache') ||
            lowerName.includes('types')
          ) {
            layer = 'database';
          }

          // Extract functionalities from AST symbols & files
          const pkgFileIds = new Set(pkg.files.map((f) => f.id));
          const pkgSymbols = allSymbols.filter((s) => pkgFileIds.has(s.fileId));
          const funcs: string[] = [];
          if (pkg.packageJson?.description) {
            funcs.push(pkg.packageJson.description);
          }
          for (const s of pkgSymbols.slice(0, 4)) {
            if (s.name && !funcs.some((f) => f.includes(s.name))) {
              funcs.push(`Exported ${s.kind}: ${s.name}`);
            }
          }
          if (funcs.length === 0) {
            funcs.push(`Core workspace subsystem files (${pkg.files.length} files)`);
          }

          graphNodes.push({
            id: nodeId,
            type: 'module',
            name: cleanName,
            path: folder,
            metadata: {
              layer,
              role: pkg.packageJson?.description || `${cleanName} Workspace Subsystem`,
              functionalities: funcs.slice(0, 5),
              associatedFiles: pkg.files.map((f) => f.path).slice(0, 20),
              complexity: Math.min(10, Math.max(5, Math.round(pkg.files.length / 4))),
            },
          });
        }

        // Dynamically connect inter-package edges based on package.json dependencies and imports
        let edgeCounter = 1;
        for (const [folder, pkg] of subpackageDirs.entries()) {
          const sourceNodeId = pkgNodesMap.get(folder)!;
          const allDeclaredDeps = {
            ...(pkg.packageJson?.dependencies || {}),
            ...(pkg.packageJson?.peerDependencies || {}),
            ...(pkg.packageJson?.devDependencies || {}),
          };

          for (const depName of Object.keys(allDeclaredDeps)) {
            const targetNodeId = pkgNodesMap.get(depName);
            if (targetNodeId && targetNodeId !== sourceNodeId) {
              const edgeExists = graphEdges.some(
                (e) => e.sourceId === sourceNodeId && e.targetId === targetNodeId
              );
              if (!edgeExists) {
                graphEdges.push({
                  id: `edge-pkg-${edgeCounter++}`,
                  analysisId,
                  sourceId: sourceNodeId,
                  targetId: targetNodeId,
                  type: 'CALLS',
                  confidence: 'static',
                });
              }
            }
          }

          // Also check cross-file imports
          for (const f of pkg.files) {
            if (f.content) {
              for (const [otherFolder, otherPkg] of subpackageDirs.entries()) {
                if (otherFolder !== folder) {
                  const otherName = otherPkg.packageJson?.name || otherPkg.name;
                  if (
                    f.content.includes(`from '${otherName}'`) ||
                    f.content.includes(`from "${otherName}"`) ||
                    f.content.includes(`require('${otherName}')`) ||
                    f.content.includes(`require("${otherName}")`)
                  ) {
                    const targetNodeId = pkgNodesMap.get(otherFolder)!;
                    const edgeExists = graphEdges.some(
                      (e) => e.sourceId === sourceNodeId && e.targetId === targetNodeId
                    );
                    if (!edgeExists && sourceNodeId !== targetNodeId) {
                      graphEdges.push({
                        id: `edge-pkg-${edgeCounter++}`,
                        analysisId,
                        sourceId: sourceNodeId,
                        targetId: targetNodeId,
                        type: 'CALLS',
                        confidence: 'static',
                      });
                    }
                  }
                }
              }
            }
          }
        }
      } else {
        // --------------------------------------------------------------------------
        // 2. SINGLE APPLICATION / BACKEND SERVICE ARCHITECTURE
        // --------------------------------------------------------------------------
        const gatewayFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return (
            lower.endsWith('/app.js') ||
            lower.endsWith('/app.ts') ||
            lower.endsWith('/server.js') ||
            lower.endsWith('/server.ts') ||
            lower.endsWith('/main.js') ||
            lower.endsWith('/main.ts') ||
            lower.endsWith('/index.js') ||
            lower.endsWith('/index.ts') ||
            lower === 'app.js' ||
            lower === 'app.ts' ||
            lower === 'server.js' ||
            lower === 'server.ts' ||
            lower === 'main.js' ||
            lower === 'main.ts' ||
            lower === 'index.js' ||
            lower === 'index.ts'
          );
        });

        const primaryGateway = gatewayFiles[0];
        const apiGatewayId = 'node-api-gateway';

        /**
         * Edge origins for a downstream layer. Libraries and frameworks have no
         * controller files; without this the gateway and every other node would
         * render as disconnected islands.
         */
        const edgeSourcesFor = (controllers: string[], fallback: string): string[] =>
          controllers.length > 0 ? controllers.slice(0, 5) : [fallback];

        graphNodes.push({
          id: apiGatewayId,
          type: 'module',
          name: `${repo.name} Core Server`,
          path: primaryGateway?.path || (filteredFiles[0]?.path || 'src/index.js'),
          metadata: {
            layer: 'gateway',
            role: 'Application Core Server & HTTP Router',
            functionalities: [
              'HTTP Request Parsing & JSON Body Serialization',
              'Middleware Execution & Security Headers',
              'Sub-router Mounting & Request Routing',
            ],
            associatedFiles: gatewayFiles.map((f) => f.path).slice(0, 10),
            complexity: 7,
          },
        });

        // Realtime Socket Gateway
        // 'ws' as a bare substring matched any path containing those letters
        // (e.g. "browser.ts"), inventing a WebSocket gateway that did not exist.
        const socketFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return (
            lower.includes('socket') ||
            lower.includes('websocket') ||
            /(^|[\/._-])ws([\/._-]|$)/.test(lower)
          );
        });
        const usesSocketLib =
          declaredDeps.has('ws') || declaredDeps.has('socket.io') || declaredDeps.has('socket.io-client');

        if (socketFiles.length > 0 || usesSocketLib) {
          const socketId = 'node-socket-gateway';
          graphNodes.push({
            id: socketId,
            type: 'module',
            name: 'Realtime WebSocket Gateway',
            path: socketFiles[0]?.path || '',
            metadata: {
              layer: 'gateway',
              role: 'Bidirectional WebSocket & Event Streaming Server',
              functionalities: [
                'WebSocket Client Connection Management',
                'Real-Time Event Broadcasting & Pub/Sub Subscriptions',
              ],
              associatedFiles: socketFiles.map((f) => f.path),
              complexity: 7,
            },
          });
          graphEdges.push({
            id: 'edge-gw-socket',
            analysisId,
            sourceId: apiGatewayId,
            targetId: socketId,
            type: 'CALLS',
            confidence: 'static',
          });
        }

        // Domain Controllers & Route Handlers
        const controllerFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return (
            lower.includes('controller') ||
            lower.includes('routes') ||
            lower.includes('router') ||
            lower.includes('handler') ||
            lower.includes('endpoint')
          );
        });

        /**
         * Human domain name from a controller/route file path.
         * The previous regex only stripped dot-separated suffixes, so
         * "error-handler.js" became the label "Error-handler.jsController".
         */
        const domainFromPath = (filePath: string): string => {
          const base = filePath.split('/').pop() || 'core';
          const withoutExt = base.replace(/\.[jt]sx?$/, '').replace(/\.d$/, '');
          const stripped = withoutExt
            .replace(/[._-](controller|controllers|routes?|router|handler|handlers|endpoint|endpoints)$/i, '')
            .replace(/^(controller|routes?|router|handler|endpoint)[._-]/i, '');
          const cleaned = stripped || withoutExt || 'core';
          // index.js inside a folder is named after the folder it lives in.
          if (/^index$/i.test(cleaned)) {
            const parts = filePath.split('/');
            return parts.length >= 2 ? parts[parts.length - 2] : 'core';
          }
          return cleaned;
        };

        /** "error-handler" -> "ErrorHandler" */
        const toPascalCase = (value: string): string =>
          value
            .split(/[-_.\s]+/)
            .filter(Boolean)
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join('') || 'Core';

        const domainMap = new Map<string, { files: string[]; routes: ApiRoute[] }>();
        for (const cf of controllerFiles) {
          const baseName = domainFromPath(cf.path);
          if (!domainMap.has(baseName)) {
            domainMap.set(baseName, { files: [], routes: [] });
          }
          domainMap.get(baseName)!.files.push(cf.path);
        }

        for (const r of allRoutes) {
          const rBase = r.filePath ? domainFromPath(r.filePath) : 'core';
          if (domainMap.has(rBase)) {
            domainMap.get(rBase)!.routes.push(r);
          }
        }

        const controllerNodeIds: string[] = [];
        for (const [domain, info] of domainMap.entries()) {
          const capitalized = toPascalCase(domain);
          const ctrlId = `ctrl-${domain.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
          controllerNodeIds.push(ctrlId);

          const funcs = info.routes.map((r) => `${r.method} ${r.path} (${r.handlerName || 'handler'})`);
          if (funcs.length === 0) {
            funcs.push(`REST controller handlers for ${capitalized} domain`);
          }

          graphNodes.push({
            id: ctrlId,
            type: 'route',
            name: `${capitalized}Controller`,
            kind: 'controller',
            path: info.files[0] || '',
            metadata: {
              layer: 'controller',
              role: `HTTP Route Controller for ${capitalized} Domain`,
              functionalities: funcs.slice(0, 6),
              associatedFiles: info.files,
              complexity: Math.min(10, Math.max(3, funcs.length * 2)),
            },
          });

          graphEdges.push({
            id: `edge-gw-${ctrlId}`,
            analysisId,
            sourceId: apiGatewayId,
            targetId: ctrlId,
            type: 'ROUTES_TO',
            confidence: 'static',
          });
        }

        // Middlewares & Guards
        const middlewareFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return (
            lower.includes('middleware') ||
            lower.includes('guard') ||
            lower.includes('interceptor') ||
            lower.includes('auth.')
          );
        });

        if (middlewareFiles.length > 0) {
          const mwId = 'node-middlewares-guard';
          graphNodes.push({
            id: mwId,
            type: 'module',
            name: 'Security & Auth Middlewares',
            path: middlewareFiles[0].path,
            metadata: {
              layer: 'service',
              role: 'Request Validation, Authentication & Security Guard',
              functionalities: [
                'Token Verification & Identity Claims Extraction',
                'Role-Based Access Control (RBAC) Enforcement',
                'Payload Validation & Error Interception',
              ],
              associatedFiles: middlewareFiles.map((f) => f.path),
              complexity: 7,
            },
          });

          for (const sourceId of edgeSourcesFor(controllerNodeIds, apiGatewayId)) {
            graphEdges.push({
              id: `edge-${sourceId}-mw`,
              analysisId,
              sourceId,
              targetId: mwId,
              type: 'CALLS',
              confidence: 'static',
            });
          }
        }

        // Services & Business Logic
        const serviceFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return (
            lower.includes('service') ||
            lower.includes('usecase') ||
            lower.includes('manager') ||
            lower.includes('engine') ||
            lower.includes('util') ||
            lower.includes('client')
          );
        });

        if (serviceFiles.length > 0) {
          const svcId = 'node-services-engine';
          graphNodes.push({
            id: svcId,
            type: 'module',
            name: 'Domain Services & Business Engine',
            path: serviceFiles[0].path,
            metadata: {
              layer: 'service',
              role: 'Domain Business Logic & Data Transformation Engine',
              functionalities: [
                'Business Transaction Orchestration',
                'Third-Party Client Communication & Media Uploads',
                'Data Sanitization & Aggregation Pipelines',
              ],
              associatedFiles: serviceFiles.map((f) => f.path).slice(0, 15),
              complexity: 8,
            },
          });

          for (const sourceId of edgeSourcesFor(controllerNodeIds, apiGatewayId)) {
            graphEdges.push({
              id: `edge-${sourceId}-svc`,
              analysisId,
              sourceId,
              targetId: svcId,
              type: 'CALLS',
              confidence: 'static',
            });
          }
        }

        // Background Workers & Jobs
        const workerFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return (
            lower.includes('worker') ||
            lower.includes('job') ||
            lower.includes('cron') ||
            lower.includes('queue') ||
            lower.includes('consumer') ||
            lower.includes('task')
          );
        });

        if (workerFiles.length > 0) {
          const workerId = 'node-async-worker';
          graphNodes.push({
            id: workerId,
            type: 'module',
            name: 'Async Background Worker',
            path: workerFiles[0].path,
            metadata: {
              layer: 'worker',
              role: 'Asynchronous Job Processing & Background Workflows',
              functionalities: [
                'Queue Polling & Message Consumption',
                'Scheduled Task & Cron Job Execution',
                'Long-Running Compute & Media Transformation',
              ],
              associatedFiles: workerFiles.map((f) => f.path),
              complexity: 8,
            },
          });

          graphEdges.push({
            id: 'edge-gw-worker',
            analysisId,
            sourceId: apiGatewayId,
            targetId: workerId,
            type: 'CALLS',
            confidence: 'inferred',
          });
        }

        // Database Persistence
        const modelFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return (
            lower.includes('model') ||
            lower.includes('schema') ||
            lower.includes('entity') ||
            lower.includes('repository') ||
            lower.includes('/db') ||
            lower.includes('database') ||
            lower.includes('prisma')
          );
        });

        if (modelFiles.length > 0) {
          const dbNodeId = 'node-database-persistence';
          graphNodes.push({
            id: dbNodeId,
            type: 'database_table',
            name: 'Database Persistence Layer',
            path: modelFiles[0]?.path || 'src/db.js',
            metadata: {
              layer: 'database',
              role: 'Data Persistence & Entity Schema Store',
              functionalities: [
                'Entity Schemas, Relations & Indexes',
                'Atomic Database Transactions & Queries',
                'Pagination, Filtering & Aggregation Pipelines',
              ],
              associatedFiles: modelFiles.map((f) => f.path).slice(0, 20),
              complexity: 7,
            },
          });

          for (const sourceId of edgeSourcesFor(controllerNodeIds, apiGatewayId)) {
            graphEdges.push({
              id: `edge-${sourceId}-db`,
              analysisId,
              sourceId,
              targetId: dbNodeId,
              type: 'WRITES',
              confidence: 'static',
            });
          }
        }

        // In-Memory Cache & Message Broker
        const cacheFiles = filteredFiles.filter((f) => {
          const lower = f.path.toLowerCase();
          return lower.includes('redis') || lower.includes('cache') || lower.includes('memcached');
        });

        // Require a real import or dependency: a bare substring match pulled in
        // a phantom cache node whenever a changelog merely mentioned "redis".
        const usesCacheClient =
          declaredDeps.has('redis') ||
          declaredDeps.has('ioredis') ||
          declaredDeps.has('bullmq') ||
          declaredDeps.has('bull') ||
          filteredFiles.some((f) =>
            /(?:require\(|from\s+)['"](?:io)?redis['"]|new\s+Redis\s*\(/.test(f.content || '')
          );

        if (cacheFiles.length > 0 || usesCacheClient) {
          const cacheId = 'node-cache-store';
          graphNodes.push({
            id: cacheId,
            type: 'queue',
            name: 'In-Memory Cache & Message Broker',
            path: cacheFiles[0]?.path || 'src/redis.js',
            metadata: {
              layer: 'cache',
              role: 'High-Speed Query Cache & Pub/Sub Broker',
              functionalities: [
                'Sub-millisecond Key-Value Read/Write Cache',
                'Distributed Event Streaming & Rate Limit Windows',
              ],
              associatedFiles: cacheFiles.map((f) => f.path),
              complexity: 6,
            },
          });

          for (const sourceId of edgeSourcesFor(controllerNodeIds, apiGatewayId)) {
            graphEdges.push({
              id: `edge-${sourceId}-cache`,
              analysisId,
              sourceId,
              targetId: cacheId,
              type: 'READS',
              confidence: 'static',
            });
          }
        }
      }

      await sleep(150);

      // --------------------------------------------------------------------------
      // 6. Stage: UNIVERSAL DATA-DRIVEN PACKAGE DEPENDENCY GRAPH
      // --------------------------------------------------------------------------
      const depNodes: GraphNode[] = [];
      const depEdges: GraphEdge[] = [];

      const packageJsonFiles = filteredFiles.filter((f) => f.path.endsWith('package.json'));
      const allDepsMap = new Map<string, { version: string; importer: string }>();

      for (const pkgFile of packageJsonFiles) {
        if (pkgFile.content) {
          try {
            const parsed = JSON.parse(pkgFile.content);
            const deps = {
              ...(parsed.dependencies || {}),
              ...(parsed.devDependencies || {}),
              ...(parsed.peerDependencies || {}),
            };
            for (const [dep, ver] of Object.entries(deps)) {
              if (!allDepsMap.has(dep)) {
                allDepsMap.set(dep, {
                  version: String(ver),
                  importer: parsed.name || pkgFile.path,
                });
              }
            }
          } catch (e) {}
        }
      }

      const rootAppNodeId = 'dep-app-root';
      depNodes.push({
        id: rootAppNodeId,
        type: 'module',
        name: `${repo.name} Application Core`,
        path: packageJsonFiles[0]?.path || 'package.json',
        metadata: {
          layer: 'gateway',
          role: 'Primary Application Workspace Root',
        },
      });

      let depEdgeIdx = 1;
      for (const [depName, info] of Array.from(allDepsMap.entries()).slice(0, 25)) {
        const lower = depName.toLowerCase();
        let layer: string = 'service';
        let role = 'Application Library & Utility';

        if (lower.match(/express|fastify|koa|hono|nest|router|find-my-way|socket\.io|ws|tus|http|axios|fetch|got/)) {
          layer = 'gateway';
          role = 'Web Framework & Network Transport';
        } else if (lower.match(/mongoose|prisma|typeorm|sequelize|pg|mysql|sqlite|mongo|dynamo|orm|sql/)) {
          layer = 'database';
          role = 'Object Relational & Persistence Engine';
        } else if (lower.match(/redis|ioredis|memcached|cache|toad-cache|lru-cache|bull|bullmq|kafka|rabbitmq|amqp/)) {
          layer = 'cache';
          role = 'Distributed Cache & Message Queue';
        } else if (lower.match(/jwt|auth|bcrypt|passport|crypto|helmet|cors|shield|security/)) {
          layer = 'service';
          role = 'Security & Authentication Guard';
        } else if (lower.match(/ajv|zod|yup|validator|joi|fast-json-stringify|rfdc|secure-json-parse|serializer/)) {
          layer = 'service';
          role = 'Schema Validation & Serialization';
        } else if (lower.match(/pino|winston|morgan|log|telemetry|metric|prom|sentry/)) {
          layer = 'service';
          role = 'Structured Logging & Observability';
        } else if (lower.match(/ffmpeg|media|s3|sqs|aws-sdk|cloudinary|multer|sharp/)) {
          layer = 'worker';
          role = 'Media Processing & Cloud Storage';
        } else if (lower.match(/react|vue|svelte|next|nuxt|tailwind|css|styled/)) {
          layer = 'client';
          role = 'UI Runtime & Component Framework';
        } else if (lower.match(/babel|webpack|rollup|vite|esbuild|typescript|eslint|jest|vitest|autocannon/)) {
          layer = 'service';
          role = 'Build Tooling & Developer Environment';
        }

        const depId = `dep-pkg-${depName.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        depNodes.push({
          id: depId,
          type: layer === 'database' ? 'database_table' : layer === 'cache' ? 'queue' : 'symbol',
          name: `${depName} (${info.version})`,
          metadata: {
            layer,
            role,
          },
        });

        depEdges.push({
          id: `de-${depEdgeIdx++}`,
          analysisId,
          sourceId: rootAppNodeId,
          targetId: depId,
          type: 'IMPORTS',
          confidence: 'static',
        });
      }

      // 7. Stage: TECHNOLOGIES Stack Detection
      const allText = filteredFiles.map((f) => f.path + ' ' + (f.content || '')).join('\n');
      const technologies: Technology[] = [];


      if (hasDep('@nestjs/core', '@nestjs/common') || hasFile(/nest-cli\.json$/)) {
        technologies.push({
          id: 'tech-nestjs',
          analysisId,
          name: 'NestJS',
          category: 'backend',
          confidence: 1.0,
          evidence: ['apps/api/src/app.module.ts', '@Controller decorators'],
        });
      }
      if (hasDep('fastify') || /FastifyPluginAsync/.test(allText)) {
        technologies.push({
          id: 'tech-fastify',
          analysisId,
          name: 'Fastify',
          category: 'backend',
          confidence: 0.95,
          evidence: ['FastifyPluginAsync definitions'],
        });
      }
      if (hasDep('express')) {
        technologies.push({
          id: 'tech-express',
          analysisId,
          name: 'Express.js',
          category: 'backend',
          confidence: 0.9,
          evidence: ['Express routes & router definitions'],
        });
      }
      if (hasDep('react', 'next', 'react-dom')) {
        technologies.push({
          id: 'tech-react',
          analysisId,
          name: 'React & Next.js',
          category: 'frontend',
          confidence: 1.0,
          evidence: ['React hooks & Next.js App Router'],
        });
      }
      if (hasDep('typescript') || hasFile(/\.tsx?$/)) {
        technologies.push({
          id: 'tech-ts',
          analysisId,
          name: 'TypeScript',
          category: 'infra',
          confidence: 1.0,
          evidence: [`${filteredFiles.filter((f) => f.path.endsWith('.ts')).length} TypeScript files`],
        });
      }
      if (hasDep('prisma', '@prisma/client') || hasFile(/schema\.prisma$/)) {
        technologies.push({
          id: 'tech-prisma',
          analysisId,
          name: 'Prisma ORM',
          category: 'database',
          confidence: 0.95,
          evidence: ['schema.prisma database model definitions'],
        });
      }
      if (hasDep('pg', 'postgres', 'pg-promise') || /pgvector|postgresql:\/\//.test(allText)) {
        technologies.push({
          id: 'tech-pg',
          analysisId,
          name: 'PostgreSQL',
          category: 'database',
          confidence: 0.95,
          evidence: ['PostgreSQL & relational data persistence'],
        });
      }
      if (hasDep('redis', 'ioredis', 'bullmq', 'bull')) {
        technologies.push({
          id: 'tech-redis',
          analysisId,
          name: 'Redis & BullMQ',
          category: 'cache',
          confidence: 0.9,
          evidence: ['Redis client & BullMQ job queue'],
        });
      }
      if (hasDep('turbo') || hasFile(/^turbo\.json$/)) {
        technologies.push({
          id: 'tech-turbo',
          analysisId,
          name: 'Turborepo',
          category: 'infra',
          confidence: 1.0,
          evidence: ['turbo.json monorepo configuration'],
        });
      }

      // 8. Stage: FINALIZING & Persisting to Database Store
      this.emitProgress(analysisId, 'FINALIZING', 1.0, totalFiles, totalFiles, 'Persisting clean architectural model...');
      
      db.setAnalysisData(analysisId, {
        files: filteredFiles,
        symbols: allSymbols,
        routes: allRoutes,
        technologies,
        graphNodes,
        graphEdges,
        depNodes,
        depEdges,
      });

      await db.updateAnalysisProgress(analysisId, {
        stage: 'FINALIZING',
        progress: 1.0,
        processedFiles: totalFiles,
        totalFiles,
        status: 'COMPLETED',
      });
      await sleep(100);

      // 9. Stage: COMPLETED
      this.emitProgress(analysisId, 'COMPLETED', 1.0, totalFiles, totalFiles, 'Analysis complete!');
      console.log(`🎉 High-level architecture generated for ${repo.name}: ${filteredFiles.length} files, ${allSymbols.length} symbols, ${graphNodes.length} architecture nodes, ${graphEdges.length} edges!`);
    } catch (err: any) {
      console.error(`Analysis failed for ${analysisId}`, err);
      this.emitProgress(analysisId, 'FAILED', 1.0, 0, 0, err.message || 'Analysis failed');
      await db.updateAnalysisProgress(analysisId, {
        stage: 'FAILED',
        status: 'FAILED',
        error: err.message,
      });
    }
  }
}

export const ingestionPipeline = new IngestionPipeline();
