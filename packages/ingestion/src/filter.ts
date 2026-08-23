import { calculateShannonEntropy } from '@gitlens/utils';
import { GitTreeEntry } from './github';

const EXCLUDED_EXTENSIONS = new Set([
  // Images / Media
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', '.avif',
  '.mp4', '.mov', '.avi', '.mp3', '.wav', '.ogg',
  // Fonts
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  // Binaries / Archives
  '.wasm', '.zip', '.tar', '.gz', '.bz2', '.7z', '.rar',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.iso',
  '.jar', '.war', '.ear', '.pyc', '.pyo', '.class',
  // Documents / Source Maps
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.map',
]);

const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'build',
  'out',
  '.next',
  '.git',
  '.github',
  '.circleci',
  '.claude',
  '.codesandbox',
  '.venv',
  'venv',
  'vendor',
  'coverage',
  '.nyc_output',
  '.turbo',
  '__pycache__',
  '.idea',
  '.vscode',
  '__tests__',
  '__fixtures__',
  'fixtures',
  'test',
  'tests',
  'e2e',
  'cypress',
  'playwright',
  'scripts',
  'benchmark',
  'benchmarks',
  'docs',
  'examples',
  'flow-typed',
  'compiler',
  'templates',
  '.changelog',
]);

const EXCLUDED_FILENAMES = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.env.test',
  '.env.staging',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'Cargo.lock',
  'go.sum',
  'composer.lock',
  'poetry.lock',
  'Pipfile.lock',
  'mix.lock',
]);

const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.mjs': 'javascript',
  '.cjs': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.java': 'java',
  '.rs': 'rust',
  '.rb': 'ruby',
  '.php': 'php',
  '.cpp': 'cpp',
  '.c': 'c',
  '.h': 'c',
  '.hpp': 'cpp',
  '.cs': 'csharp',
  '.prisma': 'prisma',
  '.sql': 'sql',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.md': 'markdown',
  '.toml': 'toml',
};

export interface FileFilterResult {
  process: boolean;
  language: string;
  isGenerated: boolean;
  reason?: string;
}

export function detectLanguage(filePath: string): string {
  const ext = getExtension(filePath);
  return EXTENSION_TO_LANGUAGE[ext] || 'plaintext';
}

export function getExtension(filePath: string): string {
  const lastDot = filePath.lastIndexOf('.');
  if (lastDot === -1) return '';
  return filePath.slice(lastDot).toLowerCase();
}

export function isMinifiedOrGenerated(content: string, path: string): boolean {
  // Check filename heuristics
  if (path.endsWith('.min.js') || path.endsWith('.min.css') || path.includes('.bundle.')) {
    return true;
  }

  // Check line length heuristic
  const lines = content.split('\n');
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].length > 1000) {
      return true;
    }
  }

  // Check Shannon entropy heuristic on first 2KB
  const sample = content.slice(0, 2048);
  const entropy = calculateShannonEntropy(sample);
  if (entropy > 5.2 && lines.length < 5) {
    return true;
  }

  return false;
}

export function shouldProcessFile(
  entry: GitTreeEntry,
  maxFileSizeBytes = 500 * 1024
): FileFilterResult {
  const path = entry.path;
  const segments = path.split('/');
  const filename = segments[segments.length - 1];

  // 1. Exclude vendor / build directories
  for (const seg of segments.slice(0, -1)) {
    if (EXCLUDED_DIRECTORIES.has(seg.toLowerCase())) {
      return { process: false, language: 'plaintext', isGenerated: false, reason: `Excluded directory: ${seg}` };
    }
  }

  // 2. Exclude lockfiles
  if (EXCLUDED_FILENAMES.has(filename.toLowerCase())) {
    return { process: false, language: 'plaintext', isGenerated: false, reason: 'Excluded lockfile' };
  }

  // 3. Exclude binary & media extensions
  const ext = getExtension(path);
  if (EXCLUDED_EXTENSIONS.has(ext)) {
    return { process: false, language: 'plaintext', isGenerated: false, reason: `Excluded binary extension: ${ext}` };
  }

  // 4. Exclude oversized files
  if (entry.size && entry.size > maxFileSizeBytes) {
    return {
      process: false,
      language: detectLanguage(path),
      isGenerated: false,
      reason: `File size ${entry.size} exceeds limit of ${maxFileSizeBytes} bytes`,
    };
  }

  const language = detectLanguage(path);
  const isGenerated = path.endsWith('.min.js') || path.includes('.generated.');

  return {
    process: true,
    language,
    isGenerated,
  };
}
