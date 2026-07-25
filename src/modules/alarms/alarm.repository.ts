/**
 * alarms/alarm.repository.ts
 * ───────────────────────────
 * Data access layer for the alarms module.
 * Owns all Prisma queries for Alarm model state machine transitions
 * and associated Dock state restoration.
 */

import { AlarmStatus, DockState } from '@prisma/client';
import { prisma } from '../../config/database.config';

export const AlarmRepository = {
  // ── Read queries ───────────────────────────────────────────────────────────

  /** Paginated alarm list with dock + station + resolver info */
  findMany: (options: { where: object; skip: number; take: number }) =>
    prisma.alarm.findMany({
      where: options.where,
      include: {
        dock: { include: { station: true } },
        resolver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { triggeredAt: 'desc' },
      skip: options.skip,
      take: options.take,
    }),

  /** Total count matching a where filter (used for pagination meta) */
  count: (where: object) => prisma.alarm.count({ where }),

  /** Find a single alarm by ID with full relations */
  findById: (id: string) =>
    prisma.alarm.findUnique({
      where: { id },
      include: {
        dock: { include: { station: true } },
        resolver: { select: { id: true, name: true, email: true } },
      },
    }),

  /** Find a basic alarm record without relations (for state checks) */
  findByIdSimple: (id: string) =>
    prisma.alarm.findUnique({ where: { id } }),

  /** Find a basic alarm record with dock (for resolve + dock restore) */
  findByIdWithDock: (id: string) =>
    prisma.alarm.findUnique({
      where: { id },
      include: { dock: true },
    }),

  /** Find an active alarm for a dock (deduplication — used by worker) */
  findActiveByDock: (dockId: string) =>
    prisma.alarm.findFirst({
      where: { dockId, status: AlarmStatus.ACTIVE },
      orderBy: { triggeredAt: 'desc' },
    }),

  /** Group alarms by status — for dashboard aggregate counts */
  countByStatus: () =>
    prisma.alarm.groupBy({
      by: ['status'],
      _count: { status: true },
    }),

  // ── Write queries ──────────────────────────────────────────────────────────

  /** Silence an alarm (ACTIVE → SILENCED) */
  silence: (id: string, operatorId: string) =>
    prisma.alarm.update({
      where: { id },
      data: {
        status: AlarmStatus.SILENCED,
        silencedAt: new Date(),
        resolvedBy: operatorId,
      },
      include: { dock: true },
    }),

  /**
   * Resolve alarm and restore dock power in a single transaction.
   * Dock state is set based on whether a battery is still installed.
   */
  resolveWithDockRestore: (
    alarmId: string,
    dockId: string,
    operatorId: string,
    hasBattery: boolean,
    notes?: string | null
  ) =>
    prisma.$transaction([
      prisma.alarm.update({
        where: { id: alarmId },
        data: {
          status: AlarmStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: operatorId,
          ...(notes !== undefined ? { notes } : {}),
        },
      }),
      prisma.dock.update({
        where: { id: dockId },
        data: { state: hasBattery ? DockState.CHARGING : DockState.AVAILABLE },
      }),
    ]),
};
