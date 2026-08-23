import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default('0.0.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:3001'),

  DATABASE_URL: z
    .string()
    .default('postgresql://postgres:postgrespassword@localhost:5432/gitlens'),
  REDIS_URL: z.string().default('redis://localhost:6379'),

  GITHUB_TOKEN: z.string().optional().default(''),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),

  LLM_PROVIDER: z.enum(['openai', 'anthropic', 'gemini', 'groq', 'mock']).default('mock'),
  LLM_API_KEY: z.string().optional().default(''),
  EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  EMBEDDING_DIMENSION: z.coerce.number().default(1536),

  MAX_REPOSITORY_SIZE_MB: z.coerce.number().default(100),
  MAX_FILE_SIZE_KB: z.coerce.number().default(500),
  MAX_CONCURRENT_ANALYSES: z.coerce.number().default(4),
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
