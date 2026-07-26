/**
 * alarm.queue.ts
 * ──────────────
 * BullMQ Queue declaration for thermal runaway alarm processing.
 *
 * Design Decision: We use a single queue with a 3-second delay instead of
 * polling because:
 * 1. Debounce: A single temperature spike shouldn't trigger an alarm.
 *    We wait 3 seconds to see if the condition persists.
 * 2. Deduplication: If the same dock sends multiple high-temp readings within
 *    3 seconds, we use jobId deduplication so only ONE evaluation job runs.
 * 3. Persistence: If the server crashes during the 3-second window, Redis
 *    persists the job and it will process on restart.
 */

import { Queue } from 'bullmq';
import { bullRedis } from '../config/redis.config';
import { ThermalAlarmJobData } from '../types';

export const ALARM_QUEUE_NAME = 'thermal-alarm-processing';

export const alarmQueue = new Queue<ThermalAlarmJobData>(ALARM_QUEUE_NAME, {
  connection: bullRedis,
  defaultJobOptions: {
    // Keep completed jobs for 24 hours for audit trail
    removeOnComplete: { age: 86400 },
    // Keep failed jobs for 7 days for investigation
    removeOnFail: { age: 604800 },
    // No automatic retry - thermal decisions should be deliberate
    attempts: 1,
  },
});

/**
 * Enqueues a thermal alarm evaluation job with a 3-second debounce delay.
 *
 * Key design: Using `jobId: \`dock:${dockId}\`` means BullMQ will NOT
 * add a duplicate job if one already exists with the same ID in the queue.
 * This implements the debounce: only the FIRST high-temp reading within
 * the debounce window triggers an evaluation.
 */
export const enqueueThermalAlarm = async (
  data: ThermalAlarmJobData,
  debounceMs: number = 3000,
): Promise<void> => {
  const jobId = `dock-thermal-${data.dockId}`;

  await alarmQueue.add('evaluate-thermal-breach', data, {
    jobId,       // Deduplication key - prevents duplicate jobs for same dock
    delay: debounceMs, // Process after debounce window
  });

  console.log(
    `🌡️  Thermal alarm job enqueued for dock ${data.dockId} ` +
    `(temp: ${data.temperature}°C, delay: ${debounceMs}ms, jobId: ${jobId})`
  );
};
