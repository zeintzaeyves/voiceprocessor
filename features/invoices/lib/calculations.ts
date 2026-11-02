import type { Invoice, InvoiceDiscount } from "../types";
import { applyPercent, multiplyQuantity } from "./money";

type LineItemInput = {
  quantity: number;
  unitPriceMinor: number;
};

export type InvoiceTotals = {
  subtotalMinor: number;
  discountMinor: number;
  taxableMinor: number;
  taxMinor: number;
  totalMinor: number;
};

const NO_DISCOUNT: InvoiceDiscount = { type: "none" };

export function calculateLineTotal(
  quantity: number,
  unitPriceMinor: number,
): number {
  return multiplyQuantity(quantity, unitPriceMinor);
}

/** Discount in minor units, never exceeding the subtotal. */
export function calculateDiscount(
  subtotalMinor: number,
  discount: InvoiceDiscount,
): number {
  switch (discount.type) {
    case "none":
      return 0;
    case "percent":
      return applyPercent(subtotalMinor, discount.percent);
    case "fixed":
      return Math.min(discount.amountMinor, subtotalMinor);
  }
}

export const ZERO_TOTALS: InvoiceTotals = {
  subtotalMinor: 0,
  discountMinor: 0,
  taxableMinor: 0,
  taxMinor: 0,
  totalMinor: 0,
};

/**
 * For live previews of unvalidated form input. Lines that are not yet
 * computable (blank, non-numeric, out of range) contribute nothing, and a
 * result that overflows safe integers yields zero totals instead of throwing.
 * Never use this for persisted data: that path validates first.
 */
export function calculatePreviewTotals(
  lineItems: ReadonlyArray<{ quantity: number; unitPriceMinor: number }>,
  taxRatePercent: number,
  discount: InvoiceDiscount = NO_DISCOUNT,
): InvoiceTotals {
  const usable = lineItems.filter(
    (item) =>
      Number.isFinite(item.quantity) &&
      item.quantity > 0 &&
      Number.isSafeInteger(item.unitPriceMinor) &&
      item.unitPriceMinor >= 0,
  );

  try {
    return calculateInvoiceTotals(
      usable,
      Number.isFinite(taxRatePercent) ? taxRatePercent : 0,
      discount,
    );
  } catch {
    return ZERO_TOTALS;
  }
}

/** Totals for a saved invoice. Use this rather than re-deriving anywhere. */
export function getInvoiceTotals(
  invoice: Pick<Invoice, "lineItems" | "taxRatePercent" | "discount">,
): InvoiceTotals {
  return calculateInvoiceTotals(
    invoice.lineItems,
    invoice.taxRatePercent,
    invoice.discount,
  );
}

/**
 * The only place invoice totals are computed.
 *
 *   subtotal = Σ round(quantity × unit price)   (per line)
 *   discount = percent or fixed, capped at subtotal
 *   tax      = round((subtotal − discount) × rate)
 *   total    = subtotal − discount + tax
 */
export function calculateInvoiceTotals(
  lineItems: readonly LineItemInput[],
  taxRatePercent: number,
  discount: InvoiceDiscount = NO_DISCOUNT,
): InvoiceTotals {
  const subtotalMinor = lineItems.reduce(
    (total, item) =>
      total + calculateLineTotal(item.quantity, item.unitPriceMinor),
    0,
  );

  const discountMinor = calculateDiscount(subtotalMinor, discount);
  const taxableMinor = subtotalMinor - discountMinor;
  const taxMinor = applyPercent(taxableMinor, taxRatePercent);

  return {
    subtotalMinor,
    discountMinor,
    taxableMinor,
    taxMinor,
    totalMinor: taxableMinor + taxMinor,
  };
}
