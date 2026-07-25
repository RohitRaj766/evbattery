/**
 * stations/station.repository.ts
 * ────────────────────────────────
 * Data access layer for the stations module.
 * Owns all Prisma queries for Station, Dock, and Alarm models
 * within station management and the Smart Swap Recommender algorithm.
 */

import { DockState, BatteryHealthState } from '@prisma/client';
import { prisma } from '../../config/database.config';

export const StationRepository = {
  // ── Station queries ────────────────────────────────────────────────────────

  /** List all active stations with aggregate dock and swap counts */
  findAllActive: () =>
    prisma.station.findMany({
      where: { isActive: true },
      include: { _count: { select: { docks: true, swaps: true } } },
      orderBy: { name: 'asc' },
    }),

  /** Create a new station */
  create: (data: {
    name: string;
    location: string;
    latitude: number;
    longitude: number;
    operatorId?: string | null;
  }) => prisma.station.create({ data }),

  /** Find a station by ID (basic — for existence + isActive check) */
  findById: (id: string) =>
    prisma.station.findUnique({ where: { id } }),

  /**
   * Find a station with all docks and their current battery snapshot.
   * Also returns the most recent non-resolved alarm per dock.
   */
  findByIdWithDocks: (id: string) =>
    prisma.station.findUnique({
      where: { id },
      include: {
        docks: {
          include: {
            battery: {
              select: {
                id: true,
                serialNumber: true,
                manufacturer: true,
                soh: true,
                healthState: true,
                cycleCount: true,
              },
            },
            alarms: {
              where: { status: { not: 'RESOLVED' } },
              take: 1,
              orderBy: { triggeredAt: 'desc' },
            },
          },
          orderBy: { dockNumber: 'asc' },
        },
      },
    }),

  // ── Dock queries ───────────────────────────────────────────────────────────

  /**
   * Smart Swap Recommender — find all docks in a station that meet
   * the battery distribution criteria. Sorted by SoH DESC.
   * Indexes: (stationId, state) composite + currentSoH sort.
   */
  findSwapCandidates: (stationId: string) =>
    prisma.dock.findMany({
      where: {
        stationId,
        state: DockState.READY,
        currentSoC: { gte: 95 },
        currentTemp: { lte: 40 },
        battery: { healthState: { not: BatteryHealthState.DECOMMISSIONED } },
      },
      include: {
        battery: {
          select: { id: true, serialNumber: true, soh: true, healthState: true },
        },
      },
      orderBy: { currentSoH: 'desc' },
    }),

  /** Count READY docks in a station (used to distinguish 404 vs 409 on swap) */
  countReadyDocks: (stationId: string) =>
    prisma.dock.count({ where: { stationId, state: DockState.READY } }),

  /** Find a specific dock within a station (validates ownership) */
  findDockInStation: (dockId: string, stationId: string) =>
    prisma.dock.findFirst({ where: { id: dockId, stationId } }),

  /** Isolate a dock (set to ISOLATED_CUTOFF) */
  isolateDock: (dockId: string) =>
    prisma.dock.update({
      where: { id: dockId },
      data: { state: DockState.ISOLATED_CUTOFF },
    }),

  // ── Alarm creation (for manual cutoff) ────────────────────────────────────

  /** Create a manual cutoff alarm record */
  createManualCutoffAlarm: (data: {
    dockId: string;
    batteryId: string | null;
    peakTemp: number;
    operatorId: string;
  }) =>
    prisma.alarm.create({
      data: {
        dockId: data.dockId,
        batteryId: data.batteryId,
        type: 'MANUAL_CUTOFF',
        status: 'ACTIVE',
        peakTemp: data.peakTemp,
        threshold: 0,
        resolvedBy: data.operatorId,
      },
    }),
};
