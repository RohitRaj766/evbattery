/**
 * swaps/swap.repository.ts
 * ─────────────────────────
 * Data access layer for the swaps module.
 * Owns all Prisma queries for the Swap model and related Battery/Dock
 * mutations that occur atomically during a battery swap transaction.
 */

import { BatteryHealthState, DockState } from '@prisma/client';
import { prisma } from '../../config/database.config';

export const SwapRepository = {
  // ── Read queries ───────────────────────────────────────────────────────────

  /** Paginated swap audit log with station, battery, and operator info */
  findMany: (options: { where: object; skip: number; take: number }) =>
    prisma.swap.findMany({
      where: options.where,
      include: {
        station: { select: { id: true, name: true } },
        battery: { select: { id: true, serialNumber: true } },
        operator: { select: { id: true, name: true } },
      },
      orderBy: { swappedAt: 'desc' },
      skip: options.skip,
      take: options.take,
    }),

  /** Total swap count matching filter (for pagination meta) */
  count: (where: object) => prisma.swap.count({ where }),

  /**
   * Find an outgoing battery with its dock for pre-swap validation.
   * Checks: health state, dock presence, dock state.
   */
  findBatteryWithDock: (batteryId: string) =>
    prisma.battery.findUnique({
      where: { id: batteryId },
      include: { dock: true },
    }),

  // ── Write queries ──────────────────────────────────────────────────────────

  /**
   * Execute the full swap transaction atomically:
   * 1. Create swap audit record
   * 2. Free outgoing dock (AVAILABLE, nullify batteryId)
   * 3. Increment cycle count on outgoing battery
   * 4. Update incoming battery health state (if returned by driver)
   */
  createSwapTransaction: async (data: {
    stationId: string;
    batteryOutId: string;
    batteryInId?: string | null;
    driverPhone: string;
    driverVehicleId?: string | null;
    socAtSwap: number;
    sohAtSwap: number;
    tempAtSwap: number;
    processedBy?: string;
    notes?: string | null;
    outDockId: string;
    inBatterySoh?: number | null;
    inBatteryCurrentHealthState?: BatteryHealthState | null;
  }) => {
    return prisma.$transaction(async (tx) => {
      // 1. Create swap audit record
      const swapRecord = await tx.swap.create({
        data: {
          stationId: data.stationId,
          batteryOutId: data.batteryOutId,
          batteryInId: data.batteryInId,
          driverPhone: data.driverPhone,
          driverVehicleId: data.driverVehicleId,
          status: 'COMPLETED',
          socAtSwap: data.socAtSwap,
          sohAtSwap: data.sohAtSwap,
          tempAtSwap: data.tempAtSwap,
          processedBy: data.processedBy,
          notes: data.notes,
        },
      });

      // 2. Free the outgoing dock
      await tx.dock.update({
        where: { id: data.outDockId },
        data: {
          batteryId: null,
          state: DockState.AVAILABLE,
          currentSoC: 0,
          currentTemp: 25,
        },
      });

      // 3. Increment cycle count on outgoing battery
      await tx.battery.update({
        where: { id: data.batteryOutId },
        data: { cycleCount: { increment: 1 } },
      });

      // 4. Auto-flag incoming battery health (if driver returned one)
      if (data.batteryInId && data.inBatterySoh !== null && data.inBatterySoh !== undefined) {
        let newHealthState: BatteryHealthState =
          data.inBatteryCurrentHealthState ?? BatteryHealthState.HEALTHY;

        if (data.inBatterySoh < 75) newHealthState = BatteryHealthState.CRITICAL;
        else if (data.inBatterySoh < 85) newHealthState = BatteryHealthState.DEGRADED;

        await tx.battery.update({
          where: { id: data.batteryInId },
          data: { healthState: newHealthState },
        });
      }

      return swapRecord;
    });
  },
};
