/**
 * redis.config.ts
 * ───────────────
 * Exports two Redis clients:
 *  - `redisClient`  → General-purpose client (refresh token store, caching)
 *  - `bullRedis`    → Dedicated BullMQ connection (IORedis instance)
 *
 * Design Decision: BullMQ requires its own IORedis connection because it puts
 * the connection into blocking mode (BRPOP) which prevents regular commands
 * from being executed on the same socket.
 */

import Redis, { RedisOptions } from 'ioredis';
import { env } from './env.config';

const redisOptions: RedisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Required by BullMQ
  retryStrategy: (times: number) => {
    if (times > 10) {
      console.error('❌ Redis: Max retries reached. Giving up.');
      return null; // Stop retrying
    }
    const delay = Math.min(times * 500, 5000);
    console.warn(`⚠️  Redis: Retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
};

// General-purpose Redis client
export const redisClient = new Redis(redisOptions);

// Dedicated BullMQ connection - must NOT be shared with regular commands
export const bullRedis = new Redis(redisOptions);

redisClient.on('connect', () => console.log('✅ Redis: General client connected'));
redisClient.on('error', (err) => console.error('❌ Redis error:', err.message));

bullRedis.on('connect', () => console.log('✅ Redis: BullMQ client connected'));
bullRedis.on('error', (err) => console.error('❌ BullMQ Redis error:', err.message));

export default redisClient;
