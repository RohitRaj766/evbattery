/**
 * telemetry/telemetry.repository.ts
 * ───────────────────────────────────
 * Data access layer for the telemetry module.
 * Owns all Prisma queries against the Telemetry, Dock, and Battery models
 * within the context of telemetry ingestion and history retrieval.
 */

import { BatteryHealthState, DockState } from '@prisma/client';
import { prisma } from '../../config/database.config';

export const TelemetryRepository = {
  // ── Dock queries ───────────────────────────────────────────────────────────

  /** Find a dock by ID including station (needed for stationId + state check) */
  findDockById: (dockId: string) =>
    prisma.dock.findUnique({
      where: { id: dockId },
      include: { station: true },
    }),

  /**
   * Update the dock's denormalized telemetry snapshot.
   * These fields power the swap-recommender without joining the telemetry table.
   */
  updateDockSnapshot: (
    dockId: string,
    data: {
      currentSoC: number;
      currentSoH: number;
      currentTemp: number;
      lastTelemetryAt: Date;
      state?: DockState;
    }
  ) => prisma.dock.update({ where: { id: dockId }, data }),

  // ── Battery queries ────────────────────────────────────────────────────────

  /** Find a battery by ID (existence check during ingestion) */
  findBatteryById: (batteryId: string) =>
    prisma.battery.findUnique({ where: { id: batteryId } }),

  /** Update battery SoH and derived health state after new telemetry */
  updateBatteryHealth: (batteryId: string, soh: number, healthState: BatteryHealthState) =>
    prisma.battery.update({
      where: { id: batteryId },
      data: { soh, healthState },
    }),

  // ── Telemetry record queries ────────────────────────────────────────────────

  /** Persist a new telemetry reading */
  createRecord: (data: {
    dockId: string;
    batteryId: string;
    voltage: number;
    current: number;
    temperature: number;
    soc: number;
    soh: number;
  }) => prisma.telemetry.create({ data }),

  /** Get the latest telemetry record for a dock (used by alarm worker) */
  getLatestForDock: (dockId: string) =>
    prisma.telemetry.findFirst({
      where: { dockId },
      orderBy: { timestamp: 'desc' },
    }),

  /** Paginated time-series history for a battery */
  findHistory: (
    batteryId: string,
    options: { from?: Date; to?: Date; limit: number }
  ) => {
    const where = {
      batteryId,
      ...(options.from || options.to
        ? {
            timestamp: {
              ...(options.from ? { gte: options.from } : {}),
              ...(options.to ? { lte: options.to } : {}),
            },
          }
        : {}),
    };

    return Promise.all([
      prisma.telemetry.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: options.limit,
      }),
      prisma.telemetry.count({ where }),
    ]);
  },

  /** Aggregated stats for a battery within a time window (analytics) */
  getAggregates: (batteryId: string, fromDate: Date, toDate: Date) =>
    prisma.telemetry.aggregate({
      where: { batteryId, timestamp: { gte: fromDate, lte: toDate } },
      _avg: { temperature: true, soc: true, soh: true, voltage: true },
      _max: { temperature: true },
      _min: { temperature: true, soc: true },
      _count: { id: true },
    }),
};
