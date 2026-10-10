
import { describe, expect, it } from "vitest";
import { calculateLineTotal, calculateInvoiceTotals } from "./calculations";

describe("calculateLineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(calculateLineTotal(2, 5000)).toBe(10000);
  });
});

describe("calculateInvoiceTotals", () => {
  it("calculates subtotal, tax, and total", () => {
    const result = calculateInvoiceTotals(
      [{ quantity: 2, unitPriceMinor: 5000 }],
      10,
    );

    expect(result).toEqual({
      subtotalMinor: 10000,
      taxMinor: 1000,
      totalMinor: 11000,
    });
  });

  it("returns zero totals for an empty invoice", () => {
    expect(calculateInvoiceTotals([], 10)).toEqual({
      subtotalMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
    });
  });
});
