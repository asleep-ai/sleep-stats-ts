import {
  SLOT_DURATION_SECONDS,
  THRESHOLD_REM_CLUSTER_DISTANCE,
  THRESHOLD_REM_COUNT,
  SLEEP_STAGE,
} from './constants';
import type {
  StageBreakdown,
  StageLatencies,
  StageRatios,
  WasoStatistics,
  SleepStatistics,
  CalculationOptions,
  SleepMoments,
  SleepCycleInfo,
} from './types';
import { roundSecond, toInt } from './utils';

/**
 * Adjust stage ratios to ensure they sum to exactly 1.0
 * Handles floating-point precision errors by iteratively adjusting ratios
 *
 * Algorithm:
 * 1. Round all ratios to 2 decimal places
 * 2. Calculate sum and error from 1.0
 * 3. Iteratively adjust ratios by ±0.01 until sum equals 1.0
 * 4. Priority order for adjustment: light → rem → deep → wake
 *
 * @param ratios Raw calculated ratios
 * @returns Adjusted ratios that sum to exactly 1.0
 */
function adjustRatiosToSecond(ratios: {
  wake: number;
  light: number;
  deep: number;
  rem: number;
}): {
  wake: number;
  light: number;
  deep: number;
  rem: number;
  sleep: number;
} {
  // Round all ratios to 2 decimal places
  let wake = roundSecond(ratios.wake);
  let light = roundSecond(ratios.light);
  let deep = roundSecond(ratios.deep);
  let rem = roundSecond(ratios.rem);

  // Calculate sum and error
  const sumOfRatios = wake + light + deep + rem;
  let error = roundSecond(sumOfRatios - 1);

  // Iteratively adjust ratios until sum equals 1.0
  // Priority: light → rem → deep → wake
  while (error !== 0) {
    const adjustment = error > 0 ? 0.01 : -0.01;

    if (light > 0 || adjustment < 0) {
      light = roundSecond(light - adjustment);
    } else if (rem > 0 || adjustment < 0) {
      rem = roundSecond(rem - adjustment);
    } else if (deep > 0 || adjustment < 0) {
      deep = roundSecond(deep - adjustment);
    } else if (wake > 0 || adjustment < 0) {
      wake = roundSecond(wake - adjustment);
    }

    error = roundSecond(error - adjustment);
  }

  // Calculate sleep ratio as 1 - wake (clamped to 0 minimum)
  const sleep = roundSecond(Math.max(1 - wake, 0));

  return { wake, light, deep, rem, sleep };
}

/**
 * Calculate breakdown of time spent in each sleep stage
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM)
 * @returns Time spent in each stage in seconds
 */
export function calculateStageBreakdown(
  sleepStages: number[]
): StageBreakdown {
  const breakdown: StageBreakdown = { wake: 0, light: 0, deep: 0, rem: 0 };

  for (const stage of sleepStages) {
    switch (stage) {
      case 0:
        breakdown.wake += SLOT_DURATION_SECONDS;
        break;
      case 1:
        breakdown.light += SLOT_DURATION_SECONDS;
        break;
      case 2:
        breakdown.deep += SLOT_DURATION_SECONDS;
        break;
      case 3:
        breakdown.rem += SLOT_DURATION_SECONDS;
        break;
      // Ignore -1 (NO_DATA) and other values
    }
  }

  return breakdown;
}

/**
 * Calculate sleep latency (time until first non-wake stage)
 * @param sleepStages Array of sleep stage values
 * @returns Sleep latency in seconds
 */
export function calculateSleepLatency(
  sleepStages: number[]
): number {
  let latency = 0;
  for (const stage of sleepStages) {
    if (stage !== 0) {
      break;
    }
    latency += SLOT_DURATION_SECONDS;
  }
  return latency;
}

/**
 * Calculate latencies to reach each sleep stage
 * Stage latencies are measured FROM SLEEP ONSET (first non-wake stage),
 * matching Asleep backend behavior.
 *
 * @param sleepStages Array of sleep stage values
 * @returns Latencies to reach each stage in seconds
 */
