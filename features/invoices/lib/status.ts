
import type { Invoice, InvoiceStatus } from "../types";

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
