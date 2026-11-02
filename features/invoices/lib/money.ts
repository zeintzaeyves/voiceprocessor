/**
 * Money primitives. All amounts are integers in a currency's minor unit
 * (cents for USD, yen for JPY, fils for KWD). Intermediate products use
 * BigInt so no financial value ever passes through floating-point maths.
 *
 * Rounding policy: half away from zero, applied once per derived value
 * (each line total, the discount, the tax).
 */

const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW",
  "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

const THREE_DECIMAL_CURRENCIES = new Set([
  "BHD", "IQD", "JOD", "KWD", "LYD", "OMR", "TND",
]);

/** Largest value (in minor units) we accept for any single amount. */
export const MAX_MINOR_AMOUNT = 1_000_000_000_000; // 1e12

/** Quantities are stored with at most this many decimal places. */
export const QUANTITY_DECIMALS = 3;
const QUANTITY_SCALE = 10 ** QUANTITY_DECIMALS;
export const MAX_QUANTITY = 1_000_000;

/** Percentages (tax, discount) keep at most two decimals: 8.25 %. */
export const PERCENT_DECIMALS = 2;
const PERCENT_SCALE = 10 ** PERCENT_DECIMALS;

export function getCurrencyExponent(currency: string): number {
  const code = currency.toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(code)) return 3;
  return 2;
}

/** Round-half-away-from-zero integer division on BigInt. */
function divideRounded(numerator: bigint, denominator: bigint): bigint {
  const negative = numerator < 0n !== denominator < 0n;
  const n = numerator < 0n ? -numerator : numerator;
  const d = denominator < 0n ? -denominator : denominator;
  const quotient = (2n * n + d) / (2n * d);
  return negative ? -quotient : quotient;
}

function toSafeNumber(value: bigint): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError("Amount is too large to represent safely.");
  }
  return result;
}

/** Converts a decimal quantity to an integer count of 1/1000ths. */
export function quantityToScaled(quantity: number): number {
  return Math.round(quantity * QUANTITY_SCALE);
}

/** Converts a percentage (e.g. 8.25) to an integer count of 1/100ths of a percent. */
export function percentToScaled(percent: number): number {
  return Math.round(percent * PERCENT_SCALE);
}

/** True when the number has no more than `decimals` fractional digits. */
export function hasAtMostDecimals(value: number, decimals: number): boolean {
  if (!Number.isFinite(value)) return false;
  const scale = 10 ** decimals;
  return Math.abs(value * scale - Math.round(value * scale)) < 1e-6;
}

/** quantity × unit price, rounded to a whole minor unit. */
export function multiplyQuantity(
  quantity: number,
  unitPriceMinor: number,
): number {
  const scaled = BigInt(quantityToScaled(quantity));
  return toSafeNumber(
    divideRounded(scaled * BigInt(unitPriceMinor), BigInt(QUANTITY_SCALE)),
  );
}

/** amount × percent / 100, rounded to a whole minor unit. */
export function applyPercent(amountMinor: number, percent: number): number {
  const scaled = BigInt(percentToScaled(percent));
  return toSafeNumber(
    divideRounded(
      BigInt(amountMinor) * scaled,
      BigInt(100 * PERCENT_SCALE),
    ),
  );
}

/**
 * Parses user text such as "1,250.5" into minor units for `currency`.
 * Returns null when the text is not a valid non-negative amount with a
 * permitted number of decimal places.
 */
export function parseMoneyInput(
  input: string,
  currency: string,
): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (cleaned === "") return null;

  const exponent = getCurrencyExponent(currency);
  const match = cleaned.match(/^(\d+)(?:\.(\d*))?$/);
  if (!match) return null;

  const [, whole, fraction = ""] = match;
  if (fraction.length > exponent) return null;

  const minor = BigInt(whole + fraction.padEnd(exponent, "0"));
  if (minor > BigInt(MAX_MINOR_AMOUNT)) return null;

  return Number(minor);
}

/** Minor units → plain decimal string for an input field ("1250.50"). */
export function minorToInputString(
  amountMinor: number,
  currency: string,
): string {
  const exponent = getCurrencyExponent(currency);
  return (amountMinor / 10 ** exponent).toFixed(exponent);
}

export function formatMoney(
  amountMinor: number,
  currency: string,
  locale = "en-US",
): string {
  const exponent = getCurrencyExponent(currency);
  const major = amountMinor / 10 ** exponent;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(exponent)}`;
  }
}

/**
 * Legacy records stored every currency with two decimals. Re-expresses such
 * an amount in the currency's true minor unit.
 */
export function convertLegacyMinor(
  legacyMinor: number,
  currency: string,
): number {
  const exponent = getCurrencyExponent(currency);
  if (exponent === 2) return legacyMinor;
  return Math.round((legacyMinor / 100) * 10 ** exponent);
}
