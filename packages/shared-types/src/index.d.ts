export type AnalysisStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
export type SymbolKind = 'function' | 'class' | 'method' | 'interface' | 'type' | 'enum' | 'variable' | 'component';
export type EdgeType = 'IMPORTS' | 'EXPORTS' | 'CALLS' | 'EXTENDS' | 'IMPLEMENTS' | 'CONTAINS' | 'ROUTES_TO' | 'READS' | 'WRITES';
export type ConfidenceLevel = 'static' | 'inferred' | 'heuristic';
export type TechCategory = 'frontend' | 'backend' | 'database' | 'cache' | 'queue' | 'infra' | 'testing' | 'auth';
export type AnalysisStage = 'INIT' | 'FETCHING' | 'FILTERING' | 'PARSING' | 'GRAPH' | 'ROUTES' | 'DETECTION' | 'EMBEDDING' | 'FINALIZING' | 'COMPLETED' | 'FAILED';
export interface Repository {
    id: string;
    owner: string;
    name: string;
    githubUrl: string;
    defaultBranch: string;
    isPrivate: boolean;
    description: string | null;
    primaryLanguage: string | null;
    sizeKb: number;
    createdAt: string;
    updatedAt: string;
}
export interface AnalysisVersion {
    parser: string;
    detectors: string;
    embeddingModel: string;
    schemaVersion: number;
}
export interface RepositoryAnalysis {
    id: string;
    repositoryId: string;
    commitSha: string;
    status: AnalysisStatus;
    stage: AnalysisStage;
    progress: number;
    totalFiles: number;
    processedFiles: number;
    error?: string | null;
    analysisVersion: AnalysisVersion;
    startedAt: string | null;
    completedAt: string | null;
    createdAt: string;
}
export interface SourceFile {
    id: string;
    analysisId: string;
    path: string;
    language: string;
    sizeBytes: number;
    contentHash: string;
    isGenerated: boolean;
    importanceScore: number;
    content?: string;
    error?: string | null;
    createdAt: string;
}
export interface SymbolMetrics {
    cyclomaticComplexity: number;
    loc: number;
    parameterCount: number;
}
export interface SymbolNode {
    id: string;
    fileId: string;
    parentId?: string | null;
    name: string;
    kind: SymbolKind;
    startLine: number;
    endLine: number;
    startColumn: number;
    endColumn: number;
    signature?: string;
    metrics: SymbolMetrics;
    createdAt?: string;
}
export interface GraphNode {
    id: string;
    type: 'file' | 'symbol' | 'module' | 'route' | 'database_table' | 'queue' | 'cache' | 'infra';
    name: string;
    path?: string;
    kind?: string;
    metadata?: Record<string, unknown>;
}
export interface GraphEdge {
    id: string;
    analysisId: string;
    sourceId: string;
    targetId: string;
    type: EdgeType;
    confidence: ConfidenceLevel;
    metadata?: Record<string, unknown>;
}
export interface GraphPayload {
    repositoryId: string;
    analysisId: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    mode: 'architecture' | 'dependency' | 'flow';
}
export interface ApiRoute {
    id: string;
    analysisId: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    path: string;
    fileId: string;
    filePath?: string;
    handlerSymbolId?: string | null;
    handlerName?: string;
    startLine: number;
    middleware: string[];
}
export interface RequestFlowHop {
    id: string;
    nodeId: string;
    label: string;
    type: 'route' | 'controller' | 'service' | 'client' | 'repository' | 'database';
    file?: string;
    line?: number;
    confidence: ConfidenceLevel;
    confidenceScore: number;
    details?: string;
}
export interface RequestFlowTrace {
    routeId: string;
    method: string;
    path: string;
    hops: RequestFlowHop[];
}
export interface Technology {
    id: string;
    analysisId: string;
    name: string;
    category: TechCategory;
    confidence: number;
    evidence: string[];
}
export interface CodeChunk {
    id: string;
    analysisId: string;
    fileId: string;
    filePath: string;
    symbolId?: string | null;
    symbolName?: string;
    content: string;
    startLine: number;
    endLine: number;
    contentHash: string;
    score?: number;
}
export interface Citation {
    file: string;
    startLine: number;
    endLine: number;
    symbol?: string;
    reason?: string;
}
export interface ChatMessage {
    id: string;
    sessionId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    citations?: Citation[];
    createdAt: string;
}
export interface ChatSession {
    id: string;
    repositoryId: string;
    userId?: string | null;
    title: string;
    createdAt: string;
}
export interface AnalysisProgressEvent {
    analysisId: string;
    stage: AnalysisStage;
    progress: number;
    processedFiles: number;
    totalFiles: number;
    currentFile?: string;
    message: string;
    timestamp: string;
}
//# sourceMappingURL=index.d.ts.map