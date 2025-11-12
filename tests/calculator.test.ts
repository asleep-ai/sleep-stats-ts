import {
  calculateStageBreakdown,
  calculateSleepLatency,
  calculateStageLatencies,
  calculateWaso,
  calculateStageRatios,
  calculateSleepStatistics,
  calculateKeyMoments,
  calculateWakeupLatency,
  calculateRemClusters,
  calculateSleepCycles,
  SleepStage,
} from '../src';

describe('calculateStageBreakdown', () => {
  it('should calculate correct breakdown for all wake stages', () => {
    const sleepStages = [0, 0, 0, 0];
    const breakdown = calculateStageBreakdown(sleepStages);
    expect(breakdown).toEqual({ wake: 120, light: 0, deep: 0, rem: 0 });
  });

  it('should calculate correct breakdown for mixed stages', () => {
    const sleepStages = [0, 1, 2, 3];
    const breakdown = calculateStageBreakdown(sleepStages);
    expect(breakdown).toEqual({ wake: 30, light: 30, deep: 30, rem: 30 });
  });

  it('should ignore NO_DATA stages', () => {
    const sleepStages = [0, -1, 1, -1, 2];
    const breakdown = calculateStageBreakdown(sleepStages);
    expect(breakdown).toEqual({ wake: 30, light: 30, deep: 30, rem: 0 });
  });

  it('should handle empty array', () => {
    const sleepStages: number[] = [];
    const breakdown = calculateStageBreakdown(sleepStages);
    expect(breakdown).toEqual({ wake: 0, light: 0, deep: 0, rem: 0 });
  });
});

describe('calculateSleepLatency', () => {
  it('should return 0 for immediate sleep', () => {
    const sleepStages = [1, 1, 1];
    const latency = calculateSleepLatency(sleepStages);
    expect(latency).toBe(0);
  });

  it('should calculate latency for delayed sleep onset', () => {
    const sleepStages = [0, 0, 0, 1, 1];
    const latency = calculateSleepLatency(sleepStages);
    expect(latency).toBe(90); // 3 slots * 30 seconds
  });

  it('should return total duration if never slept', () => {
    const sleepStages = [0, 0, 0, 0];
    const latency = calculateSleepLatency(sleepStages);
    expect(latency).toBe(120);
  });
});

describe('calculateStageLatencies', () => {
  it('should calculate all latencies correctly', () => {
    const sleepStages = [0, 0, 1, 1, 2, 2, 3, 3];
    const latencies = calculateStageLatencies(sleepStages);
    expect(latencies).toEqual({
      sleep: 60,   // 2 wake slots
      light: 60,   // 2 slots until light
      deep: 120,   // 4 slots until deep
      rem: 180,    // 6 slots until REM
    });
  });

  it('should handle never reaching certain stages', () => {
    const sleepStages = [0, 1, 1, 1];
    const latencies = calculateStageLatencies(sleepStages);
    expect(latencies).toEqual({
      sleep: 30,
      light: 30,
      deep: 120,   // Never found, returns total
      rem: 120,    // Never found, returns total
    });
  });
});

describe('calculateWaso', () => {
  it('should return zero WASO before sleep onset', () => {
    const sleepStages = [0, 0, 0, 1, 1, 1];
    const waso = calculateWaso(sleepStages);
    expect(waso).toEqual({ waso: 0, wasoCount: 0, longestWaso: 0 });
  });

  it('should calculate WASO after sleep onset', () => {
    const sleepStages = [0, 1, 1, 0, 0, 1, 1];
    const waso = calculateWaso(sleepStages);
    expect(waso).toEqual({
      waso: 60,        // 2 wake slots after sleep
      wasoCount: 1,    // 1 wake episode
      longestWaso: 60, // 2 slots
    });
  });

  it('should count multiple WASO episodes', () => {
    const sleepStages = [0, 1, 0, 1, 0, 0, 1];
    const waso = calculateWaso(sleepStages);
    expect(waso).toEqual({
      waso: 90,        // 3 wake slots after sleep
      wasoCount: 2,    // 2 wake episodes
      longestWaso: 60, // Longest is 2 slots
    });
  });

  it('should track longest WASO correctly', () => {
    const sleepStages = [1, 0, 1, 0, 0, 0, 1];
    const waso = calculateWaso(sleepStages);
    expect(waso).toEqual({
      waso: 120,       // 4 wake slots
      wasoCount: 2,    // 2 episodes
      longestWaso: 90, // Longest is 3 slots
    });
  });
});

