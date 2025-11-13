/**
 * Round a number to specified decimal places using half-to-even rounding (banker's rounding)
 * This method reduces bias by rounding 0.5 to the nearest even number
 *
 * Examples:
 * - round(0.5, 0) → 0
 * - round(1.5, 0) → 2
 * - round(2.5, 0) → 2
 * - round(0.125, 2) → 0.12
 * - round(0.135, 2) → 0.14
 *
 * @param value Number to round
 * @param precision Number of decimal places
 * @returns Rounded value
 */
export function round(value: number, precision: number): number {
  const multiplier = Math.pow(10, precision);
  const scaled = value * multiplier;
  const floored = Math.floor(scaled);
  const fraction = scaled - floored;

  // Handle floating-point precision issues
  const epsilon = 1e-10;

  if (Math.abs(fraction - 0.5) < epsilon) {
    // If exactly 0.5, round to nearest even number
    return (floored % 2 === 0 ? floored : floored + 1) / multiplier;
  }

  // Otherwise use standard rounding
  return Math.round(scaled) / multiplier;
}

/**
 * Round a number to 2 decimal places using half-to-even rounding
 * @param value Number to round
 * @returns Rounded value
 */
export function roundSecond(value: number): number {
  return round(value, 2);
}

/**
 * Round a number to nearest integer using floor(x + 0.5) method
 * Matches Python's to_int() behavior
 * @param value Number to round
 * @returns Rounded integer
 */
export function toInt(value: number): number {
  return Math.floor(value + 0.5);
}
