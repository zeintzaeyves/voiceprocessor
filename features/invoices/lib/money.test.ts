import { describe, expect, it } from "vitest";
import {
  applyPercent,
  convertLegacyMinor,
  formatMoney,
  getCurrencyExponent,
  hasAtMostDecimals,
  minorToInputString,
  multiplyQuantity,
  parseMoneyInput,
} from "./money";

describe("getCurrencyExponent", () => {
  it("knows zero-, two- and three-decimal currencies", () => {
    expect(getCurrencyExponent("JPY")).toBe(0);
    expect(getCurrencyExponent("usd")).toBe(2);
    expect(getCurrencyExponent("KWD")).toBe(3);
  });
});

describe("multiplyQuantity", () => {
  it("is exact for whole quantities", () => {
    expect(multiplyQuantity(3, 1999)).toBe(5997);
  });

  it("avoids the classic float error (0.1 + 0.2 style)", () => {
    // 1.1 * 3 is 3.3000000000000003 in floating point.
    expect(multiplyQuantity(1.1, 300)).toBe(330);
    expect(multiplyQuantity(0.07, 100)).toBe(7);
  });

  it("rounds half away from zero", () => {
    expect(multiplyQuantity(0.5, 1)).toBe(1); // 0.5 -> 1
    expect(multiplyQuantity(1.5, 1)).toBe(2); // 1.5 -> 2
    expect(multiplyQuantity(0.333, 100)).toBe(33); // 33.3 -> 33
  });

  it("stays exact when the intermediate product exceeds MAX_SAFE_INTEGER", () => {
    // 999_999_000 (scaled qty) × 9e9 ≈ 9e18 > 2^53, but the result fits.
    expect(multiplyQuantity(999_999, 9_000_000_000)).toBe(
      8_999_991_000_000_000,
    );
  });

  it("throws instead of returning an imprecise number", () => {
    expect(() => multiplyQuantity(1_000_000, 1_000_000_000_000)).toThrow(
      RangeError,
    );
  });
});

describe("applyPercent", () => {
  it("computes percentages of minor units", () => {
    expect(applyPercent(10000, 10)).toBe(1000);
    expect(applyPercent(10000, 8.25)).toBe(825);
  });

  it("rounds half away from zero", () => {
    expect(applyPercent(5, 10)).toBe(1); // 0.5 -> 1
    expect(applyPercent(4, 10)).toBe(0); // 0.4 -> 0
    expect(applyPercent(1, 50)).toBe(1); // 0.5 -> 1
  });

  it("returns zero for zero inputs", () => {
    expect(applyPercent(0, 10)).toBe(0);
    expect(applyPercent(10000, 0)).toBe(0);
  });
});

describe("parseMoneyInput", () => {
  it("parses plain, comma-grouped and short decimals", () => {
    expect(parseMoneyInput("12.5", "USD")).toBe(1250);
    expect(parseMoneyInput("1,250.00", "USD")).toBe(125000);
    expect(parseMoneyInput("7", "USD")).toBe(700);
    expect(parseMoneyInput("7.", "USD")).toBe(700);
  });

  it("respects the currency's decimal places", () => {
    expect(parseMoneyInput("500", "JPY")).toBe(500);
    expect(parseMoneyInput("500.5", "JPY")).toBeNull();
    expect(parseMoneyInput("1.234", "KWD")).toBe(1234);
    expect(parseMoneyInput("1.234", "USD")).toBeNull();
  });

  it.each(["", "  ", "abc", "-5", "1e3", "1.2.3", "$5", ".5"])(
    "rejects %j",
    (input) => {
      expect(parseMoneyInput(input, "USD")).toBeNull();
    },
  );

  it("rejects amounts above the maximum", () => {
    expect(parseMoneyInput("99999999999999", "USD")).toBeNull();
  });
});

describe("formatting", () => {
  it("formats using the currency exponent", () => {
    expect(formatMoney(123456, "USD")).toBe("$1,234.56");
    expect(formatMoney(5000, "JPY")).toBe("¥5,000");
  });

  it("falls back for unknown currency codes instead of throwing", () => {
    expect(formatMoney(1050, "???")).toBe("??? 10.50");
  });

  it("round-trips through input strings", () => {
    expect(minorToInputString(125050, "USD")).toBe("1250.50");
    expect(minorToInputString(5000, "JPY")).toBe("5000");
    expect(parseMoneyInput(minorToInputString(125050, "USD"), "USD")).toBe(
      125050,
    );
  });
});

describe("hasAtMostDecimals", () => {
  it("accepts values within the limit", () => {
    expect(hasAtMostDecimals(8.25, 2)).toBe(true);
    expect(hasAtMostDecimals(1.001, 3)).toBe(true);
    expect(hasAtMostDecimals(3, 0)).toBe(true);
  });

  it("rejects values beyond the limit or non-finite", () => {
    expect(hasAtMostDecimals(8.255, 2)).toBe(false);
    expect(hasAtMostDecimals(Number.NaN, 2)).toBe(false);
    expect(hasAtMostDecimals(Infinity, 2)).toBe(false);
  });
});

describe("convertLegacyMinor", () => {
  it("leaves two-decimal currencies unchanged", () => {
    expect(convertLegacyMinor(12345, "USD")).toBe(12345);
  });

  it("rescales zero- and three-decimal currencies", () => {
    expect(convertLegacyMinor(500000, "JPY")).toBe(5000);
    expect(convertLegacyMinor(1000, "KWD")).toBe(10000);
  });
});
