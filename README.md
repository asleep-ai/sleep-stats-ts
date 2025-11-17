# Sleep Statistics Calculator

A standalone TypeScript library for calculating comprehensive sleep statistics from hypnogram arrays (30-second sleep stage time slots).

## What is a Hypnogram?

A **hypnogram** (also called sleep stages array) is an array where each element represents a 30-second time slot of sleep tracking data:

- **Index**: Time offset (index 0 = 0s, index 1 = 30s, index 2 = 60s, etc.)
- **Value**: Sleep stage during that slot
  - `0` = Wake
  - `1` = Light Sleep
  - `2` = Deep Sleep
  - `3` = REM Sleep
  - `-1` = No Data

## Features

- Zero runtime dependencies
- Pure TypeScript with full type definitions
- Comprehensive sleep metrics calculation
- Sleep cycle detection from REM clusters
- Wakeup latency calculation
- Key moments tracking
- Support for custom slot durations
- Well-tested with realistic sleep data

## Installation

```bash
npm install @asleep-ai/sleep-stats
# or
yarn add @asleep-ai/sleep-stats
```

## Usage

### Basic Usage

```typescript
import { calculateSleepStatistics } from '@asleep-ai/sleep-stats';

// Example: 8-hour sleep session with 30-second slots
const sleepStages = [
  ...Array(60).fill(0),   // 30min awake (sleep latency)
  ...Array(240).fill(1),  // 2h light sleep
  ...Array(120).fill(2),  // 1h deep sleep
  ...Array(120).fill(3),  // 1h REM sleep
  ...Array(240).fill(1),  // 2h light sleep
  ...Array(60).fill(0),   // 30min wake (WASO)
  ...Array(120).fill(1),  // 1h light sleep
];

const stats = calculateSleepStatistics(sleepStages);

console.log(stats);
// {
//   timeInBed: 28800,           // 8 hours in seconds
//   timeInSleep: 23400,         // 6.5 hours in seconds
//   timeInWake: 3600,           // 1.5 hours in seconds
//   timeInLight: 16200,         // 4.5 hours
//   timeInDeep: 3600,           // 1 hour
//   timeInRem: 3600,            // 1 hour
//   sleepEfficiency: 0.8125,    // 81.25%
//   sleepLatency: 1800,         // 30 minutes to fall asleep
//   wakeupLatency: 0,           // Time from last sleep to end
//   latencies: {
//     sleep: 1800,
//     light: 1800,
//     deep: 5400,
//     rem: 9000
//   },
//   ratios: {
//     wake: 0.125,
//     light: 0.5625,
//     deep: 0.125,
//     rem: 0.125,
//     sleep: 0.8125
//   },
//   waso: {
//     waso: 1800,              // 30min wake after sleep onset
//     wasoCount: 1,            // 1 wake episode
//     longestWaso: 1800        // Longest wake episode: 30min
//   },
//   timeInSleepPeriod: 25200,  // timeInSleep + waso
//   stageBreakdown: {          // Same as timeIn* values
//     wake: 3600,
//     light: 16200,
//     deep: 3600,
//     rem: 3600
//   },
//   sleepCycleCount: 1,        // Number of detected sleep cycles
//   averageSleepCycle: 9000    // Average cycle duration (2.5h)
// }
```

### Advanced Usage

#### Custom Slot Duration

```typescript
import { calculateSleepStatistics } from '@asleep-ai/sleep-stats';

// Use 60-second slots instead of 30-second
const sleepStages = [0, 1, 2, 3];
const stats = calculateSleepStatistics(sleepStages, { slotDuration: 60 });

console.log(stats.timeInBed); // 240 seconds (4 slots * 60s)
```

#### Individual Calculations

