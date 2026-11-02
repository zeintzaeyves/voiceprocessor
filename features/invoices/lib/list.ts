import type { Invoice, InvoiceStatus } from "../types";
import { getInvoiceTotals } from "./calculations";

export type SortKey =
  | "issued-desc"
  | "issued-asc"
  | "due-asc"
  | "amount-desc"
  | "client-asc";

export const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: "issued-desc", label: "Newest first" },
  { value: "issued-asc", label: "Oldest first" },
  { value: "due-asc", label: "Due soonest" },
  { value: "amount-desc", label: "Amount, high to low" },
  { value: "client-asc", label: "Client A–Z" },
];

export type ListFilters = {
  query: string;
  status: "all" | InvoiceStatus;
  currency: "all" | string;
  sort: SortKey;
};

export const DEFAULT_FILTERS: ListFilters = {
  query: "",
  status: "all",
  currency: "all",
  sort: "issued-desc",
};

function matchesQuery(invoice: Invoice, query: string): boolean {
  if (!query) return true;
  const haystack = [
    invoice.invoiceNumber,
    invoice.clientName,
    invoice.companyName,
    invoice.clientEmail ?? "",
  ]
    .join(" ")
    .toLowerCase();
  // Every word must appear somewhere, in any order.
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * Filters then sorts. `invoices` should already carry effective statuses.
 * Amounts are never compared across currencies: amount sorting groups by
 * currency code first, because 5,000 JPY and 5,000 USD are not comparable.
 */
export function filterAndSortInvoices(
  invoices: readonly Invoice[],
  filters: ListFilters,
): Invoice[] {
  const filtered = invoices.filter(
    (invoice) =>
      matchesQuery(invoice, filters.query.trim()) &&
      (filters.status === "all" || invoice.status === filters.status) &&
      (filters.currency === "all" || invoice.currency === filters.currency),
  );

  const byNumberDesc = (a: Invoice, b: Invoice) =>
    b.invoiceNumber.localeCompare(a.invoiceNumber);

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "issued-desc":
        return b.issueDate.localeCompare(a.issueDate) || byNumberDesc(a, b);
      case "issued-asc":
        return a.issueDate.localeCompare(b.issueDate) || byNumberDesc(b, a);
      case "due-asc":
        return a.dueDate.localeCompare(b.dueDate) || byNumberDesc(a, b);
      case "client-asc":
        return (
          a.clientName.localeCompare(b.clientName, undefined, {
            sensitivity: "base",
          }) || byNumberDesc(a, b)
        );
      case "amount-desc":
        return (
          a.currency.localeCompare(b.currency) ||
          getInvoiceTotals(b).totalMinor - getInvoiceTotals(a).totalMinor ||
          byNumberDesc(a, b)
        );
    }
  });
}

export function hasActiveFilters(filters: ListFilters): boolean {
  return (
    filters.query.trim() !== "" ||
    filters.status !== "all" ||
    filters.currency !== "all"
  );
}
