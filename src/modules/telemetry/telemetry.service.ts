/**
 * telemetry/telemetry.service.ts
 * ───────────────────────────────
 * Telemetry ingestion and time-series query service.
 * All database access goes through TelemetryRepository.
 *
 * Ingestion Pipeline:
 * 1. Validate dock exists and is not isolated.
 * 2. Validate battery exists.
 * 3. Persist telemetry record.
 * 4. Update dock snapshot (denormalized SoC/SoH/Temp for swap recommender).
 * 5. Update battery health state.
 * 6. Broadcast TELEMETRY_UPDATE via Socket.io.
 * 7. If temperature > threshold → enqueue 3-second debounced alarm job.
 */

import { BatteryHealthState, DockState } from '@prisma/client';
import { env } from '../../config/env.config';
import { AppError } from '../../middlewares/error.middleware';
import { getIO } from '../../socket/socket.server';
import { SocketEvent, SocketRoom } from '../../socket/socket.events';
import { enqueueThermalAlarm } from '../../jobs/alarm.queue';
import { IngestTelemetryDto } from './telemetry.schema';
import { TelemetryRepository } from './telemetry.repository';

const THERMAL_THRESHOLD = env.THERMAL_RUNAWAY_THRESHOLD_CELSIUS;
const DEBOUNCE_MS = env.THERMAL_ALARM_DEBOUNCE_MS;

/** Derive battery health state from SoH value */
const deriveHealthState = (soh: number): BatteryHealthState => {
  if (soh < 75) return BatteryHealthState.CRITICAL;
  if (soh < 85) return BatteryHealthState.DEGRADED;
  return BatteryHealthState.HEALTHY;
};

export const TelemetryService = {
  /** Ingest a single telemetry reading from a charging dock */
  async ingest(dto: IngestTelemetryDto) {
    // 1. Validate dock
    const dock = await TelemetryRepository.findDockById(dto.dockId);
    if (!dock) throw new AppError(`Dock ${dto.dockId} not found`, 404);

    if (dock.state === DockState.ISOLATED_CUTOFF) {
      throw new AppError(`Dock ${dto.dockId} is isolated. Telemetry rejected.`, 409);
    }

    // 2. Validate battery
    const battery = await TelemetryRepository.findBatteryById(dto.batteryId);
    if (!battery) throw new AppError(`Battery ${dto.batteryId} not found`, 404);

    // 3. Persist telemetry record
    const telemetry = await TelemetryRepository.createRecord({
      dockId: dto.dockId,
      batteryId: dto.batteryId,
      voltage: dto.voltage,
      current: dto.current,
      temperature: dto.temperature,
      soc: dto.soc,
      soh: dto.soh,
    });

    // 4. Update dock snapshot (drives swap recommender queries)
    const newDockState = dto.soc >= 95 ? DockState.READY : DockState.CHARGING;
    await TelemetryRepository.updateDockSnapshot(dto.dockId, {
      currentSoC: dto.soc,
      currentSoH: dto.soh,
      currentTemp: dto.temperature,
      lastTelemetryAt: telemetry.timestamp,
      ...(dock.state === DockState.CHARGING || dock.state === DockState.READY
        ? { state: newDockState }
        : {}),
    });

    // 5. Update battery SoH and health state
    await TelemetryRepository.updateBatteryHealth(
      dto.batteryId,
      dto.soh,
      deriveHealthState(dto.soh)
    );

    // 6. Broadcast telemetry update via Socket.io (non-critical)
    try {
      const io = getIO();
      io.to(SocketRoom.station(dock.stationId)).emit(SocketEvent.TELEMETRY_UPDATE, {
        stationId: dock.stationId,
        ...dto,
        timestamp: telemetry.timestamp,
      });
    } catch { /* non-critical */ }

    // 7. Thermal runaway detection — 3-second debounced job
    if (dto.temperature > THERMAL_THRESHOLD) {
      await enqueueThermalAlarm(
        {
          dockId: dto.dockId,
          batteryId: dto.batteryId,
          temperature: dto.temperature,
          stationId: dock.stationId,
          timestamp: telemetry.timestamp.toISOString(),
        },
        DEBOUNCE_MS
      );
    }

    return telemetry;
  },

  /** Get historical telemetry for a battery (time-series query) */
  async getHistory(
    batteryId: string,
    options: { from?: string; to?: string; limit: number }
  ) {
    const battery = await TelemetryRepository.findBatteryById(batteryId);
    if (!battery) throw new AppError(`Battery ${batteryId} not found`, 404);

    const [records, total] = await TelemetryRepository.findHistory(batteryId, {
      from: options.from ? new Date(options.from) : undefined,
      to: options.to ? new Date(options.to) : undefined,
      limit: options.limit,
    });

    return { records, total, battery };
  },
};
