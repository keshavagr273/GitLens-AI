export interface ParsedGitHubUrl {
    owner: string;
    repo: string;
    normalizedUrl: string;
}
export declare function validateAndParseGitHubUrl(rawUrl: string): ParsedGitHubUrl;
export declare function computeSha256(content: string | Buffer): string;
export declare function generateUuid(): string;
export declare function redactSecrets(code: string): string;
export declare function calculateShannonEntropy(str: string): number;
export declare function sleep(ms: number): Promise<void>;
//# sourceMappingURL=index.d.ts.map