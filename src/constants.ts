/**
 * Duration of each sleep stage slot in seconds
 * Fixed at 30 seconds per Asleep API specification
 */
export const SLOT_DURATION_SECONDS = 30;

/**
 * Sleep stage enum values
 */
export const SLEEP_STAGE = {
  WAKE: 0,
  LIGHT: 1,
  DEEP: 2,
  REM: 3,
  NO_DATA: -1,
} as const;

/**
 * Sleep cycle detection constants
 */
export const THRESHOLD_REM_CLUSTER_DISTANCE = 20; // epochs (10 minutes)
export const THRESHOLD_REM_COUNT = 20; // minimum REM epochs for valid cluster