describe('calculateStageRatios', () => {
  it('should calculate correct ratios', () => {
    const breakdown = { wake: 30, light: 30, deep: 30, rem: 30 };
    const ratios = calculateStageRatios(breakdown, 120);
    expect(ratios).toEqual({
      wake: 0.25,
      light: 0.25,
      deep: 0.25,
      rem: 0.25,
      sleep: 0.75,
    });
  });

  it('should handle zero time in bed', () => {
    const breakdown = { wake: 0, light: 0, deep: 0, rem: 0 };
    const ratios = calculateStageRatios(breakdown, 0);
    expect(ratios).toEqual({
      wake: 0,
      light: 0,
      deep: 0,
      rem: 0,
      sleep: 0,
    });
  });

  it('should calculate sleep ratio as combined light+deep+rem', () => {
    const breakdown = { wake: 60, light: 30, deep: 20, rem: 10 };
    const ratios = calculateStageRatios(breakdown, 120);
    expect(ratios.sleep).toBeCloseTo(0.5); // (30+20+10)/120
  });
});

describe('calculateSleepStatistics', () => {
  it('should calculate complete statistics correctly', () => {
    // Realistic sleep session: 8 hours (960 slots)
    // Wake 30min -> Light 2h -> Deep 1h -> REM 1h -> Light 2h -> Wake 1h30min
    const sleepStages = [
      ...Array(60).fill(0),   // 30min wake (sleep latency)
      ...Array(240).fill(1),  // 2h light
      ...Array(120).fill(2),  // 1h deep
      ...Array(120).fill(3),  // 1h REM
      ...Array(240).fill(1),  // 2h light
      ...Array(60).fill(0),   // 30min wake
      ...Array(120).fill(1),  // 1h light
    ];

    const stats = calculateSleepStatistics(sleepStages);

    expect(stats.timeInBed).toBe(960 * 30); // 28800 seconds = 8 hours
    expect(stats.sleepLatency).toBe(1800); // 30 minutes
    expect(stats.timeInWake).toBe(3600); // 1.5 hours
    expect(stats.timeInLight).toBe(18000); // 6 hours (240 + 240 + 120 = 600 slots)
    expect(stats.timeInDeep).toBe(3600); // 1 hour
    expect(stats.timeInRem).toBe(3600); // 1 hour
    expect(stats.timeInSleep).toBe(25200); // 7 hours (600 + 120 + 120 = 840 slots)
    expect(stats.sleepEfficiency).toBeCloseTo(0.875); // 25200/28800

    // WASO: 30min wake after sleep onset
    expect(stats.waso.waso).toBe(1800);
    expect(stats.waso.wasoCount).toBe(1);

    // Ratios
    expect(stats.ratios.sleep).toBeCloseTo(0.875);
    expect(stats.ratios.wake).toBeCloseTo(0.125);

    // New fields
    expect(stats.wakeupLatency).toBe(0); // ends with light sleep
    expect(stats.sleepCycleCount).toBeGreaterThanOrEqual(0);
    expect(typeof stats.sleepCycleCount).toBe('number');
    expect(stats.averageSleepCycle === null || typeof stats.averageSleepCycle === 'number').toBe(true);
  });

  it('should handle all-wake session', () => {
    const sleepStages = Array(100).fill(0);
    const stats = calculateSleepStatistics(sleepStages);

    expect(stats.timeInSleep).toBe(0);
    expect(stats.sleepEfficiency).toBe(0);
    expect(stats.sleepLatency).toBe(3000);
    expect(stats.waso.waso).toBe(0);

    // New fields
    expect(stats.wakeupLatency).toBe(0); // no sleep occurred
    expect(stats.sleepCycleCount).toBe(0);
    expect(stats.averageSleepCycle).toBe(null);
  });

  it('should handle immediate sleep with no wake', () => {
    const sleepStages = Array(100).fill(1);
    const stats = calculateSleepStatistics(sleepStages);

    expect(stats.timeInSleep).toBe(3000);
    expect(stats.sleepEfficiency).toBe(1);
    expect(stats.sleepLatency).toBe(0);
    expect(stats.waso.waso).toBe(0);

    // New fields
    expect(stats.wakeupLatency).toBe(0); // ends with light sleep
    expect(stats.sleepCycleCount).toBeGreaterThanOrEqual(0);
    expect(typeof stats.sleepCycleCount).toBe('number');
  });

  it('should use custom slot duration', () => {
    const sleepStages = [0, 1, 2, 3];
    const stats = calculateSleepStatistics(sleepStages, { slotDuration: 60 });

    expect(stats.timeInBed).toBe(240); // 4 slots * 60 seconds
    expect(stats.timeInWake).toBe(60);
    expect(stats.timeInLight).toBe(60);

    // New fields
    expect(typeof stats.wakeupLatency).toBe('number');
    expect(typeof stats.sleepCycleCount).toBe('number');
  });

  it('should calculate sleep cycles for realistic 8-hour sleep with multiple REM periods', () => {
    // Realistic 8-hour sleep with 3 complete sleep cycles
    // Each cycle: Light -> Deep -> Light -> REM (approximately 90-110 minutes)
    const sleepStages = [
      // Sleep latency: 15 minutes (30 slots)
      ...Array(30).fill(0),

      // Cycle 1: ~90 minutes (180 slots)
      ...Array(60).fill(1),   // 30min light
      ...Array(40).fill(2),   // 20min deep
      ...Array(40).fill(1),   // 20min light
      ...Array(40).fill(3),   // 20min REM (first REM cluster)

      // Cycle 2: ~100 minutes (200 slots)
      ...Array(60).fill(1),   // 30min light
      ...Array(50).fill(2),   // 25min deep
      ...Array(50).fill(1),   // 25min light
      ...Array(40).fill(3),   // 20min REM (second REM cluster)

      // Cycle 3: ~110 minutes (220 slots)
      ...Array(60).fill(1),   // 30min light
      ...Array(60).fill(2),   // 30min deep
      ...Array(60).fill(1),   // 30min light
      ...Array(40).fill(3),   // 20min REM (third REM cluster)

      // Final light sleep before waking: 30 minutes (60 slots)
      ...Array(60).fill(1),

      // Wakeup period: 15 minutes (30 slots)
      ...Array(30).fill(0),
    ];

    const stats = calculateSleepStatistics(sleepStages);

    // Basic statistics
    expect(stats.timeInBed).toBe(sleepStages.length * 30);
    expect(stats.sleepLatency).toBe(900); // 15 minutes
    expect(stats.timeInRem).toBe(3600); // 120 slots * 30 = 60 minutes total REM

    // Sleep cycle verification
    expect(stats.sleepCycleCount).toBe(3); // 3 REM clusters = 3 cycles
    expect(stats.averageSleepCycle).not.toBe(null);
    if (stats.averageSleepCycle !== null) {
      // Average cycle should be around 90-110 minutes
      expect(stats.averageSleepCycle).toBeGreaterThan(5000); // > 83 minutes
      expect(stats.averageSleepCycle).toBeLessThan(7200); // < 120 minutes
    }

    // Wakeup latency: 15 minutes from last sleep to end
    expect(stats.wakeupLatency).toBe(900);

    // All existing fields should still be present
    expect(stats.timeInSleep).toBeGreaterThan(0);
    expect(stats.sleepEfficiency).toBeGreaterThan(0);
    expect(stats.waso).toBeDefined();
    expect(stats.ratios).toBeDefined();
  });
});

