import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';

// Load .env from current directory or monorepo root
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '../../.env'),
  path.resolve(process.cwd(), '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
}

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:3001'),
  CORS_ORIGIN: z.string().default('*'),

  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgrespassword@localhost:5432/gitlens'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  GITHUB_API_URL: z.string().default('https://api.github.com'),
  GITHUB_TOKEN: z.string().optional().default(''),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),

  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'groq', 'mock']).default('groq'),
  LLM_API_KEY: z.string().optional().default(''),
  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),
  GROQ_BASE_URL: z.string().default('https://api.groq.com/openai/v1'),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSION: z.coerce.number().default(1536),

  MAX_REPOSITORY_SIZE_MB: z.coerce.number().default(100),
  MAX_FILE_SIZE_KB: z.coerce.number().default(500),
  MAX_CONCURRENT_ANALYSES: z.coerce.number().default(4),

  DOCKER_BUILD: z.string().optional().default(''),
});

export type AppConfig = z.infer<typeof envSchema>;

export function loadConfig(): AppConfig {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.warn('⚠️ Environment variable warning:', result.error.format());
  }
  return result.success ? result.data : envSchema.parse({});
}

export const config = loadConfig();
