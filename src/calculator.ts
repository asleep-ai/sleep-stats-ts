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

/**
 * Calculate breakdown of time spent in each sleep stage
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM)
 * @param slotDuration Duration of each slot in seconds (default: 30)
 * @returns Time spent in each stage in seconds
 */
export function calculateStageBreakdown(
  sleepStages: number[],
  slotDuration: number = SLOT_DURATION_SECONDS
): StageBreakdown {
  const breakdown: StageBreakdown = { wake: 0, light: 0, deep: 0, rem: 0 };

  for (const stage of sleepStages) {
    switch (stage) {
      case 0:
        breakdown.wake += slotDuration;
        break;
      case 1:
        breakdown.light += slotDuration;
        break;
      case 2:
        breakdown.deep += slotDuration;
        break;
      case 3:
        breakdown.rem += slotDuration;
        break;
      // Ignore -1 (NO_DATA) and other values
    }
  }

  return breakdown;
}

/**
 * Calculate sleep latency (time until first non-wake stage)
 * @param sleepStages Array of sleep stage values
 * @param slotDuration Duration of each slot in seconds (default: 30)
 * @returns Sleep latency in seconds
 */
export function calculateSleepLatency(
  sleepStages: number[],
  slotDuration: number = SLOT_DURATION_SECONDS
): number {
  let latency = 0;
  for (const stage of sleepStages) {
    if (stage !== 0) {
      break;
    }
    latency += slotDuration;
  }
  return latency;
}

/**
 * Calculate latencies to reach each sleep stage
 * @param sleepStages Array of sleep stage values
 * @param slotDuration Duration of each slot in seconds (default: 30)
 * @returns Latencies to reach each stage in seconds
 */
export function calculateStageLatencies(
  sleepStages: number[],
  slotDuration: number = SLOT_DURATION_SECONDS
): StageLatencies {
  const sleepLatency = calculateSleepLatency(sleepStages, slotDuration);

  let lightLatency = 0;
  let deepLatency = 0;
  let remLatency = 0;
  let foundLight = false;
  let foundDeep = false;
  let foundRem = false;

  for (let i = 0; i < sleepStages.length; i++) {
    const stage = sleepStages[i];

    if (!foundLight && stage === 1) {
      foundLight = true;
    }
    if (!foundDeep && stage === 2) {
      foundDeep = true;
    }
    if (!foundRem && stage === 3) {
      foundRem = true;
    }

    if (!foundLight) lightLatency += slotDuration;
    if (!foundDeep) deepLatency += slotDuration;
    if (!foundRem) remLatency += slotDuration;

    if (foundLight && foundDeep && foundRem) break;
  }

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
 * @param slotDuration Duration of each slot in seconds (default: 30)
 * @returns WASO statistics
 */
export function calculateWaso(
  sleepStages: number[],
  slotDuration: number = SLOT_DURATION_SECONDS
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
        waso += slotDuration;
        currentWasoLength += slotDuration;

        // Count new wake episode (first slot of wake period)
        if (currentWasoLength === slotDuration) {
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
 * @param slotDuration Duration of each slot in seconds (default: 30)
 * @returns Wakeup latency in seconds
 */
export function calculateWakeupLatency(
  sleepStages: number[],
  slotDuration: number = SLOT_DURATION_SECONDS
): number {
  const moments = calculateKeyMoments(sleepStages);

  // If never sleeps, return 0
  if (moments.lastSleepIdx === -1) {
    return 0;
  }

  // Calculate time from last sleep to end of recording
  const lastStageIdx = sleepStages.length - 1;
  return (lastStageIdx - moments.lastSleepIdx) * slotDuration;
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
 * Calculate sleep cycle information from sleep stages
 * Sleep cycles are determined by detecting REM clusters.
 * Each REM cluster represents one complete sleep cycle.
 * Average cycle duration is calculated as the average distance between cluster starts.
 *
 * @param sleepStages Array of sleep stage values (0=Wake, 1=Light, 2=Deep, 3=REM, -1=NoData)
 * @param slotDuration Duration of each slot in seconds (default: 30)
 * @returns SleepCycleInfo with cycle count and average cycle duration
 */
export function calculateSleepCycles(
  sleepStages: number[],
  slotDuration: number = SLOT_DURATION_SECONDS
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
  const averageDistanceEpochs = totalDistance / clusterEnds.length;
  const averageCycle = averageDistanceEpochs * slotDuration;

  return {
    cycleCount,
    averageCycle,
  };
}

/**
 * Calculate stage ratios (proportion of time in each stage)
 * @param breakdown Stage breakdown in seconds
 * @param timeInBed Total tracking duration in seconds
 * @returns Ratios for each stage (0-1)
 */
export function calculateStageRatios(
  breakdown: StageBreakdown,
  timeInBed: number
): StageRatios {
  if (timeInBed === 0) {
    return { wake: 0, light: 0, deep: 0, rem: 0, sleep: 0 };
  }

  const timeInSleep = breakdown.light + breakdown.deep + breakdown.rem;

  return {
    wake: breakdown.wake / timeInBed,
    light: breakdown.light / timeInBed,
    deep: breakdown.deep / timeInBed,
    rem: breakdown.rem / timeInBed,
    sleep: timeInSleep / timeInBed,
  };
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
  const slotDuration = options.slotDuration ?? SLOT_DURATION_SECONDS;

  // Calculate stage breakdown
  const stageBreakdown = calculateStageBreakdown(sleepStages, slotDuration);

  // Calculate derived metrics
  const timeInBed = sleepStages.length * slotDuration;
  const timeInSleep = stageBreakdown.light + stageBreakdown.deep + stageBreakdown.rem;
  const sleepEfficiency = timeInBed > 0 ? timeInSleep / timeInBed : 0;

  // Calculate latencies
  const latencies = calculateStageLatencies(sleepStages, slotDuration);
  const wakeupLatency = calculateWakeupLatency(sleepStages, slotDuration);

  // Calculate WASO
  const waso = calculateWaso(sleepStages, slotDuration);

  // Calculate ratios
  const ratios = calculateStageRatios(stageBreakdown, timeInBed);

  // Calculate time in sleep period (sleep + wake after sleep onset)
  const timeInSleepPeriod = timeInSleep + waso.waso;

  // Calculate sleep cycles
  const sleepCycles = calculateSleepCycles(sleepStages, slotDuration);

  return {
    timeInBed,
    timeInSleep,
    timeInWake: stageBreakdown.wake,
    timeInDeep: stageBreakdown.deep,
    timeInLight: stageBreakdown.light,
    timeInRem: stageBreakdown.rem,
    sleepEfficiency,
    sleepLatency: latencies.sleep,
    wakeupLatency,
    latencies,
    ratios,
    waso,
    timeInSleepPeriod,
    stageBreakdown,
    sleepCycleCount: sleepCycles.cycleCount,
    averageSleepCycle: sleepCycles.averageCycle,
  };
}
