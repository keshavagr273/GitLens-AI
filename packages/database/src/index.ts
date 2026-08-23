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
} from '@gitlens/shared-types';
import { generateUuid } from '@gitlens/utils';
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
    return Array.from(this.repositories.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    const existing = await this.getRepositoryByUrl(data.githubUrl);
    if (existing) return existing;

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
    const byKey = this.analyses.get(`repo:${repositoryId}`);
    if (byKey) return byKey;

    for (const analysis of this.analyses.values()) {
      if (analysis.repositoryId === repositoryId) {
        return analysis;
      }
    }
    return null;
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
        embeddingModel: 'text-embedding-3-small',
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

  // --- Files & Symbols ---
  async getFilesForAnalysis(analysisId: string): Promise<SourceFile[]> {
    return this.files.get(analysisId) || this.files.get('analysis-fastify-001') || [];
  }

  async getFileById(analysisId: string, fileId: string): Promise<SourceFile | null> {
    const list = await this.getFilesForAnalysis(analysisId);
    return list.find((f) => f.id === fileId || f.path === fileId) || null;
  }

  async getSymbolsForAnalysis(analysisId: string): Promise<SymbolNode[]> {
    return this.symbols.get(analysisId) || this.symbols.get('analysis-fastify-001') || [];
  }

  // --- Graph ---
  async getGraphForAnalysis(
    analysisId: string,
    mode: 'architecture' | 'dependency' | 'flow' = 'architecture'
  ): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const nodes = this.graphNodes.get(analysisId) || this.graphNodes.get('analysis-fastify-001') || [];
    const edges = this.graphEdges.get(analysisId) || this.graphEdges.get('analysis-fastify-001') || [];
    return { nodes, edges };
  }

  // --- Routes & Traces ---
  async getRoutesForAnalysis(analysisId: string): Promise<ApiRoute[]> {
    return this.routes.get(analysisId) || this.routes.get('analysis-fastify-001') || [];
  }

  async getRequestFlowTrace(routeId: string): Promise<RequestFlowTrace | null> {
    return (
      this.traces.get(routeId) ||
      this.traces.get('route-post-orders') ||
      null
    );
  }

  // --- Technologies ---
  async getTechnologiesForAnalysis(analysisId: string): Promise<Technology[]> {
    return this.technologies.get(analysisId) || this.technologies.get('analysis-fastify-001') || [];
  }
}

export const db = new DatabaseStore();
