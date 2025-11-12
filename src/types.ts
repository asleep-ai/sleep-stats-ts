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
 */
export interface StageLatencies {
  /** Time until first non-wake stage (sleep onset) */
  sleep: number;
  /** Time until first light sleep stage */
  light: number;
  /** Time until first deep sleep stage */
  deep: number;
  /** Time until first REM sleep stage */
  rem: number;
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
 */
export interface SleepStatistics {
  /** Total tracking duration (in seconds) */
  timeInBed: number;
  /** Total time asleep - light + deep + rem (in seconds) */
  timeInSleep: number;
  /** Total time awake (in seconds) */
  timeInWake: number;
  /** Time in deep sleep (in seconds) */
  timeInDeep: number;
  /** Time in light sleep (in seconds) */
  timeInLight: number;
  /** Time in REM sleep (in seconds) */
  timeInRem: number;

  /** Sleep efficiency (timeInSleep / timeInBed), range 0-1 */
  sleepEfficiency: number;

  /** Time until first non-wake stage (in seconds) */
  sleepLatency: number;
  /** Time from last sleep to end of recording (in seconds) */
  wakeupLatency: number;

  /** Latencies to reach each sleep stage */
  latencies: StageLatencies;

  /** Ratios of time spent in each stage */
  ratios: StageRatios;

  /** Wake After Sleep Onset statistics */
  waso: WasoStatistics;

  /** Time in sleep period (timeInSleep + waso) */
  timeInSleepPeriod: number;

  /** Raw stage breakdown (same as timeIn* values) */
  stageBreakdown: StageBreakdown;

  /** Number of complete sleep cycles detected */
  sleepCycleCount: number;
  /** Average sleep cycle duration in seconds (null if no cycles) */
  averageSleepCycle: number | null;
}

/**
 * Options for statistics calculation
 */
export interface CalculationOptions {
  /** Slot duration in seconds (default: 30) */
  slotDuration?: number;
}
