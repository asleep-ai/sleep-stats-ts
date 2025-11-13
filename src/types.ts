/**
 * Sleep stage values
 */
export enum SleepStage {
  WAKE = 0,
  LIGHT = 1,
  DEEP = 2,
  REM = 3,
  NO_DATA = -1,
}

/**
 * Breakdown of time spent in each sleep stage (in seconds)
 */
export interface StageBreakdown {
  wake: number;
  light: number;
  deep: number;
  rem: number;
}

/**
 * Latency to reach each sleep stage (in seconds)
 * Stage latencies are measured from sleep onset, not from recording start
 */
export interface StageLatencies {
  /** Time until first non-wake stage (sleep onset) */
  sleep: number;
  /** Time from sleep onset to first light sleep stage (null if never reached) */
  light: number | null;
  /** Time from sleep onset to first deep sleep stage (null if never reached) */
  deep: number | null;
  /** Time from sleep onset to first REM sleep stage (null if never reached) */
  rem: number | null;
}

/**
 * Ratios of time spent in each stage (0-1)
 */
export interface StageRatios {
  wake: number;
  light: number;
  deep: number;
  rem: number;
  /** Combined sleep ratio (light + deep + rem) */
  sleep: number;
}

/**
 * Wake After Sleep Onset (WASO) statistics
 */
export interface WasoStatistics {
  /** Total time awake after sleep onset (in seconds) */
  waso: number;
  /** Number of wake episodes after sleep onset */
  wasoCount: number;
  /** Duration of longest wake episode (in seconds) */
  longestWaso: number;
}

/**
 * Internal structure for tracking key moments in sleep stages array
 */
export interface SleepMoments {
  /** Index of first non-wake stage (sleep onset) */
  firstSleepIdx: number;
  /** Index of last non-wake stage (final wake) */
  lastSleepIdx: number;
  /** Index of first light sleep stage (-1 if never reached) */
  firstLightIdx: number;
  /** Index of first deep sleep stage (-1 if never reached) */
  firstDeepIdx: number;
  /** Index of first REM sleep stage (-1 if never reached) */
  firstRemIdx: number;
  /** Count of wake stages between first and last sleep */
  wakeCount: number;
  /** Count of light sleep stages */
  lightCount: number;
  /** Count of deep sleep stages */
  deepCount: number;
  /** Count of REM sleep stages */
  remCount: number;
}

/**
 * Sleep cycle detection information
 */
export interface SleepCycleInfo {
  /** Number of complete sleep cycles */
  cycleCount: number;
  /** Average duration of sleep cycles in seconds (null if no cycles detected) */
  averageCycle: number | null;
}

/**
 * Complete sleep statistics calculated from hypnogram
 * Matches backend response structure
 */
export interface SleepStatistics {
  // Timestamps
  /** Recording start time (null if not provided) */
  startTime: Date | null;
  /** Recording end time (null if not provided) */
  endTime: Date | null;
  /** Sleep onset time - start + sleep_latency (null if not provided or never slept) */
  sleepTime: Date | null;
  /** Final wake time - end - wakeup_latency (null if not provided or never slept) */
  wakeTime: Date | null;
  /** Array of timestamps marking the start of sleep and end of each REM cluster (null if no cycles) */
  sleepCycleTime: Date[] | null;

  // Time durations (in seconds)
  /** Total tracking duration (in seconds) */
  timeInBed: number;
  /** Time in sleep period from sleep onset to final wake (timeInSleep + timeInWake) (in seconds) */
  timeInSleepPeriod: number;
  /** Total time asleep - light + deep + rem (in seconds) */
  timeInSleep: number;
  /** Total time awake after sleep onset (WASO) (in seconds) */
  timeInWake: number;
  /** Time in light sleep (in seconds) */
  timeInLight: number;
  /** Time in deep sleep (in seconds) */
  timeInDeep: number;
  /** Time in REM sleep (in seconds) */
  timeInRem: number;

  // Latencies (in seconds)
  /** Time until first non-wake stage (sleep onset) (in seconds) */
  sleepLatency: number;
  /** Time from last sleep to end of recording (in seconds) */
  wakeupLatency: number;
  /** Time from sleep onset to first light sleep stage (null if never reached) */
  lightLatency: number | null;
  /** Time from sleep onset to first deep sleep stage (null if never reached) */
  deepLatency: number | null;
  /** Time from sleep onset to first REM sleep stage (null if never reached) */
  remLatency: number | null;

  // Efficiency and ratios (0-1)
  /** Sleep efficiency (timeInSleep / timeInBed) */
  sleepEfficiency: number;
  /** Proportion of sleep period spent asleep (light + deep + rem) */
  sleepRatio: number;
  /** Proportion of sleep period spent awake (WASO ratio) */
  wakeRatio: number;
  /** Proportion of sleep period spent in light sleep */
  lightRatio: number;
  /** Proportion of sleep period spent in deep sleep */
  deepRatio: number;
  /** Proportion of sleep period spent in REM sleep */
  remRatio: number;

  // Wake After Sleep Onset (WASO) metrics
  /** Number of wake episodes after sleep onset */
  wasoCount: number;
  /** Duration of longest wake episode (in seconds) */
  longestWaso: number;

  // Sleep cycles
  /** Number of complete sleep cycles detected */
  sleepCycleCount: number;
  /** Average sleep cycle duration in seconds (null if no cycles) */
  averageSleepCycle: number | null;
}

/**
 * Options for statistics calculation
 */
export interface CalculationOptions {
  /** Recording start time as Date object or ISO 8601 string */
  startTime?: Date | string;
  /** Recording end time as Date object or ISO 8601 string */
  endTime?: Date | string;
}