```typescript
import {
  calculateStageBreakdown,
  calculateSleepLatency,
  calculateWaso,
  calculateStageRatios,
  calculateWakeupLatency,
  calculateKeyMoments,
  calculateSleepCycles,
} from '@asleep-ai/sleep-stats';

const sleepStages = [0, 0, 1, 1, 2, 3];

// Calculate just the stage breakdown
const breakdown = calculateStageBreakdown(sleepStages);
// { wake: 60, light: 60, deep: 30, rem: 30 }

// Calculate just sleep latency
const latency = calculateSleepLatency(sleepStages);
// 60 (2 slots until sleep onset)

// Calculate wakeup latency
const wakeupLatency = calculateWakeupLatency(sleepStages);
// 0 (no wake time after last sleep stage)

// Calculate WASO
const waso = calculateWaso(sleepStages);
// { waso: 0, wasoCount: 0, longestWaso: 0 }

// Calculate key moments
const moments = calculateKeyMoments(sleepStages);
// { firstSleepIdx: 2, lastSleepIdx: 5, ... }

// Calculate sleep cycles
const cycles = calculateSleepCycles(sleepStages);
// { cycleCount: 0, averageCycle: null }

// Calculate ratios
const timeInBed = sleepStages.length * 30;
const ratios = calculateStageRatios(breakdown, timeInBed);
// { wake: 0.33, light: 0.33, deep: 0.17, rem: 0.17, sleep: 0.67 }
```

## API Reference

### Types

```typescript
enum SleepStage {
  WAKE = 0,
  LIGHT = 1,
  DEEP = 2,
  REM = 3,
  NO_DATA = -1,
}

interface StageBreakdown {
  wake: number;   // seconds
  light: number;  // seconds
  deep: number;   // seconds
  rem: number;    // seconds
}

interface StageLatencies {
  sleep: number;  // Time until first non-wake stage
  light: number;  // Time until first light sleep
  deep: number;   // Time until first deep sleep
  rem: number;    // Time until first REM sleep
}

interface StageRatios {
  wake: number;   // 0-1
  light: number;  // 0-1
  deep: number;   // 0-1
  rem: number;    // 0-1
  sleep: number;  // Combined sleep ratio (0-1)
}

interface WasoStatistics {
  waso: number;         // Total wake time after sleep onset (seconds)
  wasoCount: number;    // Number of wake episodes
  longestWaso: number;  // Longest wake episode (seconds)
}

interface SleepMoments {
  firstSleepIdx: number;  // Index of first non-wake stage
  lastSleepIdx: number;   // Index of last non-wake stage
  firstLightIdx: number;  // Index of first light sleep (-1 if never reached)
  firstDeepIdx: number;   // Index of first deep sleep (-1 if never reached)
  firstRemIdx: number;    // Index of first REM sleep (-1 if never reached)
  wakeCount: number;      // Count of wake stages between first and last sleep
  lightCount: number;     // Count of light sleep stages
  deepCount: number;      // Count of deep sleep stages
  remCount: number;       // Count of REM sleep stages
}

interface SleepCycleInfo {
  cycleCount: number;        // Number of complete sleep cycles
  averageCycle: number | null;  // Average cycle duration in seconds (null if no cycles)
}

interface SleepStatistics {
  timeInBed: number;
  timeInSleep: number;
  timeInWake: number;
  timeInDeep: number;
  timeInLight: number;
  timeInRem: number;
  sleepEfficiency: number;
  sleepLatency: number;
  wakeupLatency: number;
  latencies: StageLatencies;
  ratios: StageRatios;
  waso: WasoStatistics;
  timeInSleepPeriod: number;
  stageBreakdown: StageBreakdown;
  sleepCycleCount: number;
  averageSleepCycle: number | null;
}
```

### Functions

#### `calculateSleepStatistics(sleepStages, options?)`

Calculate complete sleep statistics from a hypnogram array.

**Parameters:**
- `sleepStages: number[]` - Array of sleep stage values
- `options?: CalculationOptions` - Optional configuration
  - `slotDuration?: number` - Duration of each slot in seconds (default: 30)

**Returns:** `SleepStatistics`

#### `calculateStageBreakdown(sleepStages, slotDuration?)`

Calculate time spent in each sleep stage.

**Parameters:**
- `sleepStages: number[]` - Array of sleep stage values
- `slotDuration?: number` - Duration of each slot in seconds (default: 30)

**Returns:** `StageBreakdown`

#### `calculateSleepLatency(sleepStages, slotDuration?)`

Calculate sleep latency (time until first non-wake stage).

**Returns:** `number` (seconds)

#### `calculateStageLatencies(sleepStages, slotDuration?)`

Calculate latencies to reach each sleep stage.

**Returns:** `StageLatencies`

#### `calculateWaso(sleepStages, slotDuration?)`

Calculate Wake After Sleep Onset (WASO) statistics.

**Returns:** `WasoStatistics`

