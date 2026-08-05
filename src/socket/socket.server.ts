/**
 * socket.server.ts
 * ────────────────
 * Socket.io server initialization and room management.
 *
 * Design Decisions:
 * - Socket.io is attached to the existing HTTP server to share the same port.
 * - Rooms are organized by station ID so operators only receive events for
 *   their station. An 'admins' room receives ALL events across all stations.
 * - We export the `io` instance so any service layer can emit events without
 *   needing to import the HTTP server.
 */

import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { env } from '../config/env.config';
import { SocketEvent, SocketRoom } from './socket.events';

let io: SocketServer;

export const initializeSocket = (httpServer: HttpServer): SocketServer => {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Transport order: prefer WebSocket, fallback to polling
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Client joins a station-specific room to receive targeted events
    socket.on(SocketEvent.JOIN_STATION_ROOM, (stationId: string) => {
      const room = SocketRoom.station(stationId);
      void socket.join(room);
      console.log(`📡 Socket ${socket.id} joined room: ${room}`);
    });

    socket.on(SocketEvent.LEAVE_STATION_ROOM, (stationId: string) => {
      const room = SocketRoom.station(stationId);
      void socket.leave(room);
      console.log(`📡 Socket ${socket.id} left room: ${room}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} — ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`❌ Socket error (${socket.id}):`, err);
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
};

/** Get the initialized Socket.io server instance */
export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket() first.');
  }
  return io;
};
