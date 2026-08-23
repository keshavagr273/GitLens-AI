import { create } from 'zustand';
import {
  Repository,
  RepositoryAnalysis,
  SourceFile,
  GraphNode,
  GraphEdge,
  ApiRoute,
  Technology,
  RequestFlowTrace,
  ChatMessage,
} from '@gitlens/shared-types';

interface WorkspaceStore {
  // State
  repository: Repository | null;
  analysis: RepositoryAnalysis | null;
  files: SourceFile[];
  activeFile: SourceFile | null;
  highlightedLines: [number, number] | null;
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  selectedNode: GraphNode | null;
  routes: ApiRoute[];
  selectedRoute: ApiRoute | null;
  activeTrace: RequestFlowTrace | null;
  technologies: Technology[];
  messages: ChatMessage[];
  graphMode: 'architecture' | 'dependency' | 'flow';
  isSearching: boolean;
  searchQuery: string;

  // Actions
  setRepository: (repo: Repository, analysis: RepositoryAnalysis | null) => void;
  setFiles: (files: SourceFile[]) => void;
  setActiveFile: (file: SourceFile | null, lineRange?: [number, number] | null) => void;
  setGraphData: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  setSelectedNode: (node: GraphNode | null) => void;
  setRoutes: (routes: ApiRoute[]) => void;
  setSelectedRoute: (route: ApiRoute | null) => void;
  setActiveTrace: (trace: RequestFlowTrace | null) => void;
  setTechnologies: (techs: Technology[]) => void;
  setGraphMode: (mode: 'architecture' | 'dependency' | 'flow') => void;
  addMessage: (msg: ChatMessage) => void;
  setSearchQuery: (query: string) => void;
  setIsSearching: (val: boolean) => void;
}

export const useWorkspaceStore = create<WorkspaceStore>((set) => ({
  repository: null,
  analysis: null,
  files: [],
  activeFile: null,
  highlightedLines: null,
  graphNodes: [],
  graphEdges: [],
  selectedNode: null,
  routes: [],
  selectedRoute: null,
  activeTrace: null,
  technologies: [],
  messages: [
    {
      id: 'welcome-msg',
      sessionId: 'default',
      role: 'assistant',
      content:
        '👋 Welcome to **GitLens AI**! I have indexed the AST symbols, dependency graphs, API routes, and database models for this repository. Ask me any question, click a component node in the canvas, or trace an API endpoint.',
      createdAt: new Date().toISOString(),
    },
  ],
  graphMode: 'architecture',
  isSearching: false,
  searchQuery: '',

  setRepository: (repository, analysis) => set({ repository, analysis }),
  setFiles: (files) => set({ files }),
  setActiveFile: (activeFile, highlightedLines = null) => set({ activeFile, highlightedLines }),
  setGraphData: (graphNodes, graphEdges) => set({ graphNodes, graphEdges }),
  setSelectedNode: (selectedNode) => set({ selectedNode }),
  setRoutes: (routes) => set({ routes }),
  setSelectedRoute: (selectedRoute) => set({ selectedRoute }),
  setActiveTrace: (activeTrace) => set({ activeTrace }),
  setTechnologies: (technologies) => set({ technologies }),
  setGraphMode: (graphMode) => set({ graphMode }),
  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsSearching: (isSearching) => set({ isSearching }),
}));
