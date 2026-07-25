/**
 * socket.events.ts
 * ────────────────
 * Centralized event name constants for Socket.io.
 * Using an enum prevents typos and enables IDE autocomplete across the codebase.
 */

export enum SocketEvent {
  // Telemetry stream - broadcasted to station room on every valid ingestion
  TELEMETRY_UPDATE = 'TELEMETRY_UPDATE',

  // Alarm lifecycle events - broadcasted to station + global admin room
  ALARM_TRIGGERED = 'ALARM_TRIGGERED',
  ALARM_SILENCED = 'ALARM_SILENCED',
  ALARM_RESOLVED = 'ALARM_RESOLVED',

  // Dock power state events
  DOCK_POWER_CUTOFF = 'DOCK_POWER_CUTOFF',   // Dock isolated due to thermal event
  DOCK_POWER_RESTORED = 'DOCK_POWER_RESTORED', // Dock power restored post-resolution

  // Client → Server events
  JOIN_STATION_ROOM = 'JOIN_STATION_ROOM',    // Client subscribes to a station's events
  LEAVE_STATION_ROOM = 'LEAVE_STATION_ROOM',
}

/** Room naming conventions */
export const SocketRoom = {
  /** Per-station room: all operators/monitors at a specific station */
  station: (stationId: string) => `station:${stationId}`,
  /** Global admin room: receives ALL events across all stations */
  admins: 'room:admins',
} as const;