export function calculateStageLatencies(
  sleepStages: number[]
): StageLatencies {
  const moments = calculateKeyMoments(sleepStages);

  // If never slept, sleep latency is total duration
  const sleepLatency = moments.firstSleepIdx !== -1
    ? moments.firstSleepIdx * SLOT_DURATION_SECONDS
    : sleepStages.length * SLOT_DURATION_SECONDS;

  // Stage latencies are calculated from sleep onset (first non-wake stage)
  // Formula: (first_stage_idx - first_sleep_idx) * SLOT_DURATION_SECONDS
  const lightLatency = moments.firstLightIdx !== -1
    ? (moments.firstLightIdx - moments.firstSleepIdx) * SLOT_DURATION_SECONDS
    : null;

  const deepLatency = moments.firstDeepIdx !== -1
    ? (moments.firstDeepIdx - moments.firstSleepIdx) * SLOT_DURATION_SECONDS
    : null;

  const remLatency = moments.firstRemIdx !== -1
    ? (moments.firstRemIdx - moments.firstSleepIdx) * SLOT_DURATION_SECONDS
    : null;

  return {
    sleep: sleepLatency,
    light: lightLatency,
    deep: deepLatency,
    rem: remLatency,
  };
}

/**
 * Calculate Wake After Sleep Onset (WASO) statistics
 * @param sleepStages Array of sleep stage values
 * @returns WASO statistics
 */
export function calculateWaso(
  sleepStages: number[]
): WasoStatistics {
  let waso = 0;
  let sleepStarted = false;
  let wasoCount = 0;
  let currentWasoLength = 0;
  let longestWaso = 0;

  for (const stage of sleepStages) {
    // Mark sleep as started when we encounter first non-wake stage
    if (!sleepStarted && stage !== 0) {
      sleepStarted = true;
    }

    if (sleepStarted) {
      if (stage === 0) {
        // Wake period after sleep onset
        waso += SLOT_DURATION_SECONDS;
        currentWasoLength += SLOT_DURATION_SECONDS;

        // Count new wake episode (first slot of wake period)
        if (currentWasoLength === SLOT_DURATION_SECONDS) {
          wasoCount++;
        }
      } else {
        // Sleep period - check if we need to update longest WASO
        if (currentWasoLength > longestWaso) {
          longestWaso = currentWasoLength;
        }
        currentWasoLength = 0;
      }
    }
  }

  // Check final wake period
  if (currentWasoLength > longestWaso) {
    longestWaso = currentWasoLength;
  }

  return {
    waso,
    wasoCount,
    longestWaso,
  };
}

/**
 * Calculate key moments in sleep stages array
 * Identifies critical indices and stage counts for sleep analysis
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM, -1=NoData)
 * @returns SleepMoments object containing indices and counts
 */
export function calculateKeyMoments(sleepStages: number[]): SleepMoments {
  let firstSleepIdx = -1;
  let lastSleepIdx = -1;
  let firstLightIdx = -1;
  let firstDeepIdx = -1;
  let firstRemIdx = -1;

  let wakeCount = 0;
  let lightCount = 0;
  let deepCount = 0;
  let remCount = 0;

  const lastStageIdx = sleepStages.length - 1;

  for (let idx = 0; idx < sleepStages.length; idx++) {
    const stage = sleepStages[idx];

    // Track first and last non-wake stages (NO_DATA is treated as not-wake)
    if (stage !== 0) {
      if (firstSleepIdx === -1) {
        firstSleepIdx = idx;
      }
      lastSleepIdx = idx;
    }

    // Count stages and track first occurrence of each
    if (stage === 0) {
      wakeCount++;
    } else if (stage === 1) {
      if (firstLightIdx === -1) {
        firstLightIdx = idx;
      }
      lightCount++;
    } else if (stage === 2) {
      if (firstDeepIdx === -1) {
        firstDeepIdx = idx;
      }
      deepCount++;
    } else if (stage === 3) {
      if (firstRemIdx === -1) {
        firstRemIdx = idx;
      }
      remCount++;
    }
    // Ignore -1 (NO_DATA) when counting
  }

  // Adjust wake count to only include wakes between first and last sleep
  // Subtract wakes before first sleep and after last sleep
  if (firstSleepIdx !== -1 && lastSleepIdx !== -1) {
    wakeCount -= firstSleepIdx + (lastStageIdx - lastSleepIdx);
  }

  return {
    firstSleepIdx,
    lastSleepIdx,
    firstLightIdx,
    firstDeepIdx,
    firstRemIdx,
    wakeCount,
    lightCount,
    deepCount,
    remCount,
  };
}

