import type { InvoiceStatus } from "@/features/invoices/types";

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

/** Today's date in the user's local time zone, as YYYY-MM-DD. */
export function getLocalDateString(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
