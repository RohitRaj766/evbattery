/**
 * alarms/alarm.service.ts
 * ────────────────────────
 * Alarm state machine service.
 * All database access goes through AlarmRepository.
 *
 * State Transitions:
 * ACTIVE → SILENCED  (operator acknowledges, monitoring continues)
 * ACTIVE → RESOLVED  (temperature normalized, dock restored)
 * SILENCED → RESOLVED
 */

import { AlarmStatus } from '@prisma/client';
import { AppError } from '../../middlewares/error.middleware';
import { getIO } from '../../socket/socket.server';
import { SocketEvent, SocketRoom } from '../../socket/socket.events';
import { AlarmRepository } from './alarm.repository';

export const AlarmService = {
  /** List alarms with optional status filter and pagination */
  async listAlarms(options: {
    status?: AlarmStatus;
    page: number;
    limit: number;
  }) {
    const skip = (options.page - 1) * options.limit;
    const where = options.status ? { status: options.status } : {};

    const [alarms, total] = await Promise.all([
      AlarmRepository.findMany({ where, skip, take: options.limit }),
      AlarmRepository.count(where),
    ]);

    return {
      alarms,
      meta: {
        total,
        page: options.page,
        limit: options.limit,
        totalPages: Math.ceil(total / options.limit),
      },
    };
  },

  /** Get a single alarm by ID */
  async getAlarmById(id: string) {
    const alarm = await AlarmRepository.findById(id);
    if (!alarm) throw new AppError(`Alarm ${id} not found`, 404);
    return alarm;
  },

  /** Silence an active alarm (operator acknowledgement) */
  async silenceAlarm(id: string, operatorId: string) {
    const alarm = await AlarmRepository.findByIdSimple(id);
    if (!alarm) throw new AppError(`Alarm ${id} not found`, 404);

    if (alarm.status !== AlarmStatus.ACTIVE) {
      throw new AppError(
        `Cannot silence alarm in ${alarm.status} state. Only ACTIVE alarms can be silenced.`,
        409
      );
    }

    const updated = await AlarmRepository.silence(id, operatorId);

    try {
      const io = getIO();
      io.to(SocketRoom.station(updated.dock.stationId)).emit(SocketEvent.ALARM_SILENCED, {
        alarmId: id,
        dockId: updated.dockId,
        silencedAt: updated.silencedAt,
      });
    } catch { /* non-critical */ }

    return updated;
  },

  /**
   * Resolve an alarm — restores dock power.
   * Requires physical inspection before calling.
   */
  async resolveAlarm(id: string, operatorId: string, notes?: string) {
    const alarm = await AlarmRepository.findByIdWithDock(id);
    if (!alarm) throw new AppError(`Alarm ${id} not found`, 404);

    if (alarm.status === AlarmStatus.RESOLVED) {
      throw new AppError('Alarm is already resolved', 409);
    }

    const [updatedAlarm] = await AlarmRepository.resolveWithDockRestore(
      id,
      alarm.dockId,
      operatorId,
      !!alarm.dock.batteryId, // true → restore to CHARGING, false → AVAILABLE
      notes ?? alarm.notes
    );

    try {
      const io = getIO();
      const stationRoom = SocketRoom.station(alarm.dock.stationId);
      io.to(stationRoom).emit(SocketEvent.ALARM_RESOLVED, {
        alarmId: id,
        dockId: alarm.dockId,
        resolvedAt: updatedAlarm.resolvedAt,
      });
      io.to(stationRoom).emit(SocketEvent.DOCK_POWER_RESTORED, {
        dockId: alarm.dockId,
        dockNumber: alarm.dock.dockNumber,
        stationId: alarm.dock.stationId,
      });
    } catch { /* non-critical */ }

    return updatedAlarm;
  },
};