describe('calculateKeyMoments', () => {
  it('should find all indices and counts with normal sleep pattern', () => {
    // Wake -> Light -> Deep -> REM -> Light -> Wake
    const sleepStages = [0, 0, 1, 1, 2, 2, 3, 3, 1, 1, 0, 0];
    const moments = calculateKeyMoments(sleepStages);

    expect(moments.firstSleepIdx).toBe(2);  // First light sleep
    expect(moments.lastSleepIdx).toBe(9);   // Last light sleep
    expect(moments.firstLightIdx).toBe(2);
    expect(moments.firstDeepIdx).toBe(4);
    expect(moments.firstRemIdx).toBe(6);

    expect(moments.lightCount).toBe(4);
    expect(moments.deepCount).toBe(2);
    expect(moments.remCount).toBe(2);
    expect(moments.wakeCount).toBe(0); // Wake between first and last sleep
  });

  it('should return -1 for all sleep indices when all wake stages', () => {
    const sleepStages = [0, 0, 0, 0, 0];
    const moments = calculateKeyMoments(sleepStages);

    expect(moments.firstSleepIdx).toBe(-1);
    expect(moments.lastSleepIdx).toBe(-1);
    expect(moments.firstLightIdx).toBe(-1);
    expect(moments.firstDeepIdx).toBe(-1);
    expect(moments.firstRemIdx).toBe(-1);

    expect(moments.wakeCount).toBe(5);
    expect(moments.lightCount).toBe(0);
    expect(moments.deepCount).toBe(0);
    expect(moments.remCount).toBe(0);
  });

  it('should return -1 for firstRemIdx when no REM sleep', () => {
    const sleepStages = [0, 1, 1, 2, 2, 1, 0];
    const moments = calculateKeyMoments(sleepStages);

    expect(moments.firstSleepIdx).toBe(1);
    expect(moments.lastSleepIdx).toBe(5);
    expect(moments.firstLightIdx).toBe(1);
    expect(moments.firstDeepIdx).toBe(3);
    expect(moments.firstRemIdx).toBe(-1);

    expect(moments.lightCount).toBe(3);
    expect(moments.deepCount).toBe(2);
    expect(moments.remCount).toBe(0);
  });

  it('should ignore NO_DATA values in counts', () => {
    const sleepStages = [0, -1, 1, -1, 2, -1, 3, -1, 0];
    const moments = calculateKeyMoments(sleepStages);

    // NO_DATA is treated as "not wake", so firstSleepIdx is at index 1 (first NO_DATA)
    expect(moments.firstSleepIdx).toBe(1);
    expect(moments.lastSleepIdx).toBe(7);

    expect(moments.lightCount).toBe(1);
    expect(moments.deepCount).toBe(1);
    expect(moments.remCount).toBe(1);
    // Wake count: 2 total wakes - firstSleepIdx (1) - (lastIdx - lastSleepIdx) (8-7=1) = 2-1-1 = 0
    expect(moments.wakeCount).toBe(0);
  });

  it('should exclude pre-sleep and post-wake periods from wake count', () => {
    // Wake(pre-sleep) -> Light -> Wake(WASO) -> Light -> Wake(post-sleep)
    const sleepStages = [0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0];
    const moments = calculateKeyMoments(sleepStages);

    expect(moments.firstSleepIdx).toBe(3);
    expect(moments.lastSleepIdx).toBe(8);
    expect(moments.wakeCount).toBe(2); // Only 2 wake slots between first and last sleep (indices 5-6)
  });

  it('should handle immediate sleep with no sleep latency', () => {
    const sleepStages = [1, 1, 2, 2, 3, 3];
    const moments = calculateKeyMoments(sleepStages);

    expect(moments.firstSleepIdx).toBe(0);
    expect(moments.lastSleepIdx).toBe(5);
    expect(moments.wakeCount).toBe(0);
    expect(moments.lightCount).toBe(2);
    expect(moments.deepCount).toBe(2);
    expect(moments.remCount).toBe(2);
  });
});

