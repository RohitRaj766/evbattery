/**
 * types/index.ts
 * ─────────────
 * Shared TypeScript interfaces and type definitions used across the platform.
 */

import { Role } from '@prisma/client';
import { Request } from 'express';

// ─── Auth Types ───────────────────────────────────────────────────────────────

/** JWT payload embedded in access tokens */
export interface JwtPayload {
  sub: string;     // User ID
  email: string;
  role: Role;
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface User extends JwtPayload {
      id?: string;
    }
  }
}

/** Authenticated request — user injected by auth middleware */
export interface AuthRequest<
  P = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  user?: JwtPayload;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Telemetry Types ──────────────────────────────────────────────────────────

export interface TelemetryPayload {
  dockId: string;
  batteryId: string;
  voltage: number;
  current: number;
  temperature: number;
  soc: number;   // State of Charge %
  soh: number;   // State of Health %
}

// ─── Alarm Job Types ──────────────────────────────────────────────────────────

/** Data shape for jobs enqueued in the thermal alarm BullMQ queue */
export interface ThermalAlarmJobData {
  dockId: string;
  batteryId: string;
  temperature: number;
  stationId: string;
  timestamp: string; // ISO string
}

// ─── Swap Recommender ─────────────────────────────────────────────────────────

export interface SwapRecommendation {
  dockId: string;
  dockNumber: number;
  batteryId: string;
  serialNumber: string;
  soc: number;
  soh: number;
  temperature: number;
  estimatedRange: number; // km, calculated field
}

// ─── Passport User ────────────────────────────────────────────────────────────

export interface GoogleProfile {
  id: string;
  emails: Array<{ value: string }>;
  displayName: string;
  photos: Array<{ value: string }>;
}
