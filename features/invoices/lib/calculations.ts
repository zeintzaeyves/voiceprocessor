
type LineItemInput = {
  quantity: number;
  unitPriceMinor: number;
};

type InvoiceTotals = {
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
};

export function calculateLineTotal(
  quantity: number,
  unitPriceMinor: number,
): number {
  return Math.round(quantity * unitPriceMinor);
}

export function calculateInvoiceTotals(
  lineItems: LineItemInput[],
  taxRatePercent: number,
): InvoiceTotals {
  const subtotalMinor = lineItems.reduce(
    (total, item) =>
      total + calculateLineTotal(item.quantity, item.unitPriceMinor),
    0,
  );

  const taxMinor = Math.round(
    subtotalMinor * (taxRatePercent / 100),
  );

  return {
    subtotalMinor,
    taxMinor,
    totalMinor: subtotalMinor + taxMinor,
  };
}
