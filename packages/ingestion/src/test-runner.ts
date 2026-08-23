import { validateAndParseGitHubUrl, computeSha256, calculateShannonEntropy, redactSecrets } from '@gitlens/utils';
import { shouldProcessFile, isMinifiedOrGenerated, detectLanguage } from './filter';
import { GitTreeEntry } from './github';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${message}`);
    process.exit(1);
  }
  console.log(`✅ ${message}`);
}

console.log('🧪 Starting Phase 1 & Ingestion Quality Test Suite...\n');

// 1. URL & SSRF Validation Tests
console.log('--- CP-1.1: URL & SSRF Security Tests ---');

const validUrls = [
  'https://github.com/expressjs/express',
  'https://github.com/fastify/fastify.git',
  'https://github.com/facebook/react',
  'https://github.com/vercel/next.js',
  'https://www.github.com/nestjs/nest',
];

for (const url of validUrls) {
  const parsed = validateAndParseGitHubUrl(url);
  assert(parsed.owner.length > 0 && parsed.repo.length > 0, `Valid URL parsed correctly: ${url}`);
}

const invalidUrls = [
  'http://github.com/expressjs/express', // HTTP rejected
  'http://127.0.0.1/repo',               // SSRF localhost rejected
  'http://169.254.169.254/latest/meta',  // SSRF cloud metadata rejected
  'http://localhost:3000/foo/bar',       // SSRF loopback rejected
  'https://gitlab.com/owner/repo',       // Non-GitHub domain rejected
  'https://malicious-site.com/foo/bar',  // Malicious domain rejected
  'file:///etc/passwd',                  // File URI rejected
  'javascript:alert(1)',                 // Script URI rejected
  'https://github.com/',                 // Missing owner/repo
  'https://github.com/owner',            // Missing repo
];

for (const url of invalidUrls) {
  let threw = false;
  try {
    validateAndParseGitHubUrl(url);
  } catch {
    threw = true;
  }
  assert(threw, `Malicious or invalid URL rejected: ${url}`);
}

// 2. File Filtering & Binary Exclusion Tests
console.log('\n--- CP-1.3: File Filtering & Exclusion Tests ---');

const excludedFiles: GitTreeEntry[] = [
  { path: 'node_modules/express/index.js', mode: '100644', type: 'blob', sha: '1', size: 1000 },
  { path: 'dist/bundle.js', mode: '100644', type: 'blob', sha: '2', size: 1000 },
  { path: 'build/app.js', mode: '100644', type: 'blob', sha: '3', size: 1000 },
  { path: '.git/config', mode: '100644', type: 'blob', sha: '4', size: 1000 },
  { path: 'package-lock.json', mode: '100644', type: 'blob', sha: '5', size: 5000 },
  { path: 'yarn.lock', mode: '100644', type: 'blob', sha: '6', size: 5000 },
  { path: 'public/avatar.png', mode: '100644', type: 'blob', sha: '7', size: 2000 },
  { path: 'assets/logo.svg', mode: '100644', type: 'blob', sha: '8', size: 2000 },
  { path: 'core/engine.wasm', mode: '100644', type: 'blob', sha: '9', size: 2000 },
  { path: 'large-dump.sql', mode: '100644', type: 'blob', sha: '10', size: 600 * 1024 }, // > 500KB cap
];

for (const file of excludedFiles) {
  const result = shouldProcessFile(file);
  assert(!result.process, `Correctly excluded: ${file.path} (${result.reason})`);
}

const includedFiles: GitTreeEntry[] = [
  { path: 'src/server.ts', mode: '100644', type: 'blob', sha: '11', size: 1200 },
  { path: 'src/routes/auth.routes.ts', mode: '100644', type: 'blob', sha: '12', size: 1500 },
  { path: 'controllers/order.controller.js', mode: '100644', type: 'blob', sha: '13', size: 2000 },
  { path: 'prisma/schema.prisma', mode: '100644', type: 'blob', sha: '14', size: 800 },
  { path: 'lib/utils.py', mode: '100644', type: 'blob', sha: '15', size: 950 },
];

for (const file of includedFiles) {
  const result = shouldProcessFile(file);
  assert(result.process, `Correctly included source file: ${file.path} (${result.language})`);
}

// 3. Minification & Shannon Entropy Heuristics Tests
console.log('\n--- Minification & Entropy Tests ---');

const minifiedCode = 'var a=1;'.repeat(200); // One giant line
assert(isMinifiedOrGenerated(minifiedCode, 'bundle.js'), 'Detected minified single long line code');

const normalCode = `
import express from 'express';
export function start() {
  const app = express();
  return app;
}
`;
assert(!isMinifiedOrGenerated(normalCode, 'server.ts'), 'Normal code not flagged as minified');

// 4. SHA-256 Content Hash Stability
console.log('\n--- Content Hash Determinism Tests ---');
const sampleCode = 'export const API_VERSION = "v1.0.0";';
const hash1 = computeSha256(sampleCode);
const hash2 = computeSha256(sampleCode);
assert(hash1 === hash2, `Content hash is 100% deterministic: ${hash1}`);

// 5. Secret Redaction Tests
console.log('\n--- Secret Redaction Security Tests ---');
const codeWithSecrets = `
const awsKey = "AKIA1234567890ABCDEF";
const githubToken = "ghp_1234567890abcdefghijklmnopqrstuvwxyz";
const dbUrl = "postgres://admin:supersecret@db.prod.internal:5432/main";
`;
const redacted = redactSecrets(codeWithSecrets);
assert(!redacted.includes('AKIA1234567890ABCDEF'), 'AWS Access Key redacted');
assert(!redacted.includes('ghp_1234567890abcdefghijklmnopqrstuvwxyz'), 'GitHub PAT redacted');
assert(!redacted.includes('supersecret'), 'Database connection password redacted');
assert(redacted.includes('[REDACTED_SECRET]'), 'Placeholder inserted for redacted secrets');

console.log('\n🎉 ALL PHASE 1 & INGESTION UNIT TESTS PASSED CLEANLY!\n');
