import { sleep } from '@gitlens/utils';
import { config } from '@gitlens/config';

const REQUEST_TIMEOUT_MS = 20_000;
const RATE_LIMIT_MAX_WAIT_MS = 15_000;

export interface GitHubRepoMetadata {
  owner: string;
  name: string;
  defaultBranch: string;
  description: string | null;
  sizeKb: number;
  primaryLanguage: string;
  commitSha: string;
}

export interface GitTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree' | 'commit';
  sha: string;
  size?: number;
  url?: string;
}

export interface GitTreeResponse {
  sha: string;
  url: string;
  tree: GitTreeEntry[];
  truncated: boolean;
}

export class GitHubClient {
  private token?: string;
  private apiBase: string;
  /**
   * Set once the configured token is proven invalid (401 / 403 "Bad credentials").
   * GitHub serves public repositories anonymously at a lower rate limit, so a dead
   * token must never be the reason an analysis falls back to synthetic data.
   */
  private tokenRejected = false;

  constructor(token?: string, apiBase?: string) {
    this.token = token || config.GITHUB_TOKEN || process.env.GITHUB_TOKEN || undefined;
    this.apiBase = (apiBase || config.GITHUB_API_URL || process.env.GITHUB_API_URL || 'https://api.github.com').replace(/\/$/, '');
  }

  /** True when a usable (not yet rejected) token is configured. */
  private hasUsableToken(): boolean {
    return !this.tokenRejected && !!this.token && this.token.trim().length > 0;
  }

  /** Marks the configured token as unusable and logs once. */
  private rejectToken(context: string) {
    if (!this.tokenRejected) {
      this.tokenRejected = true;
      console.warn(
        `GITHUB_TOKEN rejected by GitHub (${context}). Continuing anonymously at the unauthenticated rate limit (60 req/h). Replace GITHUB_TOKEN to restore 5000 req/h.`
      );
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'GitLens-AI-Ingestion-Engine/1.0',
    };
    if (this.hasUsableToken()) {
      headers.Authorization = `Bearer ${this.token!.trim()}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, retries = 2): Promise<T> {
    const url = `${this.apiBase}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (err: any) {
      // Network-level failure (DNS, TLS, timeout) - worth retrying.
      if (retries > 0) {
        await sleep(1000);
        return this.request<T>(endpoint, retries - 1);
      }
      throw new Error(`GitHub API unreachable: ${err.message || err}`);
    }

    const remaining = response.headers.get('x-ratelimit-remaining');
    const resetTime = response.headers.get('x-ratelimit-reset');

    // A bad/expired token must degrade to anonymous access rather than failing
    // the whole analysis - public repositories are readable without auth.
    if (response.status === 401 && this.hasUsableToken()) {
      this.rejectToken('401 Bad credentials');
      return this.request<T>(endpoint, retries);
    }

    if (response.status === 403 || response.status === 429) {
      const body = await response.text().catch(() => '');
      // 403 with a live token can also mean the token itself is bad/revoked.
      if (this.hasUsableToken() && /bad credentials|requires authentication/i.test(body)) {
        this.rejectToken('403 Bad credentials');
        return this.request<T>(endpoint, retries);
      }

      // Genuine rate limiting: back off only if the window reopens soon.
      if (remaining === '0' && resetTime && retries > 0) {
        const waitMs = Math.max(1000, Number(resetTime) * 1000 - Date.now());
        if (waitMs < RATE_LIMIT_MAX_WAIT_MS) {
          console.warn(`GitHub rate limit hit. Backing off for ${Math.round(waitMs / 1000)}s...`);
          await sleep(waitMs);
          return this.request<T>(endpoint, retries - 1);
        }
      }
      throw new Error(
        `GitHub API rate limit reached (remaining: ${remaining ?? '0'}).` +
          (this.hasUsableToken() ? '' : ' Set a valid GITHUB_TOKEN to raise the limit to 5000 requests/hour.')
      );
    }

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const message = (errBody as any).message || `GitHub API request failed with status ${response.status}`;
      // 404/410 are definitive answers - retrying only wastes rate limit.
      if (response.status >= 500 && retries > 0) {
        await sleep(1000);
        return this.request<T>(endpoint, retries - 1);
      }
      throw new Error(message);
    }

    return (await response.json()) as T;
  }

