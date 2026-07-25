/**
 * swaps/swap.service.ts
 * ─────────────────────
 * Battery swap transaction recording and audit log.
 * All database access goes through SwapRepository.
 *
 * Swap Transaction Flow:
 * 1. Validate outgoing battery is READY and distributable.
 * 2. Capture telemetry snapshot from dock for audit trail.
 * 3. Execute atomic transaction via SwapRepository.
 */

import { BatteryHealthState, DockState } from '@prisma/client';
import { AppError } from '../../middlewares/error.middleware';
import { CreateSwapDto } from './swap.schema';
import { SwapRepository } from './swap.repository';

export const SwapService = {
  /** Get paginated swap audit log */
  async listSwaps(options: {
    stationId?: string;
    driverPhone?: string;
    page: number;
    limit: number;
  }) {
    const skip = (options.page - 1) * options.limit;
    const where = {
      ...(options.stationId ? { stationId: options.stationId } : {}),
      ...(options.driverPhone ? { driverPhone: options.driverPhone } : {}),
    };

    const [swaps, total] = await Promise.all([
      SwapRepository.findMany({ where, skip, take: options.limit }),
      SwapRepository.count(where),
    ]);

    return {
      swaps,
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  },

  /** Record a battery swap transaction */
  async createSwap(dto: CreateSwapDto, operatorId?: string) {
    // Validate outgoing battery eligibility
    const outBattery = await SwapRepository.findBatteryWithDock(dto.batteryOutId);

    if (!outBattery) throw new AppError(`Battery ${dto.batteryOutId} not found`, 404);

    if (outBattery.healthState === BatteryHealthState.DECOMMISSIONED) {
      throw new AppError('Cannot distribute a decommissioned battery to a driver', 409);
    }

    if (outBattery.healthState === BatteryHealthState.CRITICAL) {
      throw new AppError('Cannot distribute a CRITICAL battery (SoH < 75%). Decommission first.', 409);
    }

    if (!outBattery.dock) {
      throw new AppError('Outgoing battery is not installed in any dock', 409);
    }

    if (outBattery.dock.state !== DockState.READY) {
      throw new AppError(
        `Outgoing battery dock is in ${outBattery.dock.state} state. Must be READY.`,
        409
      );
    }

    // Capture dock snapshot for audit trail
    const { currentSoC: socAtSwap, currentSoH: sohAtSwap, currentTemp: tempAtSwap } = outBattery.dock;

    // Execute atomic swap via repository
    return SwapRepository.createSwapTransaction({
      stationId: dto.stationId,
      batteryOutId: dto.batteryOutId,
      batteryInId: dto.batteryInId,
      driverPhone: dto.driverPhone,
      driverVehicleId: dto.driverVehicleId,
      socAtSwap,
      sohAtSwap,
      tempAtSwap,
      processedBy: operatorId,
      notes: dto.notes,
      outDockId: outBattery.dock.id,
      inBatterySoh: null,       // Will be looked up in transaction if batteryInId present
      inBatteryCurrentHealthState: null,
    });
  },
};
