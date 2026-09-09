import {
  Repository,
  RepositoryAnalysis,
  SourceFile,
  SymbolNode,
  GraphNode,
  GraphEdge,
  ApiRoute,
  Technology,
  RequestFlowTrace,
  AnalysisStage,
  CodeChunk,
} from '@gitlens/shared-types';
import { generateUuid } from '@gitlens/utils';
import { config } from '@gitlens/config';
import {
  SEED_REPOSITORIES,
  SEED_ANALYSES,
  SEED_FILES,
  SEED_SYMBOLS,
  SEED_ROUTES,
  SEED_TECHNOLOGIES,
  SEED_GRAPH_NODES,
  SEED_GRAPH_EDGES,
  SEED_TRACES,
} from './mock-data';

export class DatabaseStore {
  private repositories: Map<string, Repository> = new Map();
  private analyses: Map<string, RepositoryAnalysis> = new Map();
  private files: Map<string, SourceFile[]> = new Map();
  private symbols: Map<string, SymbolNode[]> = new Map();
  private routes: Map<string, ApiRoute[]> = new Map();
  private technologies: Map<string, Technology[]> = new Map();
  private graphNodes: Map<string, GraphNode[]> = new Map();
  private graphEdges: Map<string, GraphEdge[]> = new Map();
  private depNodes: Map<string, GraphNode[]> = new Map();
  private depEdges: Map<string, GraphEdge[]> = new Map();
  private traces: Map<string, RequestFlowTrace> = new Map();

  constructor() {
    this.seed();
  }

  private seed() {
    for (const repo of SEED_REPOSITORIES) {
      this.repositories.set(repo.id, repo);
    }
    for (const [key, analysis] of Object.entries(SEED_ANALYSES)) {
      this.analyses.set(analysis.id, analysis);
      this.analyses.set(`repo:${analysis.repositoryId}`, analysis);
    }
    for (const [analysisId, files] of Object.entries(SEED_FILES)) {
      this.files.set(analysisId, files);
    }
    for (const [analysisId, symbols] of Object.entries(SEED_SYMBOLS)) {
      this.symbols.set(analysisId, symbols);
    }
    for (const [analysisId, routes] of Object.entries(SEED_ROUTES)) {
      this.routes.set(analysisId, routes);
    }
    for (const [analysisId, techs] of Object.entries(SEED_TECHNOLOGIES)) {
      this.technologies.set(analysisId, techs);
    }
    for (const [analysisId, nodes] of Object.entries(SEED_GRAPH_NODES)) {
      this.graphNodes.set(analysisId, nodes);
    }
    for (const [analysisId, edges] of Object.entries(SEED_GRAPH_EDGES)) {
      this.graphEdges.set(analysisId, edges);
    }
    for (const [routeId, trace] of Object.entries(SEED_TRACES)) {
      this.traces.set(routeId, trace);
    }
  }

