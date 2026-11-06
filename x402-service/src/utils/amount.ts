import { TINYBARS_PER_HBAR } from "../constants";

/**
 * Validates and converts an integer tinybar count to a safe positive number.
 * Fails closed on negative, zero, non-integer, or overflowing values.
 */
export function validateTinybarAmount(tinybars: unknown): number {
  if (typeof tinybars === "bigint") {
    if (tinybars <= 0n) {
      throw new TypeError("Tinybar amount must be strictly positive.");
    }
    if (tinybars > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new RangeError("Tinybar amount exceeds JavaScript MAX_SAFE_INTEGER.");
    }
    return Number(tinybars);
  }

  if (typeof tinybars === "number") {
    if (!Number.isSafeInteger(tinybars) || tinybars <= 0) {
      throw new TypeError("Tinybar amount must be a positive safe integer.");
    }
    return tinybars;
  }

  if (typeof tinybars === "string") {
    const trimmed = tinybars.trim();
    if (!/^[1-9][0-9]*$/.test(trimmed)) {
      throw new TypeError(`Invalid integer tinybar string format: "${tinybars}"`);
    }
    const parsed = Number(trimmed);
    if (!Number.isSafeInteger(parsed)) {
      throw new RangeError("Tinybar string exceeds JavaScript safe integer range.");
    }
    return parsed;
  }

  throw new TypeError(`Unsupported tinybar amount type: ${typeof tinybars}`);
}

/**
 * Converts a string or numeric HBAR amount to exact integer tinybars.
 * 1 HBAR = 100,000,000 tinybars (8 decimal places).
 * Uses string splitting to guarantee zero floating point inaccuracies.
 */
export function hbarToTinybars(hbar: string | number): number {
  const hbarStr = typeof hbar === "number" ? hbar.toString() : hbar.trim();

  if (!/^[0-9]+(\.[0-9]+)?$/.test(hbarStr)) {
    throw new TypeError(`Invalid HBAR amount format: "${hbar}"`);
  }

  const [wholePart, fracPart = ""] = hbarStr.split(".");
  if (fracPart.length > 8) {
    throw new TypeError(`HBAR amount cannot have more than 8 decimal places: "${hbarStr}"`);
  }

  const paddedFrac = fracPart.padEnd(8, "0");
  const tinybarsBigInt = BigInt(wholePart) * TINYBARS_PER_HBAR + BigInt(paddedFrac);

  return validateTinybarAmount(tinybarsBigInt);
}

/**
 * Converts integer tinybars to exact string HBAR with up to 8 decimal places.
 */
export function tinybarsToHbar(tinybars: number | bigint): string {
  const safeTinybars = validateTinybarAmount(tinybars);
  const tbBigInt = BigInt(safeTinybars);

  const whole = tbBigInt / TINYBARS_PER_HBAR;
  const remainder = tbBigInt % TINYBARS_PER_HBAR;

  if (remainder === 0n) {
    return whole.toString();
  }

  const remainderStr = remainder.toString().padStart(8, "0");
  const trimmedRemainder = remainderStr.replace(/0+$/, "");
  return `${whole}.${trimmedRemainder}`;
}
