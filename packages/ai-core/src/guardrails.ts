import { redactSecrets } from '@gitlens/utils';

export interface GuardrailCheckResult {
  isSafe: boolean;
  sanitizedPrompt: string;
  violations: string[];
}

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /disregard\s+(all\s+)?(previous|prior)\s+instructions/i,
  /reveal\s+(the\s+)?(system|initial)\s+prompt/i,
  /what\s+are\s+your\s+system\s+instructions/i,
  /you\s+are\s+now\s+(an\s+)?unfiltered/i,
  /developer\s+mode\s+enabled/i,
  /DAN\s+mode/i,
  /system:\s*override/i,
];

export function checkPromptSafety(prompt: string): GuardrailCheckResult {
  if (!prompt || typeof prompt !== 'string') {
    return { isSafe: true, sanitizedPrompt: '', violations: [] };
  }

  const violations: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      violations.push(`Prompt contains forbidden injection pattern: ${pattern.toString()}`);
    }
  }

  const isSafe = violations.length === 0;
  // Redact any secrets entered in prompt before processing
  const sanitizedPrompt = redactSecrets(prompt.trim());

  return {
    isSafe,
    sanitizedPrompt,
    violations,
  };
}

export function sanitizeAiOutput(output: string): string {
  if (!output) return '';
  // Redact any leaked secrets or credentials
  return redactSecrets(output);
}
