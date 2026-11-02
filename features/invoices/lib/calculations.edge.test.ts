import { describe, expect, it } from "vitest";
import { calculateDiscount, calculateInvoiceTotals } from "./calculations";

const item = (quantity: number, unitPriceMinor: number) => ({
  quantity,
  unitPriceMinor,
});

describe("calculateInvoiceTotals: discounts", () => {
  const lines = [item(2, 5000)]; // subtotal 10000

  it("applies a percentage discount before tax", () => {
    expect(
      calculateInvoiceTotals(lines, 10, { type: "percent", percent: 20 }),
    ).toEqual({
      subtotalMinor: 10000,
      discountMinor: 2000,
      taxableMinor: 8000,
      taxMinor: 800,
      totalMinor: 8800,
    });
  });

  it("applies a fixed discount before tax", () => {
    const totals = calculateInvoiceTotals(lines, 10, {
      type: "fixed",
      amountMinor: 1500,
    });
    expect(totals.discountMinor).toBe(1500);
    expect(totals.taxMinor).toBe(850);
    expect(totals.totalMinor).toBe(9350);
  });

  it("never lets a fixed discount exceed the subtotal", () => {
    const totals = calculateInvoiceTotals(lines, 10, {
      type: "fixed",
      amountMinor: 999999,
    });
    expect(totals.discountMinor).toBe(10000);
    expect(totals.totalMinor).toBe(0);
  });

  it("supports a 100% discount", () => {
    expect(
      calculateInvoiceTotals(lines, 10, { type: "percent", percent: 100 })
        .totalMinor,
    ).toBe(0);
  });

  it("treats a missing discount as none", () => {
    expect(calculateDiscount(10000, { type: "none" })).toBe(0);
  });
});

describe("calculateInvoiceTotals: precision and rounding", () => {
  it("rounds each line before summing", () => {
    // 3 lines of 0.333 × 100 = 33.3 -> 33 each = 99 (not round(99.9) = 100)
    const totals = calculateInvoiceTotals(
      [item(0.333, 100), item(0.333, 100), item(0.333, 100)],
      0,
    );
    expect(totals.subtotalMinor).toBe(99);
  });

  it("handles a fractional tax rate exactly", () => {
    expect(calculateInvoiceTotals([item(1, 10000)], 8.25).taxMinor).toBe(825);
  });

  it("rounds tax half away from zero", () => {
    // 5 minor units × 10% = 0.5 -> 1
    expect(calculateInvoiceTotals([item(1, 5)], 10).taxMinor).toBe(1);
  });

  it("is exact where floats are not (0.07 × 100 + 0.1 × 3)", () => {
    const totals = calculateInvoiceTotals([item(0.07, 100), item(0.1, 3)], 0);
    expect(totals.subtotalMinor).toBe(7);
  });

  it("keeps total = subtotal − discount + tax for many items", () => {
    const lines = Array.from({ length: 50 }, (_, i) => item(i + 1, 1999 + i));
    const totals = calculateInvoiceTotals(lines, 7.5, {
      type: "percent",
      percent: 12.5,
    });
    expect(totals.totalMinor).toBe(
      totals.subtotalMinor - totals.discountMinor + totals.taxMinor,
    );
  });

  it("handles zero-priced and zero-tax invoices", () => {
    expect(calculateInvoiceTotals([item(5, 0)], 0).totalMinor).toBe(0);
  });
});
