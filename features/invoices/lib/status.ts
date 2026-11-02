
import type { Invoice, InvoiceStatus } from "../types";

/**
 * Returns the invoices with each status replaced by its effective status
 * (so unpaid invoices past their due date read "overdue"). Before `today`
 * is known, e.g. on first render, stored statuses are used unchanged.
 */
export function withEffectiveStatus(
  invoices: readonly Invoice[],
  today: string,
): Invoice[] {
  if (!today) return [...invoices];
  return invoices.map((invoice) => ({
    ...invoice,
    status: getEffectiveInvoiceStatus(invoice, today),
  }));
}

export function getEffectiveInvoiceStatus(
  invoice: Invoice,
  today: string,
): InvoiceStatus {
  // Paid invoices must always remain paid.
  if (invoice.status === "paid") {
    return "paid";
  }

  // Only overdue when the due date is strictly before today.
  if (invoice.dueDate < today) {
    return "overdue";
  }

  // If the due date hasn't passed, preserve the current status
  // unless it was previously marked overdue.
  if (invoice.status === "overdue") {
    return "sent";
  }

  return invoice.status;
}
