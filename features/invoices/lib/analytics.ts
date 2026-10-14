
import type { Invoice } from "../types";
import { calculateInvoiceTotals } from "./calculations";
import { getEffectiveInvoiceStatus } from "./status";

export type CurrencyAnalytics = {
  currency: string;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  outstandingMinor: number;
  paidMinor: number;
  overdueMinor: number;
};

export function calculateInvoiceAnalytics(
  invoices: Invoice[],
  today: string,
): CurrencyAnalytics[] {
  const analytics = new Map<string, CurrencyAnalytics>();

  for (const invoice of invoices) {
    const status = getEffectiveInvoiceStatus(invoice, today);
    const totals = calculateInvoiceTotals(
      invoice.lineItems,
      invoice.taxRatePercent,
    );

    const current = analytics.get(invoice.currency) ?? {
      currency: invoice.currency,
      totalInvoices: 0,
      paidInvoices: 0,
      overdueInvoices: 0,
      outstandingMinor: 0,
      paidMinor: 0,
      overdueMinor: 0,
    };

    current.totalInvoices += 1;

    if (status === "paid") {
      current.paidInvoices += 1;
      current.paidMinor += totals.totalMinor;
    } else {
      current.outstandingMinor += totals.totalMinor;
    }

    if (status === "overdue") {
      current.overdueInvoices += 1;
      current.overdueMinor += totals.totalMinor;
    }

    analytics.set(invoice.currency, current);
  }

  return Array.from(analytics.values()).sort((a, b) =>
    a.currency.localeCompare(b.currency),
  );
}
