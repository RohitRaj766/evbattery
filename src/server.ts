/**
 * server.ts
 * ─────────
 * Application bootstrap: starts HTTP server, Socket.io, database
 * connection, and BullMQ workers.
 *
 * Startup Order:
 * 1. Create Express app
 * 2. Create HTTP server (wrapping Express)
 * 3. Attach Socket.io to HTTP server
 * 4. Test database connectivity (Prisma)
 * 5. Start BullMQ alarm worker
 * 6. Start HTTP server
 *
 * Shutdown:
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Waits for in-flight requests to complete (via server.close())
 * - Closes Prisma + Redis connections
 */

import http from 'http';
import createApp from './app';
import { initializeSocket } from './socket/socket.server';
import { prisma } from './config/database.config';
import { redisClient, bullRedis } from './config/redis.config';
import { startAlarmWorker } from './jobs/alarm.worker';
import { env } from './config/env.config';

const bootstrap = async (): Promise<void> => {
  // ── 1. Express App ──────────────────────────────────────────────────────
  const app = createApp();

  // ── 2. HTTP Server ──────────────────────────────────────────────────────
  const httpServer = http.createServer(app);

  // ── 3. Socket.io ────────────────────────────────────────────────────────
  initializeSocket(httpServer);

  // ── 4. Database Connectivity Check ──────────────────────────────────────
  try {
    await prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL:', err);
    process.exit(1);
  }

  // ── 5. BullMQ Alarm Worker ──────────────────────────────────────────────
  const alarmWorker = startAlarmWorker();

  // ── 6. Start HTTP Server ─────────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════===========╗
║    🔋 EV Battery Swapping & Thermal Safety Platform                 ║
╠═══════════════════════════════════════════════════════════===========╣
║  Environment : ${env.NODE_ENV.padEnd(43)}                            ║
║  HTTP Server : http://localhost:${env.PORT.toString().padEnd(28)}    ║
║  API Docs    : http://localhost:${env.PORT}/api-docs${' '.padEnd(18)}║
║  Socket.io   : ws://localhost:${env.PORT.toString().padEnd(29)}      ║
╚═══════════════════════════════════════════════════════════===========╝
    `);
  });

  // ── Graceful Shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n🛑 ${signal} received. Initiating graceful shutdown...`);

    // Stop accepting new connections
    httpServer.close(async () => {
      console.log('✅ HTTP server closed');
    });

    try {
      // Close BullMQ worker gracefully (finish current jobs)
      await alarmWorker.close();
      console.log('✅ BullMQ worker closed');

      // Disconnect Prisma
      await prisma.$disconnect();
      console.log('✅ Prisma disconnected');

      // Disconnect Redis clients
      await redisClient.quit();
      await bullRedis.quit();
      console.log('✅ Redis clients disconnected');

      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown) => {
    console.error('❌ Unhandled Promise Rejection:', reason);
    void shutdown('unhandledRejection');
  });

  process.on('uncaughtException', (err: Error) => {
    console.error('❌ Uncaught Exception:', err);
    void shutdown('uncaughtException');
  });
};

bootstrap().catch((err) => {
  console.error('❌ Bootstrap failed:', err);
  process.exit(1);
});
