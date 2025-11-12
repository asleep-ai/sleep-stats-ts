/**
 * Sleep Statistics Calculator
 *
 * A standalone library for calculating sleep statistics from hypnogram arrays.
 * Each element in the hypnogram array represents a 30-second time slot with a sleep stage value.
 */

export {
  SLOT_DURATION_SECONDS,
  SLEEP_STAGE,
  THRESHOLD_REM_CLUSTER_DISTANCE,
  THRESHOLD_REM_COUNT,
} from './constants';
export {
  SleepStage,
  type StageBreakdown,
  type StageLatencies,
  type StageRatios,
  type WasoStatistics,
  type SleepMoments,
  type SleepCycleInfo,
  type SleepStatistics,
  type CalculationOptions,
} from './types';
export {
  calculateStageBreakdown,
  calculateSleepLatency,
  calculateStageLatencies,
  calculateWaso,
  calculateKeyMoments,
  calculateWakeupLatency,
  calculateRemClusters,
  calculateSleepCycles,
  calculateStageRatios,
  calculateSleepStatistics,
} from './calculator';
