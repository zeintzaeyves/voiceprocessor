import type { Invoice, InvoiceStatus } from "../types";
import {
  calculateInvoiceAnalytics,
  type CurrencyAnalytics,
} from "./analytics";
import { withEffectiveStatus } from "./status";

export type CurrencySummary = CurrencyAnalytics & {
  /** Everything invoiced in this currency: paid + outstanding. */
  invoicedMinor: number;
};

export type DashboardSummary = {
  totalCount: number;
  statusCounts: Record<InvoiceStatus, number>;
  currencies: CurrencySummary[];
  /** Invoices with effective status applied, most recently touched first. */
  recent: Invoice[];
  /** Unpaid invoice with the soonest due date that is not yet overdue. */
  nextDue: Invoice | null;
};

const RECENT_LIMIT = 5;

/** The best available "last touched" instant. Legacy records may only have a date. */
export function lastActivity(invoice: Invoice): string {
  return invoice.updatedAt ?? invoice.createdAt ?? invoice.issueDate;
}

/**
 * Everything the dashboard shows, derived from real invoices only. With no
 * invoices every collection is empty or zero: nothing is invented.
 */
export function buildDashboardSummary(
  invoices: readonly Invoice[],
  today: string,
): DashboardSummary {
  const effective = withEffectiveStatus(invoices, today);

  const statusCounts: Record<InvoiceStatus, number> = {
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0,
  };
  for (const invoice of effective) statusCounts[invoice.status] += 1;

  const currencies = calculateInvoiceAnalytics(effective, today).map(
    (entry) => ({
      ...entry,
      invoicedMinor: entry.paidMinor + entry.outstandingMinor,
    }),
  );

  const recent = [...effective]
    .sort((a, b) => lastActivity(b).localeCompare(lastActivity(a)))
    .slice(0, RECENT_LIMIT);

  const nextDue =
    effective
      .filter(
        (invoice) =>
          (invoice.status === "sent" || invoice.status === "draft") &&
          invoice.dueDate >= today,
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] ?? null;

  return {
    totalCount: effective.length,
    statusCounts,
    currencies,
    recent,
    nextDue,
  };
}