/**
 * Calculate wakeup latency (time from last sleep to end of recording)
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM, -1=NoData)
 * @returns Wakeup latency in seconds
 */
export function calculateWakeupLatency(
  sleepStages: number[]
): number {
  const moments = calculateKeyMoments(sleepStages);

  // If never sleeps, return 0
  if (moments.lastSleepIdx === -1) {
    return 0;
  }

  // Calculate time from last sleep to end of recording
  const lastStageIdx = sleepStages.length - 1;
  return (lastStageIdx - moments.lastSleepIdx) * SLOT_DURATION_SECONDS;
}

/**
 * Calculate REM cluster indices from sleep stages
 * Detects continuous or nearby REM periods that form clusters.
 * A REM cluster is a sequence of REM periods separated by no more than
 * THRESHOLD_REM_CLUSTER_DISTANCE epochs (20 epochs = 10 minutes by default).
 * Only clusters with at least THRESHOLD_REM_COUNT REM epochs are considered valid.
 *
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM, -1=NoData)
 * @returns Array of [startIdx, endIdx] pairs for each valid REM cluster
 */
export function calculateRemClusters(sleepStages: number[]): number[][] {
  const moments = calculateKeyMoments(sleepStages);

  // If no sleep detected, return empty array
  if (moments.firstSleepIdx === -1 || moments.lastSleepIdx === -1) {
    return [];
  }

  const start = moments.firstSleepIdx;
  const end = moments.lastSleepIdx;

  let remClsStart = -1;
  let remClsEnd = -1;
  const remClsStarts: number[] = [];
  const remClsEnds: number[] = [];

  let distance = 0;
  let remCount = 0;

  for (let idx = start; idx <= end; idx++) {
    const stage = sleepStages[idx];

    // Check if we need to start a new cluster due to distance threshold
    if (stage === SLEEP_STAGE.REM && distance > THRESHOLD_REM_CLUSTER_DISTANCE) {
      // Save previous cluster if it meets minimum REM count
      if (remCount >= THRESHOLD_REM_COUNT) {
        remClsStarts.push(remClsStart);
        remClsEnds.push(remClsEnd);
      }

      // Start new cluster
      remClsStart = idx;
      remClsEnd = idx;
      remCount = 1;
      distance = 0;
    } else if (stage === SLEEP_STAGE.REM && distance <= THRESHOLD_REM_CLUSTER_DISTANCE) {
      // Continue current cluster (REM within distance threshold)
      distance = 0;
      // Update cluster boundaries and count
      if (remClsStart === -1) {
        remClsStart = idx;
        remCount = 1;
      } else {
        remCount += 1;
      }
      remClsEnd = idx;
    } else if (stage !== SLEEP_STAGE.REM) {
      // Non-REM stage, increase distance
      distance += 1;
    }
  }

  // Save final cluster if it meets minimum REM count
  if (remCount >= THRESHOLD_REM_COUNT) {
    remClsStarts.push(remClsStart);
    remClsEnds.push(remClsEnd);
  }

  // Combine starts and ends into [start, end] pairs
  const clusters: number[][] = [];
  for (let i = 0; i < remClsStarts.length; i++) {
    clusters.push([remClsStarts[i], remClsEnds[i]]);
  }

  return clusters;
}

/**
 * Calculate sleep cycle timestamps from sleep stages
 * Returns an array of timestamps where:
 * - First element is the sleep onset time (sleepTime)
 * - Subsequent elements are the timestamps at the end of each REM cluster
 *
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM, -1=NoData)
 * @param sleepTime Sleep onset time (null if not provided or never slept)
 * @param firstSleepIdx Index of first non-wake stage
 * @param clusterEnds Array of indices marking the end of each REM cluster
 * @returns Array of Date timestamps or null if no sleepTime or no clusters
 */