#### `calculateKeyMoments(sleepStages, slotDuration?)`

Identify critical indices and stage counts for sleep analysis.

**Parameters:**
- `sleepStages: number[]` - Array of sleep stage values

**Returns:** `SleepMoments`

#### `calculateWakeupLatency(sleepStages, slotDuration?)`

Calculate time from last sleep stage to end of recording.

**Parameters:**
- `sleepStages: number[]` - Array of sleep stage values
- `slotDuration?: number` - Duration of each slot in seconds (default: 30)

**Returns:** `number` (seconds)

#### `calculateRemClusters(sleepStages)`

Detect continuous or nearby REM periods that form clusters. A REM cluster is a sequence of REM periods separated by no more than THRESHOLD_REM_CLUSTER_DISTANCE epochs (20 epochs = 10 minutes). Only clusters with at least THRESHOLD_REM_COUNT REM epochs are considered valid.

**Parameters:**
- `sleepStages: number[]` - Array of sleep stage values

**Returns:** `number[][]` - Array of [startIdx, endIdx] pairs for each valid REM cluster

#### `calculateSleepCycles(sleepStages, slotDuration?)`

Calculate sleep cycle information from REM clusters. Each REM cluster represents one complete sleep cycle.

**Parameters:**
- `sleepStages: number[]` - Array of sleep stage values
- `slotDuration?: number` - Duration of each slot in seconds (default: 30)

**Returns:** `SleepCycleInfo`

#### `calculateStageRatios(breakdown, timeInBed)`

Calculate ratios of time spent in each stage.

**Parameters:**
- `breakdown: StageBreakdown` - Stage breakdown in seconds
- `timeInBed: number` - Total tracking duration in seconds

**Returns:** `StageRatios`

## Constants

```typescript
import {
  SLOT_DURATION_SECONDS,
  SLEEP_STAGE,
  SECONDS_IN_ONE_HOUR,
  THRESHOLD_REM_CLUSTER_DISTANCE,
  THRESHOLD_REM_COUNT
} from '@asleep-ai/sleep-stats';

console.log(SLOT_DURATION_SECONDS); // 30
console.log(SECONDS_IN_ONE_HOUR); // 3600

console.log(SLEEP_STAGE);
// { WAKE: 0, LIGHT: 1, DEEP: 2, REM: 3, NO_DATA: -1 }

console.log(THRESHOLD_REM_CLUSTER_DISTANCE); // 20 epochs (10 minutes)
console.log(THRESHOLD_REM_COUNT); // 20 minimum REM epochs for valid cluster
```

## Key Metrics Explained

### Sleep Efficiency
Percentage of time spent asleep while in bed.
```
sleepEfficiency = timeInSleep / timeInBed
```

### Sleep Latency
Time taken to fall asleep (first non-wake stage).

### Wakeup Latency
Time from the last sleep stage to the end of the recording. This represents the final wake period before the recording ended.

### WASO (Wake After Sleep Onset)
Total time spent awake after initially falling asleep. Does not include wake time before sleep onset (sleep latency) or after final wake.

### Stage Latencies
Time taken to reach each sleep stage:
- **Sleep Latency**: Time to any sleep stage
- **Light Latency**: Time to first light sleep
- **Deep Latency**: Time to first deep sleep
- **REM Latency**: Time to first REM sleep

### Sleep Cycles
Number of REM clusters detected in the sleep session. Each REM cluster represents a complete sleep cycle. Sleep cycles typically last 90-120 minutes and progress through stages: Light → Deep → REM. The library detects these cycles by identifying REM clusters (groups of REM periods separated by no more than 10 minutes).

### Time in Sleep Period
Total time from sleep onset to final wake, including both sleep and wake periods.
```
timeInSleepPeriod = timeInSleep + waso
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Watch mode
npm run dev
```

## Publishing

This package uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated publishing. Releases are triggered by commit messages following [Conventional Commits](https://www.conventionalcommits.org/):

- `fix: description` → Patch release (0.1.0 → 0.1.1)
- `feat: description` → Minor release (0.1.0 → 0.2.0)
- `feat!: description` or `BREAKING CHANGE:` → Major release (0.1.0 → 1.0.0)

Releases happen automatically when changes are pushed to the main branch.

## License

MIT

## Contributing

Contributions are welcome. Please open an issue or submit a pull request.