/**
 * database.config.ts
 * ──────────────────
 * Singleton Prisma Client instance.
 * Using a singleton prevents connection pool exhaustion in
 * serverless/hot-reload environments.
 */

import { PrismaClient } from '@prisma/client';
import { env } from './env.config';

// Extend NodeJS global to cache the Prisma client in development
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    errorFormat: 'pretty',
  });
};

// In development, reuse the global instance across hot-module reloads
export const prisma: PrismaClient =
  env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (global.__prisma ?? (global.__prisma = createPrismaClient()));

export default prisma;
