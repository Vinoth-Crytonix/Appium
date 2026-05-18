/**
 * Pure random-data generators — no driver, no state, fully unit-testable.
 *
 * Extracting these keeps the page objects free of inline data fabrication
 * (Single Responsibility: a page drives a screen; it does not invent values).
 */

const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/** Random alphanumeric string of the given length. */
export function randomAlnum(len: number): string {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += ALNUM[Math.floor(Math.random() * ALNUM.length)];
  }
  return out;
}

/** Random integer in `[min, maxExclusive)`. */
export function randomInt(min: number, maxExclusive: number): number {
  return min + Math.floor(Math.random() * (maxExclusive - min));
}

/**
 * Random positive amount with at most `maxDigits` digits, as a string.
 * Mirrors the original PayTo "random amount" logic: the lower bound is the
 * smallest `maxDigits`-digit number (so short amounts are avoided).
 */
export function randomAmount(maxDigits: number): string {
  const upper = Math.pow(10, maxDigits);
  const lower = Math.max(1, Math.pow(10, Math.max(1, maxDigits - 1)));
  return String(randomInt(lower, upper));
}