describe('calculateWakeupLatency', () => {
  it('should calculate normal wakeup latency with wake periods at end', () => {
    // Sleep ends, then wake periods
    const sleepStages = [0, 0, 1, 1, 2, 2, 0, 0, 0];
    const latency = calculateWakeupLatency(sleepStages);

    expect(latency).toBe(90); // 3 slots * 30 seconds from last sleep (idx 5) to end (idx 8)
  });

  it('should return 0 for sleep until last slot', () => {
    // Sleep until very end (last slot)
    const sleepStages = [0, 0, 1, 1, 2, 2, 3, 3];
    const latency = calculateWakeupLatency(sleepStages);

    expect(latency).toBe(0); // Last sleep at idx 7, which is the last slot (7 - 7 = 0)
  });

  it('should return 0 for no wakeup latency when sleep until end', () => {
    // Sleep continues to last slot
    const sleepStages = [0, 0, 1, 1, 2, 2, 3];
    const latency = calculateWakeupLatency(sleepStages);

    expect(latency).toBe(0); // Last sleep at idx 6 (end), distance = 0
  });

  it('should return 0 when never sleeps', () => {
    const sleepStages = [0, 0, 0, 0, 0];
    const latency = calculateWakeupLatency(sleepStages);

    expect(latency).toBe(0); // Never sleeps, returns 0
  });

  it('should work with custom slot duration', () => {
    const sleepStages = [1, 1, 0, 0, 0];
    const latency = calculateWakeupLatency(sleepStages, 60);

    expect(latency).toBe(180); // 3 slots * 60 seconds
  });
});

