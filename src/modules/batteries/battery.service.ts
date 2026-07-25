/**
 * batteries/battery.service.ts
 * ─────────────────────────────
 * Battery fleet lifecycle management and SoH audit.
 * All database access goes through BatteryRepository.
 *
 * SoH Lifecycle Policy:
 * ─────────────────────
 * SoH >= 85%: HEALTHY       → Normal operation
 * 75% <= SoH < 85%: DEGRADED → Monitored, still in service
 * SoH < 75%: CRITICAL       → Blocked from swap; must be decommissioned
 * DECOMMISSIONED             → Permanently retired
 */

import { BatteryHealthState } from '@prisma/client';
import { AppError } from '../../middlewares/error.middleware';
import { CreateBatteryDto } from './battery.schema';
import { BatteryRepository } from './battery.repository';

/** Derive health state from SoH value */
const deriveHealthState = (soh: number): BatteryHealthState => {
  if (soh < 75) return BatteryHealthState.CRITICAL;
  if (soh < 85) return BatteryHealthState.DEGRADED;
  return BatteryHealthState.HEALTHY;
};

export const BatteryService = {
  /** List battery fleet with optional health state filter */
  async listBatteries(options: {
    healthState?: BatteryHealthState;
    page: number;
    limit: number;
  }) {
    const skip = (options.page - 1) * options.limit;
    const where = options.healthState ? { healthState: options.healthState } : {};

    const [batteries, total] = await Promise.all([
      BatteryRepository.findMany({ where, skip, take: options.limit }),
      BatteryRepository.count(where),
    ]);

    return {
      batteries,
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  },

  /** Register a new battery pack into the fleet */
  async createBattery(dto: CreateBatteryDto) {
    return BatteryRepository.create({
      serialNumber: dto.serialNumber,
      manufacturer: dto.manufacturer,
      modelName: dto.modelName,
      capacityKwh: dto.capacityKwh,
      soh: dto.soh ?? 100,
      healthState: deriveHealthState(dto.soh ?? 100),
      manufacturedAt: new Date(dto.manufacturedAt),
      notes: dto.notes ?? null,
    });
  },

  /** Get full battery lifecycle audit including swap history */
  async getBatteryById(id: string) {
    const battery = await BatteryRepository.findByIdWithAudit(id);
    if (!battery) throw new AppError(`Battery ${id} not found`, 404);
    return battery;
  },

  /**
   * Decommission a battery pack.
   * Atomically retires the battery and frees its dock (if installed).
   */
  async decommissionBattery(id: string, notes?: string) {
    const battery = await BatteryRepository.findByIdWithDock(id);

    if (!battery) throw new AppError(`Battery ${id} not found`, 404);

    if (battery.healthState === BatteryHealthState.DECOMMISSIONED) {
      throw new AppError('Battery is already decommissioned', 409);
    }

    const [updatedBattery] = await BatteryRepository.decommission(
      id,
      battery.dock?.id ?? null,
      notes ?? battery.notes ?? null
    );

    return updatedBattery;
  },
};
