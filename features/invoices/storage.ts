
import type { Invoice } from "./types";

const STORAGE_KEY = "currency-invoice-processor:invoices";

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as Invoice[];
  } catch {
    return [];
  }
}

export function saveInvoice(invoice: Invoice): void {
  const invoices = getInvoices();

  const existingIndex = invoices.findIndex(
    (item) => item.id === invoice.id,
  );

  if (existingIndex >= 0) {
    invoices[existingIndex] = invoice;
  } else {
    invoices.push(invoice);
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

export function deleteInvoice(invoiceId: string): void {
  const invoices = getInvoices().filter(
    (invoice) => invoice.id !== invoiceId,
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}
