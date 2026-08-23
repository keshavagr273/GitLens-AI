"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAndParseGitHubUrl = validateAndParseGitHubUrl;
exports.computeSha256 = computeSha256;
exports.generateUuid = generateUuid;
exports.redactSecrets = redactSecrets;
exports.calculateShannonEntropy = calculateShannonEntropy;
exports.sleep = sleep;
const crypto = __importStar(require("crypto"));
const FORBIDDEN_HOSTS = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '169.254.169.254',
    'metadata.google.internal',
]);
function validateAndParseGitHubUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') {
        throw new Error('Repository URL must be a non-empty string');
    }
    let url;
    try {
        url = new URL(rawUrl.trim());
    }
    catch {
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
function computeSha256(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
}
function generateUuid() {
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
function redactSecrets(code) {
    if (!code)
        return '';
    let sanitized = code;
    for (const pattern of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
    }
    return sanitized;
}
function calculateShannonEntropy(str) {
    if (!str || str.length === 0)
        return 0;
    const frequencies = {};
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
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=index.js.map