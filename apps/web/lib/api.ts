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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchRepositories(): Promise<Repository[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/repositories`);
    if (!res.ok) throw new Error('Failed to fetch repositories');
    const data = await res.json();
    return data.repositories || [];
  } catch (err) {
    console.warn('API unavailable, returning default repositories');
    return [];
  }
}

export async function ingestRepository(url: string): Promise<{ repository: Repository; analysisId: string }> {
  const res = await fetch(`${API_BASE_URL}/api/repositories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to ingest repository');
  }
  return res.json();
}

export async function fetchRepositoryById(id: string): Promise<{ repository: Repository; latestAnalysis: RepositoryAnalysis | null }> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${id}`);
  if (!res.ok) throw new Error('Repository not found');
  return res.json();
}

export async function fetchFiles(repoId: string): Promise<SourceFile[]> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/files`);
  if (!res.ok) throw new Error('Failed to fetch files');
  const data = await res.json();
  return data.files || [];
}

export async function fetchFileContent(repoId: string, fileId: string): Promise<SourceFile> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/files/${encodeURIComponent(fileId)}`);
  if (!res.ok) throw new Error('Failed to fetch file content');
  const data = await res.json();
  return data.file;
}

export async function fetchSymbols(repoId: string): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/symbols`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.symbols || [];
  } catch {
    return [];
  }
}

export async function fetchGraph(repoId: string, mode: string = 'architecture'): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/graph?mode=${mode}`);
  if (!res.ok) throw new Error('Failed to fetch graph');
  return res.json();
}

export async function fetchRoutes(repoId: string): Promise<ApiRoute[]> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/routes`);
  if (!res.ok) throw new Error('Failed to fetch routes');
  const data = await res.json();
  return data.routes || [];
}

export async function traceRequestFlow(repoId: string, routeId?: string): Promise<RequestFlowTrace> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/trace`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routeId }),
  });
  if (!res.ok) throw new Error('Failed to trace request flow');
  const data = await res.json();
  return data.trace;
}

export async function fetchTechnologies(repoId: string): Promise<Technology[]> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/technologies`);
  if (!res.ok) throw new Error('Failed to fetch technologies');
  const data = await res.json();
  return data.technologies || [];
}

export async function sendChatMessage(repoId: string, message: string): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error('Chat failed');
  return res.json();
}

export async function searchCodebase(repoId: string, query: string, topK = 5): Promise<any[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, topK }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.results || [];
  } catch {
    return [];
  }
}

export async function deleteRepository(repoId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/repositories/${repoId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch {
    return false;
  }
}