describe('calculateRemClusters', () => {
  it('should return empty array when no REM sleep', () => {
    const sleepStages = [0, 1, 1, 2, 2, 1, 0];
    const clusters = calculateRemClusters(sleepStages);

    expect(clusters).toEqual([]);
  });

  it('should return single REM cluster', () => {
    // Need at least THRESHOLD_REM_COUNT (20) REM periods
    const sleepStages = [
      0, 1, 1,
      ...Array(20).fill(3), // 20 REM slots (meets threshold)
      1, 0,
    ];
    const clusters = calculateRemClusters(sleepStages);

    expect(clusters).toEqual([[3, 22]]); // REM from idx 3 to 22
    expect(clusters.length).toBe(1);
  });

  it('should detect multiple REM clusters with proper distance', () => {
    // Two REM clusters separated by more than 20 epochs
    // Each cluster needs at least 20 REM slots
    const sleepStages = [
      0, 0,                          // Wake
      1, 1,                          // Light
      ...Array(20).fill(3),          // First cluster: 20 REM slots (idx 4-23)
      ...Array(22).fill(1),          // 22 light slots (distance > 20 threshold)
      ...Array(20).fill(3),          // Second cluster: 20 REM slots (idx 46-65)
      0, 0,                          // Wake
    ];
    const clusters = calculateRemClusters(sleepStages);

    expect(clusters.length).toBe(2);
    expect(clusters[0]).toEqual([4, 23]);
    expect(clusters[1]).toEqual([46, 65]);
  });

  it('should filter out REM clusters below minimum count threshold', () => {
    // THRESHOLD_REM_COUNT is 20, so 19 REM periods should be filtered out
    const sleepStages = [
      0, 1, 1,
      ...Array(19).fill(3), // 19 REM slots (below 20 threshold)
      1, 0,
    ];
    const clusters = calculateRemClusters(sleepStages);

    expect(clusters).toEqual([]); // Only 19 REM slots, below threshold of 20
  });

  it('should group REM periods within distance threshold into same cluster', () => {
    // REM periods separated by small distances (< 20 epochs) should be grouped
    // Need at least 20 total REM slots
    const sleepStages = [
      0, 1,                    // Wake and light
      ...Array(10).fill(3),    // 10 REM (idx 2-11)
      ...Array(5).fill(1),     // 5 light slots (distance < 20)
      ...Array(10).fill(3),    // 10 REM (idx 17-26)
      0,                       // Wake
    ];
    const clusters = calculateRemClusters(sleepStages);

    expect(clusters.length).toBe(1); // All grouped into one cluster (20 total REM slots)
    expect(clusters[0]).toEqual([2, 26]);
  });

  it('should handle NO_DATA values correctly', () => {
    // NO_DATA values should not break REM cluster detection
    const sleepStages = [
      0, 1,
      ...Array(20).fill(3), // 20 REM slots with NO_DATA interspersed
      -1, -1,
      1, 0,
    ];
    const clusters = calculateRemClusters(sleepStages);

    expect(clusters).toEqual([[2, 21]]); // 20 REM slots from idx 2-21
  });
});

