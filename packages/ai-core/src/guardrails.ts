import { redactSecrets } from '@gitlens/utils';

export interface GuardrailCheckResult {
  isSafe: boolean;
  isOffTopic?: boolean;
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

const OFF_TOPIC_GENERIC_PATTERNS = [
  /\b(write|solve|implement|code)\s+(a\s+)?(program|code|algorithm|function)\s+(of|for|to)\s+(find(ing)?\s+cycle|reverse\s+(a\s+)?linked\s*list|two\s*sum|binary\s*search|fibonacci|bubble\s*sort|quick\s*sort|merge\s*sort|knapsack)\b/i,
  /\b(write|generate)\s+(a\s+)?(poem|story|essay|joke|song|recipe)\b/i,
  /\b(who\s+is\s+the\s+president|capital\s+of\s+[a-zA-Z]+|weather\s+in\s+[a-zA-Z]+)\b/i,
];

export function checkPromptSafety(prompt: string): GuardrailCheckResult {
  if (!prompt || typeof prompt !== 'string') {
    return { isSafe: true, isOffTopic: false, sanitizedPrompt: '', violations: [] };
  }

  const violations: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(prompt)) {
      violations.push(`Prompt contains forbidden injection pattern: ${pattern.toString()}`);
    }
  }

  let isOffTopic = false;
  for (const pattern of OFF_TOPIC_GENERIC_PATTERNS) {
    if (pattern.test(prompt)) {
      isOffTopic = true;
      break;
    }
  }

  const isSafe = violations.length === 0;
  // Redact any secrets entered in prompt before processing
  const sanitizedPrompt = redactSecrets(prompt.trim());

  return {
    isSafe,
    isOffTopic,
    sanitizedPrompt,
    violations,
  };
}

export function sanitizeAiOutput(output: string): string {
  if (!output) return '';
  // Redact any leaked secrets or credentials
  return redactSecrets(output);
}