export function calculateSleepCycleTime(
  _sleepStages: number[],
  sleepTime: Date | null,
  firstSleepIdx: number,
  clusterEnds: number[]
): Date[] | null {
  // Return null if no sleep time or no clusters
  if (!sleepTime || clusterEnds.length === 0) {
    return null;
  }

  // Start with sleep onset time
  const sleepCycleTime: Date[] = [sleepTime];

  // Add timestamp for each cluster end
  for (const clusterEnd of clusterEnds) {
    // Calculate time offset from sleep onset to cluster end
    const offsetSeconds = (clusterEnd - firstSleepIdx) * SLOT_DURATION_SECONDS;
    const clusterEndTime = new Date(sleepTime.getTime() + offsetSeconds * 1000);
    sleepCycleTime.push(clusterEndTime);
  }

  return sleepCycleTime;
}

/**
 * Calculate sleep cycle information from sleep stages
 * Sleep cycles are determined by detecting REM clusters.
 * Each REM cluster represents one complete sleep cycle.
 * Average cycle duration is calculated as the average distance between cluster starts.
 *
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM, -1=NoData)
 * @returns SleepCycleInfo with cycle count and average cycle duration
 */
export function calculateSleepCycles(
  sleepStages: number[]
): SleepCycleInfo {
  const clusters = calculateRemClusters(sleepStages);
  const cycleCount = clusters.length;

  // No cycles detected
  if (cycleCount === 0) {
    return {
      cycleCount,
      averageCycle: null,
    };
  }

  // Calculate average distance even with 1 cycle (matches Python behavior)
  const moments = calculateKeyMoments(sleepStages);
  const clusterEnds = clusters.map((cluster) => cluster[1]);

  // Distance from sleep onset to first cluster end
  let totalDistance = clusterEnds[0] - moments.firstSleepIdx;

  // Add distances between consecutive cluster ends
  for (let i = 0; i < clusterEnds.length - 1; i++) {
    totalDistance += clusterEnds[i + 1] - clusterEnds[i];
  }

  // Average distance in epochs, then convert to seconds
  // Use toInt() to match Python's floor(x + 0.5) rounding behavior
  const averageDistanceEpochs = totalDistance / clusterEnds.length;
  const averageCycle = toInt(averageDistanceEpochs * SLOT_DURATION_SECONDS);

  return {
    cycleCount,
    averageCycle,
  };
}

/**
 * Calculate stage ratios (proportion of time in each stage)
 *
 * Calculates the proportion of time spent in each sleep stage relative to the sleep period.
 * Applies rounding adjustment to ensure ratios sum to exactly 1.0.
 *
 * @param breakdown Stage breakdown in seconds
 * @param waso Wake after sleep onset in seconds
 * @param timeInSleepPeriod Duration from sleep onset to final wake in seconds
 * @returns Ratios for each stage (0-1), rounded to 2 decimal places and adjusted to sum to 1.0
 */
export function calculateStageRatios(
  breakdown: StageBreakdown,
  waso: number,
  timeInSleepPeriod: number
): StageRatios {
  if (timeInSleepPeriod === 0) {
    return { wake: 0, light: 0, deep: 0, rem: 0, sleep: 0 };
  }

  // Calculate raw ratios
  const rawRatios = {
    wake: waso / timeInSleepPeriod,
    light: breakdown.light / timeInSleepPeriod,
    deep: breakdown.deep / timeInSleepPeriod,
    rem: breakdown.rem / timeInSleepPeriod,
  };

  // Apply rounding adjustment to ensure ratios sum to exactly 1.0
  return adjustRatiosToSecond(rawRatios);
}

/**
 * Calculate complete sleep statistics from hypnogram array
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM, -1=NoData)
 * @param options Calculation options
 * @returns Complete sleep statistics
 */
