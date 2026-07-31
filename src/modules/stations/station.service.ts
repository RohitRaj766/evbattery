/**
 * stations/station.service.ts
 * ────────────────────────────
 * Station management and Smart Swap Recommender algorithm.
 * All database access goes through StationRepository.
 *
 * Smart Swap Recommender Design:
 * ─────────────────────────────
 * Uses denormalized dock snapshot fields (currentSoC, currentSoH, currentTemp)
 * updated on every telemetry ingestion, so the swap query is an O(docks) flat
 * scan with a composite index — no correlated subquery on the telemetry table.
 */

import { AppError } from '../../middlewares/error.middleware';
import { getIO } from '../../socket/socket.server';
import { SocketEvent, SocketRoom } from '../../socket/socket.events';
import { SwapRecommendation } from '../../types';
import { CreateStationDto } from './station.schema';
import { StationRepository } from './station.repository';

const KM_PER_SOC_PERCENT = 1.2; // Rough range estimate for e-rickshaw

export const StationService = {
  /** List all active stations */
  async listStations() {
    return StationRepository.findAllActive();
  },

  /** Get nearest active station from driver's GPS location */
  async getNearestStation(latitude: number, longitude: number) {
    const stations = await StationRepository.findAllActive();
    if (stations.length === 0) return null;

    const toRad = (val: number) => (val * Math.PI) / 180;
    const R = 6371; // Earth radius in km

    const sorted = stations.map((st) => {
      const dLat = toRad(st.latitude - latitude);
      const dLng = toRad(st.longitude - longitude);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(latitude)) * Math.cos(toRad(st.latitude)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceKm = Math.round(R * c * 10) / 10;
      return { ...st, distanceKm };
    }).sort((a, b) => a.distanceKm - b.distanceKm);

    return sorted[0] || null;
  },

  /** Create a new swapping station (ADMIN only) */
  async createStation(dto: CreateStationDto) {
    return StationRepository.create(dto);
  },

  /** Get station with all docks and current battery info */
  async getStationById(id: string) {
    const station = await StationRepository.findByIdWithDocks(id);
    if (!station) throw new AppError(`Station ${id} not found`, 404);
    return station;
  },

  /** Create multiple docks for a station (ADMIN only) */
  async createDocks(stationId: string, dockNumbers: number[]) {
    const station = await StationRepository.findById(stationId);
    if (!station) throw new AppError(`Station ${stationId} not found`, 404);

    const existingDocks = await StationRepository.findExistingDocksByNumbers(stationId, dockNumbers);
    if (existingDocks.length > 0) {
      const nums = existingDocks.map(d => d.dockNumber).join(', ');
      throw new AppError(`Dock numbers already exist in this station: ${nums}`, 409);
    }

    return StationRepository.createDocks(stationId, dockNumbers);
  },

  /**
   * SMART SWAP RECOMMENDER
   * ──────────────────────
   * SELECT docks WHERE soc >= 95 AND temp <= 40 AND state = READY
   *   AND battery.healthState != DECOMMISSIONED
   * ORDER BY soh DESC
   * LIMIT 1
   */
  async recommendSwap(stationId: string): Promise<SwapRecommendation> {
    const station = await StationRepository.findById(stationId);
    if (!station) throw new AppError(`Station ${stationId} not found`, 404);
    if (!station.isActive) throw new AppError(`Station ${stationId} is not active`, 409);

    const candidates = await StationRepository.findSwapCandidates(stationId);

    if (candidates.length === 0) {
      const totalReady = await StationRepository.countReadyDocks(stationId);

      if (totalReady === 0) {
        throw new AppError(
          'No batteries are currently ready for swap at this station. All docks are charging or isolated.',
          409
        );
      }

      throw new AppError(
        'No batteries meet swap criteria (SoC ≥ 95% AND temperature ≤ 40°C). ' +
          'Please wait for batteries to finish charging or cool down.',
        404
      );
    }

    const best = candidates[0]!;
    const estimatedRange = Math.floor(best.currentSoC * KM_PER_SOC_PERCENT);

    return {
      dockId: best.id,
      dockNumber: best.dockNumber,
      batteryId: best.battery!.id,
      serialNumber: best.battery!.serialNumber,
      soc: best.currentSoC,
      soh: best.currentSoH,
      temperature: best.currentTemp,
      estimatedRange,
    };
  },

  /** Insert a battery into an empty dock (initial pairing) */
  async insertBattery(stationId: string, dockId: string, batteryId: string) {
    const dock = await StationRepository.findDockInStation(dockId, stationId);
    if (!dock) {
      throw new AppError(`Dock ${dockId} not found in station ${stationId}`, 404);
    }

    if (dock.batteryId) {
      throw new AppError(`Dock ${dockId} already has a battery installed`, 409);
    }

    if (dock.state === 'ISOLATED_CUTOFF') {
      throw new AppError(`Dock ${dockId} is isolated due to a thermal alarm. Cannot insert battery.`, 409);
    }

    const battery = await StationRepository.findBatteryById(batteryId);
    if (!battery) {
      throw new AppError(`Battery ${batteryId} not found`, 404);
    }

    if (battery.healthState === 'DECOMMISSIONED') {
      throw new AppError(`Cannot insert a decommissioned battery`, 409);
    }

    // Since batteryId is @unique in Prisma, if the battery is already in another dock, 
    // Prisma will automatically throw a P2002 unique constraint error. We can catch it or let the global error handler catch it.

    return StationRepository.insertBattery(dockId, batteryId);
  },

  /** Remove a battery from a dock */
  async removeBattery(stationId: string, dockId: string) {
    const dock = await StationRepository.findDockInStation(dockId, stationId);
    if (!dock) {
      throw new AppError(`Dock ${dockId} not found in station ${stationId}`, 404);
    }

    if (!dock.batteryId) {
      throw new AppError(`Dock ${dockId} is already empty`, 409);
    }

    if (dock.state === 'ISOLATED_CUTOFF') {
      throw new AppError(`Dock ${dockId} is isolated due to a thermal alarm. Resolve the alarm first.`, 409);
    }

    return StationRepository.removeBattery(dockId);
  },

  /** Manually isolate a dock (ADMIN override / maintenance) */
  async triggerDockCutoff(stationId: string, dockId: string, operatorId: string) {
    const dock = await StationRepository.findDockInStation(dockId, stationId);

    if (!dock) {
      throw new AppError(`Dock ${dockId} not found in station ${stationId}`, 404);
    }

    if (dock.state === 'ISOLATED_CUTOFF') {
      throw new AppError('Dock is already isolated', 409);
    }

    const [updated, alarm] = await Promise.all([
      StationRepository.isolateDock(dockId),
      StationRepository.createManualCutoffAlarm({
        dockId,
        batteryId: dock.batteryId,
        peakTemp: dock.currentTemp,
        operatorId,
      }),
    ]);

    try {
      const io = getIO();
      io.to(SocketRoom.station(stationId)).emit(SocketEvent.DOCK_POWER_CUTOFF, {
        dockId,
        dockNumber: dock.dockNumber,
        stationId,
        reason: 'MANUAL_CUTOFF',
        alarmId: alarm.id,
      });
    } catch { /* non-critical */ }

    return { dock: updated, alarm };
  },
};
