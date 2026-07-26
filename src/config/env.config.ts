/**
 * env.config.ts
 * ─────────────
 * Single source of truth for all environment variables.
 * Zod validates & parses at startup so the app fails fast
 * with a descriptive error rather than silently using undefined values.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const EnvSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  API_BASE_URL: z.string().url().default('http://localhost:3000'),
  DEV_BASE_URL: z.string().url().default('http://localhost:3000'),
  PROD_BASE_URL: z.string().url().default('https://evbattery.onrender.com'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // Redis
  REDIS_URL: z.string().url().startsWith('redis', 'Must be a valid redis connection string'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Google OAuth2
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),

  // Thermal Safety
  THERMAL_RUNAWAY_THRESHOLD_CELSIUS: z.coerce.number().default(55),
  THERMAL_ALARM_DEBOUNCE_MS: z.coerce.number().default(3000),

  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

const _parsed = EnvSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(_parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = _parsed.data;

export type Env = z.infer<typeof EnvSchema>;
