/**
 * alarm.worker.ts
 * ───────────────
 * BullMQ Worker that processes thermal alarm evaluation jobs.
 *
 * Processing Logic (3-second debounce evaluation):
 * 1. Job arrives after 3-second delay (debounce window has passed).
 * 2. Fetch the LATEST telemetry for the dock from the database.
 * 3. If the temperature is STILL above the threshold → confirm alarm:
 *    a. Create an ACTIVE Alarm record in PostgreSQL.
 *    b. Update Dock state to ISOLATED_CUTOFF (power isolated).
 *    c. Update Battery healthState if SoH indicates degradation.
 *    d. Broadcast ALARM_TRIGGERED + DOCK_POWER_CUTOFF via Socket.io.
 * 4. If temperature has normalized → no action (false alarm, log only).
 *
 * This "check-after-delay" pattern prevents alarm fatigue from transient spikes.
 */

import { Worker, Job } from 'bullmq';
import { DockState, AlarmStatus, BatteryHealthState } from '@prisma/client';
import { bullRedis } from '../config/redis.config';
import { prisma } from '../config/database.config';
import { env } from '../config/env.config';
import { ALARM_QUEUE_NAME } from './alarm.queue';
import { getIO } from '../socket/socket.server';
import { SocketEvent, SocketRoom } from '../socket/socket.events';
import { ThermalAlarmJobData } from '../types';

const THERMAL_THRESHOLD = env.THERMAL_RUNAWAY_THRESHOLD_CELSIUS;

const processAlarmJob = async (job: Job<ThermalAlarmJobData>): Promise<void> => {
  const { dockId, batteryId, stationId, temperature: jobTemp } = job.data;

  console.log(
    `🔍 [AlarmWorker] Evaluating thermal job for dock ${dockId} ` +
    `(job temp: ${jobTemp}°C, threshold: ${THERMAL_THRESHOLD}°C)`
  );

  // ── Step 1: Fetch current dock state with latest telemetry snapshot ──────
  const dock = await prisma.dock.findUnique({
    where: { id: dockId },
    include: { station: true },
  });

  if (!dock) {
    console.warn(`[AlarmWorker] Dock ${dockId} not found — job may be stale`);
    return;
  }

  // ── Step 2: Check if dock is already isolated (another job beat us to it) ─
  if (dock.state === DockState.ISOLATED_CUTOFF) {
    console.info(`[AlarmWorker] Dock ${dockId} already isolated — skipping duplicate alarm`);
    return;
  }

  // ── Step 3: Re-evaluate current temperature (debounce check) ─────────────
  // We use the dock's cached currentTemp which was updated on the latest telemetry ingestion.
  // If the temperature has dropped below threshold, this was a transient spike.
  const currentTemp = dock.currentTemp;

  if (currentTemp <= THERMAL_THRESHOLD) {
    console.info(
      `[AlarmWorker] Dock ${dockId} temperature normalized (${currentTemp}°C) — no alarm triggered`
    );
    return;
  }

  console.warn(
    `🚨 [AlarmWorker] CONFIRMED THERMAL BREACH on dock ${dockId}: ${currentTemp}°C > ${THERMAL_THRESHOLD}°C`
  );

  // ── Step 4: Persist alarm + update dock + update battery in a transaction ─
  const result = await prisma.$transaction(async (tx) => {
    // 4a: Create the alarm record
    const alarm = await tx.alarm.create({
      data: {
        dockId,
        batteryId: batteryId || dock.batteryId,
        type: 'THERMAL_RUNAWAY',
        status: AlarmStatus.ACTIVE,
        peakTemp: currentTemp,
        threshold: THERMAL_THRESHOLD,
      },
    });

    // 4b: Isolate the dock - cut power to prevent thermal runaway spread
    await tx.dock.update({
      where: { id: dockId },
      data: { state: DockState.ISOLATED_CUTOFF },
    });

    // 4c: Update battery health state if it has degraded critically
    if (dock.batteryId) {
      const battery = await tx.battery.findUnique({ where: { id: dock.batteryId } });
      if (battery) {
        let newHealthState: BatteryHealthState = battery.healthState;
        if (battery.soh < 75) {
          newHealthState = BatteryHealthState.CRITICAL;
        } else if (battery.soh < 85) {
          newHealthState = BatteryHealthState.DEGRADED;
        }
        if (newHealthState !== battery.healthState) {
          await tx.battery.update({
            where: { id: dock.batteryId },
            data: { healthState: newHealthState },
          });
        }
      }
    }

    return alarm;
  });

  // ── Step 5: Broadcast real-time emergency events via Socket.io ────────────
  try {
    const io = getIO();
    const stationRoom = SocketRoom.station(stationId || dock.stationId);

    const alarmPayload = {
      alarmId: result.id,
      dockId,
      dockNumber: dock.dockNumber,
      stationId: dock.stationId,
      temperature: currentTemp,
      threshold: THERMAL_THRESHOLD,
      batteryId: dock.batteryId,
      triggeredAt: result.triggeredAt.toISOString(),
    };

    // Emit to the specific station room (operators at that station)
    io.to(stationRoom).emit(SocketEvent.ALARM_TRIGGERED, alarmPayload);
    io.to(stationRoom).emit(SocketEvent.DOCK_POWER_CUTOFF, {
      dockId,
      dockNumber: dock.dockNumber,
      stationId: dock.stationId,
      reason: 'THERMAL_RUNAWAY',
      alarmId: result.id,
    });

    // Also emit to global admin room
    io.to(SocketRoom.admins).emit(SocketEvent.ALARM_TRIGGERED, alarmPayload);
    io.to(SocketRoom.admins).emit(SocketEvent.DOCK_POWER_CUTOFF, {
      dockId,
      dockNumber: dock.dockNumber,
      stationId: dock.stationId,
      reason: 'THERMAL_RUNAWAY',
      alarmId: result.id,
    });

    console.log(`📡 [AlarmWorker] Socket events emitted to room: ${stationRoom}`);
  } catch (socketErr) {
    // Socket emission failure should NOT fail the job - alarm is already persisted
    console.error('[AlarmWorker] Failed to emit socket event:', socketErr);
  }

  console.log(`✅ [AlarmWorker] Alarm ${result.id} created, dock ${dockId} ISOLATED_CUTOFF`);
};

/** Initialize and export the BullMQ worker */
export const startAlarmWorker = (): Worker<ThermalAlarmJobData> => {
  const worker = new Worker<ThermalAlarmJobData, any, string>(
    ALARM_QUEUE_NAME,
    processAlarmJob,
    {
      connection: bullRedis,
      concurrency: 10, // Process up to 10 jobs simultaneously (one per dock)
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ [AlarmWorker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [AlarmWorker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ [AlarmWorker] Worker error:', err);
  });

  console.log('✅ Alarm worker started');
  return worker;
};
