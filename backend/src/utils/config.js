import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z
    .union([z.string(), z.number()])
    .default('3001')
    .transform((val) => (typeof val === 'number' ? val : parseInt(String(val).trim(), 10))),
  JWT_SECRET: z
    .string()
    .trim()
    .min(16, 'JWT_SECRET must be at least 16 characters')
    .default('brandguard_dev_jwt_secret_2026_super_secure_key'),
  FRONTEND_URL: z.string().trim().default('http://localhost:5173'),
  GEMINI_API_KEY: z.string().trim().optional().default(''),
  GEMINI_MODEL: z.string().trim().default('gemini-1.5-flash'),
  AI_ENABLED: z
    .union([z.string(), z.boolean()])
    .default('true')
    .transform((val) => (typeof val === 'boolean' ? val : String(val).trim() === 'true' || String(val).trim() === '1')),
  REDACTION_ENABLED: z
    .union([z.string(), z.boolean()])
    .default('true')
    .transform((val) => (typeof val === 'boolean' ? val : String(val).trim() === 'true' || String(val).trim() === '1')),
  DEMO_MODE: z
    .union([z.string(), z.boolean()])
    .default('true')
    .transform((val) => (typeof val === 'boolean' ? val : String(val).trim() === 'true' || String(val).trim() === '1')),
  NODE_ENV: z.string().trim().default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
