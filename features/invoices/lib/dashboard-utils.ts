
import type { Invoice, InvoiceStatus } from "@/features/invoices/types";

export const STATUSES: Array<"all" | InvoiceStatus> = [
  "all",
  "draft",
  "sent",
  "paid",
  "overdue",
];

export const STATUS_STYLES: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-50 text-blue-700",
  paid: "bg-emerald-50 text-emerald-700",
  overdue: "bg-red-50 text-red-700",
};

export function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

export function getInvoiceTotal(invoice: Invoice) {
  const subtotal = invoice.lineItems.reduce(
    (sum, item) =>
      sum + Math.round(item.quantity * item.unitPriceMinor),
    0,
  );

  const tax = Math.round(
    subtotal * (invoice.taxRatePercent / 100),
  );

  return subtotal + tax;
}

export function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