export function calculateSleepStatistics(
  sleepStages: number[],
  options: CalculationOptions = {}
): SleepStatistics {
  // Parse start and end times if provided
  let startTime: Date | null = null;
  let endTime: Date | null = null;
  let sleepTime: Date | null = null;
  let wakeTime: Date | null = null;

  if (options.startTime) {
    startTime = typeof options.startTime === 'string'
      ? new Date(options.startTime)
      : options.startTime;
  }

  if (options.endTime) {
    endTime = typeof options.endTime === 'string'
      ? new Date(options.endTime)
      : options.endTime;
  }

  // Calculate timeInBed from actual timestamps if both available, otherwise from array length
  let timeInBed: number;
  if (startTime && endTime) {
    timeInBed = Math.round((endTime.getTime() - startTime.getTime()) / 1000);
  } else {
    timeInBed = sleepStages.length * SLOT_DURATION_SECONDS;
  }

  // Calculate stage breakdown
  const stageBreakdown = calculateStageBreakdown(sleepStages);

  // Calculate derived metrics
  const timeInSleep = stageBreakdown.light + stageBreakdown.deep + stageBreakdown.rem;
  const sleepEfficiency = timeInBed > 0 ? roundSecond(timeInSleep / timeInBed) : 0;

  // Calculate latencies
  const latencies = calculateStageLatencies(sleepStages);
  const wakeupLatency = calculateWakeupLatency(sleepStages);

  // Calculate WASO
  const waso = calculateWaso(sleepStages);

  // Calculate time in sleep period (sleep + wake after sleep onset)
  const timeInSleepPeriod = timeInSleep + waso.waso;

  // Calculate ratios
  const ratios = calculateStageRatios(stageBreakdown, waso.waso, timeInSleepPeriod);

  // Calculate sleep cycles
  const sleepCycles = calculateSleepCycles(sleepStages);

  // Calculate sleep cycle timestamps
  const moments = calculateKeyMoments(sleepStages);
  const clusters = calculateRemClusters(sleepStages);
  const clusterEnds = clusters.map(cluster => cluster[1]);

  // Calculate sleep cycle time - will be set after sleepTime is calculated
  let sleepCycleTime: Date[] | null = null;

  // Calculate time points if start/end times provided
  if (startTime && endTime) {
    // Only calculate sleepTime/wakeTime if actually slept
    if (latencies.sleep < timeInBed) {
      sleepTime = new Date(startTime.getTime() + latencies.sleep * 1000);
      wakeTime = new Date(endTime.getTime() - wakeupLatency * 1000);
      // Calculate sleep cycle timestamps now that we have sleepTime
      sleepCycleTime = calculateSleepCycleTime(sleepStages, sleepTime, moments.firstSleepIdx, clusterEnds);
    }
  } else if (startTime) {
    // If only startTime provided, calculate endTime from timeInBed
    endTime = new Date(startTime.getTime() + timeInBed * 1000);

    if (latencies.sleep < timeInBed) {
      sleepTime = new Date(startTime.getTime() + latencies.sleep * 1000);
      wakeTime = new Date(endTime.getTime() - wakeupLatency * 1000);
      // Calculate sleep cycle timestamps now that we have sleepTime
      sleepCycleTime = calculateSleepCycleTime(sleepStages, sleepTime, moments.firstSleepIdx, clusterEnds);
    }
  } else if (endTime) {
    // If only endTime provided, calculate startTime from timeInBed
    startTime = new Date(endTime.getTime() - timeInBed * 1000);

    if (latencies.sleep < timeInBed) {
      sleepTime = new Date(startTime.getTime() + latencies.sleep * 1000);
      wakeTime = new Date(endTime.getTime() - wakeupLatency * 1000);
      // Calculate sleep cycle timestamps now that we have sleepTime
      sleepCycleTime = calculateSleepCycleTime(sleepStages, sleepTime, moments.firstSleepIdx, clusterEnds);
    }
  }

  return {
    // Timestamps
    startTime,
    endTime,
    sleepTime,
    wakeTime,
    sleepCycleTime,

    // Time durations (in seconds)
    timeInBed,
    timeInSleepPeriod,
    timeInSleep,
    timeInWake: waso.waso,
    timeInLight: stageBreakdown.light,
    timeInDeep: stageBreakdown.deep,
    timeInRem: stageBreakdown.rem,

    // Latencies (in seconds)
    sleepLatency: latencies.sleep,
    wakeupLatency,
    lightLatency: latencies.light,
    deepLatency: latencies.deep,
    remLatency: latencies.rem,

    // Efficiency and ratios (0-1)
    sleepEfficiency,
    sleepRatio: ratios.sleep,
    wakeRatio: ratios.wake,
    lightRatio: ratios.light,
    deepRatio: ratios.deep,
    remRatio: ratios.rem,

    // Wake After Sleep Onset (WASO) metrics
    wasoCount: waso.wasoCount,
    longestWaso: waso.longestWaso,

    // Sleep cycles
    sleepCycleCount: sleepCycles.cycleCount,
    averageSleepCycle: sleepCycles.averageCycle,
  };
}
