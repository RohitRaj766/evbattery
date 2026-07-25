/**
 * batteries/battery.repository.ts
 * ─────────────────────────────────
 * Data access layer for the batteries module.
 * Owns all Prisma queries for Battery and Dock models
 * within fleet management and SoH lifecycle operations.
 */

import { BatteryHealthState } from '@prisma/client';
import { prisma } from '../../config/database.config';

export const BatteryRepository = {
  // ── Read queries ───────────────────────────────────────────────────────────

  /** Paginated battery fleet list, sorted by SoH ascending (most degraded first) */
  findMany: (options: { where: object; skip: number; take: number }) =>
    prisma.battery.findMany({
      where: options.where,
      include: {
        dock: {
          select: {
            id: true,
            dockNumber: true,
            station: { select: { id: true, name: true } },
          },
        },
        _count: { select: { swaps: true, telemetry: true } },
      },
      orderBy: { soh: 'asc' },
      skip: options.skip,
      take: options.take,
    }),

  /** Total count matching a filter (for pagination meta) */
  count: (where: object) => prisma.battery.count({ where }),

  /** Find a battery by ID for validation (lightweight) */
  findById: (id: string) =>
    prisma.battery.findUnique({ where: { id } }),

  /** Find a battery by ID with its current dock (for decommission) */
  findByIdWithDock: (id: string) =>
    prisma.battery.findUnique({
      where: { id },
      include: { dock: true },
    }),

  /** Full lifecycle audit view — dock location + recent swap history */
  findByIdWithAudit: (id: string) =>
    prisma.battery.findUnique({
      where: { id },
      include: {
        dock: {
          include: { station: { select: { id: true, name: true, location: true } } },
        },
        swaps: {
          orderBy: { swappedAt: 'desc' },
          take: 20,
          include: {
            station: { select: { id: true, name: true } },
            operator: { select: { id: true, name: true } },
          },
        },
        _count: { select: { swaps: true, telemetry: true } },
      },
    }),

  /** Find batteries below SoH threshold that haven't been decommissioned yet */
  findCritical: (sohThreshold = 75) =>
    prisma.battery.findMany({
      where: {
        soh: { lt: sohThreshold },
        healthState: { not: BatteryHealthState.DECOMMISSIONED },
      },
      include: { dock: { include: { station: true } } },
    }),

  // ── Write queries ──────────────────────────────────────────────────────────

  /** Register a new battery into the fleet */
  create: (data: {
    serialNumber: string;
    manufacturer: string;
    modelName: string;
    capacityKwh: number;
    soh: number;
    healthState: BatteryHealthState;
    manufacturedAt: Date;
    notes?: string | null;
  }) => prisma.battery.create({ data }),

  /**
   * Atomically decommission a battery and free its dock (if installed).
   * Uses a Prisma interactive transaction to conditionally include the dock update.
   */
  decommission: (
    batteryId: string,
    dockId: string | null,
    notes: string | null
  ) =>
    prisma.$transaction([
      prisma.battery.update({
        where: { id: batteryId },
        data: {
          healthState: BatteryHealthState.DECOMMISSIONED,
          decommissionedAt: new Date(),
          ...(notes !== null ? { notes } : {}),
        },
      }),
      ...(dockId
        ? [
            prisma.dock.update({
              where: { id: dockId },
              data: {
                batteryId: null,
                state: 'AVAILABLE',
                currentSoC: 0,
                currentSoH: 0,
                currentTemp: 25,
              },
            }),
          ]
        : []),
    ]),
};
