import * as crypto from 'crypto';

export interface ParsedGitHubUrl {
  owner: string;
  repo: string;
  normalizedUrl: string;
}

const FORBIDDEN_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
]);

export function validateAndParseGitHubUrl(rawUrl: string): ParsedGitHubUrl {
  if (!rawUrl || typeof rawUrl !== 'string') {
    throw new Error('Repository URL must be a non-empty string');
  }

  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error('Invalid URL format');
  }

  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS GitHub URLs are permitted');
  }

  const hostname = url.hostname.toLowerCase();
  if (FORBIDDEN_HOSTS.has(hostname) || hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
    throw new Error('Forbidden host address (SSRF protection)');
  }

  if (hostname !== 'github.com' && hostname !== 'www.github.com') {
    throw new Error('Repository domain must strictly be github.com');
  }

  const segments = url.pathname.split('/').filter(Boolean);
  if (segments.length < 2) {
    throw new Error('URL must match format https://github.com/:owner/:repo');
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/i, '');

  const SAFE_SLUG_RE = /^[a-zA-Z0-9_.-]+$/;
  if (!SAFE_SLUG_RE.test(owner) || !SAFE_SLUG_RE.test(repo)) {
    throw new Error('Invalid characters in repository owner or name');
  }

  return {
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

export function computeSha256(content: string | Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

export const sha256Hash = computeSha256;

export function generateUuid(): string {
  return crypto.randomUUID();
}

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/g,
  /ghp_[a-zA-Z0-9]{36}/g,
  /github_pat_[a-zA-Z0-9_]{82}/g,
  /eyJ[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*/g,
  /-----BEGIN [A-Z]+ PRIVATE KEY-----[\s\S]*?-----END [A-Z]+ PRIVATE KEY-----/g,
  /postgres:\/\/[^:]+:[^@]+@[^:]+:\d+\/[^\s]+/g,
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s]+/g,
];

export function redactSecrets(code: string): string {
  if (!code) return '';
  let sanitized = code;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }
  return sanitized;
}

export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;
  const frequencies: Record<string, number> = {};
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies[char] = (frequencies[char] || 0) + 1;
  }
  let entropy = 0;
  for (const char in frequencies) {
    const p = frequencies[char] / str.length;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