describe('calculateSleepCycles', () => {
  it('should return 0 cycles and null average when no REM', () => {
    const sleepStages = [0, 1, 1, 2, 2, 1, 0];
    const cycleInfo = calculateSleepCycles(sleepStages);

    expect(cycleInfo.cycleCount).toBe(0);
    expect(cycleInfo.averageCycle).toBeNull();
  });

  it('should return 1 cycle and calculate average for single REM cluster', () => {
    const sleepStages = [
      0, 1, 1,
      ...Array(20).fill(3), // 20 REM slots (one cluster)
      1, 0,
    ];
    const cycleInfo = calculateSleepCycles(sleepStages);

    expect(cycleInfo.cycleCount).toBe(1);
    // With 1 cluster, average is distance from sleep onset to cluster end
    // firstSleepIdx=1, clusterEnd=22, distance=21 epochs * 30s = 630s
    expect(cycleInfo.averageCycle).toBe(630);
  });

  it('should calculate average cycle duration with two REM clusters', () => {
    // Need at least 20 REM slots per cluster
    const sleepStages = [
      0, 0,                          // Wake
      1, 1,                          // Light (first sleep at idx 2)
      ...Array(20).fill(3),          // First cluster: 20 REM (idx 4-23)
      ...Array(22).fill(1),          // 22 light slots
      ...Array(20).fill(3),          // Second cluster: 20 REM (idx 46-65)
      0, 0,                          // Wake
    ];
    const cycleInfo = calculateSleepCycles(sleepStages);

    expect(cycleInfo.cycleCount).toBe(2);

    // Distance from first sleep (idx 2) to first cluster end (idx 23) = 21 epochs
    // Distance from first cluster end (idx 23) to second cluster end (idx 65) = 42 epochs
    // Total distance = 21 + 42 = 63 epochs
    // Average = 63 / 2 = 31.5 epochs = 31.5 * 30 = 945 seconds
    expect(cycleInfo.averageCycle).toBeCloseTo(945);
  });

  it('should calculate average with multiple cycles and varying distances', () => {
    // Creating 3 REM clusters with at least 20 REM slots each
    // Distance between clusters must be > 20 epochs to form separate clusters
    const sleepStages = [
      0, 0,                          // Wake
      1, 1,                          // Light (first sleep at idx 2)
      ...Array(20).fill(3),          // First cluster (idx 4-23)
      ...Array(22).fill(1),          // 22 light slots (distance > 20)
      ...Array(20).fill(3),          // Second cluster (idx 46-65)
      ...Array(22).fill(1),          // 22 light slots (distance > 20)
      ...Array(20).fill(3),          // Third cluster (idx 88-107)
      0,                             // Wake
    ];
    const cycleInfo = calculateSleepCycles(sleepStages);

    expect(cycleInfo.cycleCount).toBe(3);

    // Distance from first sleep (idx 2) to first cluster end (idx 23) = 21 epochs
    // Distance from first cluster end (idx 23) to second cluster end (idx 65) = 42 epochs
    // Distance from second cluster end (idx 65) to third cluster end (idx 107) = 42 epochs
    // Total distance = 21 + 42 + 42 = 105 epochs
    // Average = 105 / 3 = 35 epochs = 35 * 30 = 1050 seconds
    expect(cycleInfo.averageCycle).toBeCloseTo(1050);
  });

  it('should use custom slot duration', () => {
    const sleepStages = [
      1, 1,                          // Light (first sleep at idx 0)
      ...Array(20).fill(3),          // First cluster (idx 2-21)
      ...Array(22).fill(1),          // 22 light slots
      ...Array(20).fill(3),          // Second cluster (idx 44-63)
    ];
    const cycleInfo = calculateSleepCycles(sleepStages, 60);

    expect(cycleInfo.cycleCount).toBe(2);

    // Distance from first sleep (idx 0) to first cluster end (idx 21) = 21 epochs
    // Distance from first cluster end (idx 21) to second cluster end (idx 63) = 42 epochs
    // Total distance = 21 + 42 = 63 epochs
    // Average = 63 / 2 = 31.5 epochs = 31.5 * 60 = 1890 seconds
    expect(cycleInfo.averageCycle).toBeCloseTo(1890);
  });
});