  // --- Repositories ---
  async getAllRepositories(): Promise<Repository[]> {
    const list = Array.from(this.repositories.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const seen = new Set<string>();
    const deduplicated: Repository[] = [];
    for (const repo of list) {
      const key = `${repo.owner.toLowerCase()}/${repo.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(repo);
      }
    }
    return deduplicated;
  }

  async deleteRepository(id: string): Promise<boolean> {
    const repo = this.repositories.get(id);
    if (!repo) {
      // Try to find by matching owner/name
      for (const [key, r] of this.repositories.entries()) {
        if (r.id === id || `${r.owner}/${r.name}` === id) {
          this.repositories.delete(key);
          return true;
        }
      }
      return false;
    }
    this.repositories.delete(id);
    return true;
  }

  async getRepositoryById(id: string): Promise<Repository | null> {
    return this.repositories.get(id) || null;
  }

  async getRepositoryByUrl(url: string): Promise<Repository | null> {
    for (const repo of this.repositories.values()) {
      if (repo.githubUrl.toLowerCase() === url.toLowerCase()) {
        return repo;
      }
    }
    return null;
  }

  async createRepository(data: {
    owner: string;
    name: string;
    githubUrl: string;
    defaultBranch?: string;
    description?: string;
    primaryLanguage?: string;
    sizeKb?: number;
  }): Promise<Repository> {
    const id = `repo-${data.owner}-${data.name}-${generateUuid().slice(0, 6)}`;
    const repo: Repository = {
      id,
      owner: data.owner,
      name: data.name,
      githubUrl: data.githubUrl,
      defaultBranch: data.defaultBranch || 'main',
      isPrivate: false,
      description: data.description || `Repository imported from ${data.githubUrl}`,
      primaryLanguage: data.primaryLanguage || 'TypeScript',
      sizeKb: data.sizeKb || 1024,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.repositories.set(id, repo);
    return repo;
  }

  // --- Analyses ---
  async getAnalysisById(id: string): Promise<RepositoryAnalysis | null> {
    return this.analyses.get(id) || null;
  }

  async getLatestAnalysisForRepo(repositoryId: string): Promise<RepositoryAnalysis | null> {
    const matches: RepositoryAnalysis[] = [];
    for (const analysis of this.analyses.values()) {
      if (analysis.repositoryId === repositoryId) {
        matches.push(analysis);
      }
    }
    if (matches.length > 0) {
      return matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    }
    return this.analyses.get(`repo:${repositoryId}`) || null;
  }

  async createAnalysis(repositoryId: string, commitSha = 'HEAD'): Promise<RepositoryAnalysis> {
    const id = `analysis-${generateUuid().slice(0, 8)}`;
    const analysis: RepositoryAnalysis = {
      id,
      repositoryId,
      commitSha: commitSha.slice(0, 12),
      status: 'QUEUED',
      stage: 'INIT',
      progress: 0.0,
      totalFiles: 0,
      processedFiles: 0,
      error: null,
      analysisVersion: {
        parser: '1.3.0',
        detectors: '1.1.0',
        embeddingModel: config.EMBEDDING_MODEL || 'text-embedding-3-small',
        schemaVersion: 4,
      },
      startedAt: new Date().toISOString(),
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    this.analyses.set(id, analysis);
    this.analyses.set(`repo:${repositoryId}`, analysis);
    return analysis;
  }

  async updateAnalysisProgress(
    id: string,
    update: {
      stage?: AnalysisStage;
      progress?: number;
      processedFiles?: number;
      totalFiles?: number;
      status?: RepositoryAnalysis['status'];
      error?: string | null;
    }
  ): Promise<RepositoryAnalysis | null> {
    const analysis = this.analyses.get(id);
    if (!analysis) return null;

    if (update.stage) analysis.stage = update.stage;
    if (update.progress !== undefined) analysis.progress = update.progress;
    if (update.processedFiles !== undefined) analysis.processedFiles = update.processedFiles;
    if (update.totalFiles !== undefined) analysis.totalFiles = update.totalFiles;
    if (update.status) analysis.status = update.status;
    if (update.error !== undefined) analysis.error = update.error;
    if (analysis.status === 'COMPLETED' || analysis.status === 'FAILED') {
      analysis.completedAt = new Date().toISOString();
    }

    return analysis;
  }

  // --- Dynamic Storage ---
  setAnalysisData(
    analysisId: string,
    data: {
      files?: SourceFile[];
      symbols?: SymbolNode[];
      routes?: ApiRoute[];
      technologies?: Technology[];
      graphNodes?: GraphNode[];
      graphEdges?: GraphEdge[];
      depNodes?: GraphNode[];
      depEdges?: GraphEdge[];
    }
  ) {
    if (data.files) this.files.set(analysisId, data.files);
    if (data.symbols) this.symbols.set(analysisId, data.symbols);
    if (data.routes) this.routes.set(analysisId, data.routes);
    if (data.technologies) this.technologies.set(analysisId, data.technologies);
    if (data.graphNodes) this.graphNodes.set(analysisId, data.graphNodes);
    if (data.graphEdges) this.graphEdges.set(analysisId, data.graphEdges);
    if (data.depNodes) this.depNodes.set(analysisId, data.depNodes);
    if (data.depEdges) this.depEdges.set(analysisId, data.depEdges);
  }

  // --- Files & Symbols ---
  async getFilesForAnalysis(analysisId: string): Promise<SourceFile[]> {
    return this.files.get(analysisId) || (analysisId === 'analysis-fastify-001' ? this.files.get('analysis-fastify-001') || [] : []);
  }

  async getFileById(analysisId: string, fileId: string): Promise<SourceFile | null> {
    const list = await this.getFilesForAnalysis(analysisId);
    return list.find((f) => f.id === fileId || f.path === fileId) || null;
  }

  async getSymbolsForAnalysis(analysisId: string): Promise<SymbolNode[]> {
    return this.symbols.get(analysisId) || (analysisId === 'analysis-fastify-001' ? this.symbols.get('analysis-fastify-001') || [] : []);
  }

  // --- Graph ---
  async getGraphForAnalysis(
    analysisId: string,
    mode: 'architecture' | 'dependency' | 'flow' = 'architecture'
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    if (mode === 'dependency') {
      const depN = this.depNodes.get(analysisId);
      const depE = this.depEdges.get(analysisId);
      if (depN && depN.length > 0) {
        return { nodes: depN, edges: depE || [] };
      }
    }
    const nodes = this.graphNodes.get(analysisId) || (analysisId === 'analysis-fastify-001' ? this.graphNodes.get('analysis-fastify-001') || [] : []);
    const edges = this.graphEdges.get(analysisId) || (analysisId === 'analysis-fastify-001' ? this.graphEdges.get('analysis-fastify-001') || [] : []);
    return { nodes, edges };
  }

  // --- Routes & Traces ---
  async getRoutesForAnalysis(analysisId: string): Promise<ApiRoute[]> {
    return this.routes.get(analysisId) || (analysisId === 'analysis-fastify-001' ? this.routes.get('analysis-fastify-001') || [] : []);
  }

  async getRequestFlowTrace(routeId: string): Promise<RequestFlowTrace | null> {
    return this.traces.get(routeId) || (routeId === 'route-post-orders' ? this.traces.get('route-post-orders') || null : null);
  }

  // --- Technologies ---
  async getTechnologiesForAnalysis(analysisId: string): Promise<Technology[]> {
    return this.technologies.get(analysisId) || (analysisId === 'analysis-fastify-001' ? this.technologies.get('analysis-fastify-001') || [] : []);
  }

  // --- Chunks ---
  async getChunksForAnalysis(analysisId: string): Promise<CodeChunk[]> {
    const files = await this.getFilesForAnalysis(analysisId);
    const symbols = await this.getSymbolsForAnalysis(analysisId);
    const chunks: CodeChunk[] = [];

    for (const f of files) {
      const content = f.content || '';
      const fileSyms = symbols.filter((s) => s.fileId === f.id);
      if (fileSyms.length > 0) {
        for (const s of fileSyms) {
          chunks.push({
            id: `chunk-${f.id}-${s.id}`,
            analysisId,
            fileId: f.id,
            filePath: f.path,
            symbolId: s.id,
            symbolName: s.name,
            content: `// File: ${f.path} | Symbol: ${s.name} (${s.kind})\n${content.slice(0, 500)}`,
            startLine: s.startLine,
            endLine: s.endLine,
            contentHash: f.contentHash,
          });
        }
      } else {
        chunks.push({
          id: `chunk-${f.id}-full`,
          analysisId,
          fileId: f.id,
          filePath: f.path,
          content: `// File: ${f.path}\n${content.slice(0, 500)}`,
          startLine: 1,
          endLine: Math.min(50, content.split('\n').length),
          contentHash: f.contentHash,
        });
      }
    }
    return chunks;
  }
}

export const db = new DatabaseStore();