  /**
   * Probes GitHub reachability and reports which credential mode is in effect.
   * Used by the readiness endpoint so a revoked token surfaces as a warning
   * instead of as an analysis full of missing files.
   */
  async checkAccess(): Promise<{ ok: boolean; authenticated: boolean; detail: string; rateRemaining?: number }> {
    try {
      const res = await fetch(`${this.apiBase}/rate_limit`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(8000),
      });

      if (res.status === 401) {
        this.rejectToken('401 during readiness probe');
        return {
          ok: false,
          authenticated: false,
          detail: 'GITHUB_TOKEN is invalid or revoked. Public repositories still work anonymously at 60 requests/hour.',
        };
      }

      if (!res.ok) {
        return { ok: false, authenticated: this.hasUsableToken(), detail: `GitHub returned HTTP ${res.status}.` };
      }

      const body = (await res.json()) as any;
      const remaining = body?.resources?.core?.remaining ?? body?.rate?.remaining;
      const authenticated = this.hasUsableToken();
      return {
        ok: true,
        authenticated,
        rateRemaining: typeof remaining === 'number' ? remaining : undefined,
        detail: authenticated
          ? `Authenticated. ${remaining} core requests remaining.`
          : `Anonymous access (60 req/h). ${remaining} requests remaining. Set GITHUB_TOKEN to raise the limit.`,
      };
    } catch (err: any) {
      return { ok: false, authenticated: false, detail: `GitHub unreachable: ${err.message || err}` };
    }
  }

  async fetchRepoMetadata(owner: string, repo: string): Promise<GitHubRepoMetadata> {
    try {
      const data = await this.request<any>(`/repos/${owner}/${repo}`);
      const branchData = await this.request<any>(`/repos/${owner}/${repo}/branches/${data.default_branch}`);

      return {
        owner: data.owner.login,
        name: data.name,
        defaultBranch: data.default_branch,
        description: data.description,
        sizeKb: data.size,
        primaryLanguage: data.language || 'TypeScript',
        commitSha: branchData.commit.sha,
      };
    } catch (err: any) {
      // Never fabricate metadata: a wrong commit SHA silently produces an
      // analysis of a repository that does not exist.
      throw new Error(
        `Unable to read ${owner}/${repo} from GitHub: ${err.message || err}. ` +
          'Check that the repository exists and is public, or configure a valid GITHUB_TOKEN.'
      );
    }
  }

  async fetchRecursiveTree(owner: string, repo: string, commitSha: string): Promise<GitTreeEntry[]> {
    try {
      const response = await this.request<GitTreeResponse>(
        `/repos/${owner}/${repo}/git/trees/${commitSha}?recursive=1`
      );

      if (response.truncated) {
        console.warn(`⚠️ GitHub tree truncated for ${owner}/${repo}. Initiating BFS directory fallback...`);
        return this.fetchTruncatedTreeFallback(owner, repo, response.sha, response.tree);
      }

      return response.tree.filter((entry) => entry.type === 'blob');
    } catch (err: any) {
      // Returning a synthetic file list here is what made failed fetches look
      // like successful analyses of an unrelated codebase.
      throw new Error(
        `Unable to list files for ${owner}/${repo}: ${err.message || err}.`
      );
    }
  }

  // Truncated tree fallback: breadth-first search of directory tree nodes
  async fetchTruncatedTreeFallback(
    owner: string,
    repo: string,
    rootSha: string,
    initialEntries: GitTreeEntry[]
  ): Promise<GitTreeEntry[]> {
    const allBlobs: GitTreeEntry[] = initialEntries.filter((e) => e.type === 'blob');
    const directoryQueue: Array<{ path: string; sha: string }> = initialEntries
      .filter((e) => e.type === 'tree')
      .map((e) => ({ path: e.path, sha: e.sha }));

    const visited = new Set<string>();

    while (directoryQueue.length > 0 && visited.size < 500) {
      const current = directoryQueue.shift()!;
      if (visited.has(current.sha)) continue;
      visited.add(current.sha);

      try {
        const subtree = await this.request<GitTreeResponse>(
          `/repos/${owner}/${repo}/git/trees/${current.sha}`
        );

        for (const item of subtree.tree) {
          const itemPath = current.path ? `${current.path}/${item.path}` : item.path;
          if (item.type === 'blob') {
            allBlobs.push({ ...item, path: itemPath });
          } else if (item.type === 'tree') {
            directoryQueue.push({ path: itemPath, sha: item.sha });
          }
        }
      } catch (err) {
        console.error(`Subtree fetch failed for ${current.path}`, err);
      }
    }

    return allBlobs;
  }

  async fetchBlobContent(owner: string, repo: string, branch: string, filePath: string): Promise<string> {
    try {
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const headers: Record<string, string> = {
        'User-Agent': 'GitLens-AI-Ingestion-Engine/1.0',
      };
      if (this.hasUsableToken()) {
        headers.Authorization = `Bearer ${this.token!.trim()}`;
      }

      const res = await fetch(rawUrl, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (res.status === 401 && this.hasUsableToken()) {
        this.rejectToken('401 on raw content');
        return this.fetchBlobContent(owner, repo, branch, filePath);
      }
      if (res.ok) {
        return await res.text();
      }

      // Fallback to GitHub contents API
      const apiData = await this.request<any>(`/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`);
      if (apiData && apiData.content && apiData.encoding === 'base64') {
        return Buffer.from(apiData.content, 'base64').toString('utf-8');
      }
      return '';
    } catch (err: any) {
      console.warn(`Failed to fetch blob for ${owner}/${repo}/${filePath}:`, err.message);
      return '';
    }
  }

  async fetchFilesBatch(
    owner: string,
    repo: string,
    branch: string,
    filePaths: string[],
    concurrency = 15,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const total = filePaths.length;
    let completed = 0;

    const queue = [...filePaths];
    const workers = Array.from({ length: Math.min(concurrency, total) }, async () => {
      while (queue.length > 0) {
        const filePath = queue.shift();
        if (!filePath) break;

        const content = await this.fetchBlobContent(owner, repo, branch, filePath);
        if (content) {
          results.set(filePath, content);
        }
        completed++;
        if (onProgress) onProgress(completed, total);
      }
    });

    await Promise.all(workers);
    return results;
  }

}

export const githubClient = new GitHubClient();
