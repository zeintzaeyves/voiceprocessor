import type { DocumentType, Invoice } from "./types";

const STORAGE_KEY = "currency-invoice-processor:invoices";
const STORAGE_EVENT = "invoices-updated";
const COUNTER_KEY = "currency-invoice-processor:invoice-counters";

type InvoiceCounters = Record<string, number>;

function isDocumentType(value: unknown): value is DocumentType {
  return value === "invoice" || value === "receipt";
}

export function getInvoices(): Invoice[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: unknown) => {
      const invoice = item as Partial<Invoice>;

      return {
        ...invoice,
        documentType: isDocumentType(invoice.documentType)
          ? invoice.documentType
          : "invoice",
        companyName:
          typeof invoice.companyName === "string"
            ? invoice.companyName
            : "",
      } as Invoice;
    });
  } catch {
    return [];
  }
}

function getCounters(): InvoiceCounters {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(COUNTER_KEY);
    if (!stored) return {};

    const parsed: unknown = JSON.parse(stored);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    return parsed as InvoiceCounters;
  } catch {
    return {};
  }
}

function getDatePrefix(issueDate: string): string {
  const match = issueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    throw new Error("Please select a valid issue date.");
  }

  const [, year, month, day] = match;
  const date = new Date(`${issueDate}T00:00:00`);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== Number(year) ||
    date.getMonth() + 1 !== Number(month) ||
    date.getDate() !== Number(day)
  ) {
    throw new Error("Please select a valid issue date.");
  }

  return `${month}${day}${year}`;
}

function getDocumentPrefix(documentType: DocumentType): string {
  return documentType === "receipt" ? "REC" : "INV";
}

function getSequence(
  documentNumber: string,
  datePrefix: string,
  documentPrefix: string,
): number {
  const escapedPrefix = documentPrefix.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const escapedDate = datePrefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const match = documentNumber.match(
    new RegExp(`^${escapedPrefix}-${escapedDate}-(\\d+)$`, "i"),
  );

  if (!match) return 0;

  const sequence = Number(match[1]);

  return Number.isSafeInteger(sequence) && sequence > 0 ? sequence : 0;
}

export function getNextDocumentNumber(
  documentType: DocumentType,
  issueDate: string,
): string {
  if (typeof window === "undefined") {
    throw new Error("Documents can only be numbered in the browser.");
  }

  const datePrefix = getDatePrefix(issueDate);
  const documentPrefix = getDocumentPrefix(documentType);
  const key = `${documentPrefix}-${datePrefix}`;

  const invoices = getInvoices();
  const counters = getCounters();

  const highestSavedSequence = invoices.reduce((highest, invoice) => {
    const savedType = invoice.documentType ?? "invoice";

    if (savedType !== documentType) return highest;

    return Math.max(
      highest,
      getSequence(
        invoice.invoiceNumber,
        datePrefix,
        documentPrefix,
      ),
    );
  }, 0);

  const lastUsedSequence = Math.max(
    Number(counters[key]) || 0,
    highestSavedSequence,
  );

  return `${key}-${String(lastUsedSequence + 1).padStart(3, "0")}`;
}

export function getNextInvoiceNumber(issueDate: string): string {
  return getNextDocumentNumber("invoice", issueDate);
}

export function saveInvoice(invoice: Invoice): void {
  if (typeof window === "undefined") {
    throw new Error("Documents can only be saved in the browser.");
  }

  const invoices = getInvoices();
  const existingIndex = invoices.findIndex(
    (item) => item.id === invoice.id,
  );
  const isNewInvoice = existingIndex < 0;

  const documentType = isDocumentType(invoice.documentType)
    ? invoice.documentType
    : "invoice";

  const normalizedInvoice: Invoice = {
    ...invoice,
    documentType,
    companyName: (invoice.companyName ?? "").trim(),
    invoiceNumber: invoice.invoiceNumber.trim(),
  };

  if (!normalizedInvoice.companyName) {
    throw new Error("Please enter your company name.");
  }

  if (!normalizedInvoice.invoiceNumber) {
    throw new Error("Document number is required.");
  }

  const duplicate = invoices.some(
    (existing) =>
      existing.id !== normalizedInvoice.id &&
      existing.invoiceNumber.trim().toLowerCase() ===
        normalizedInvoice.invoiceNumber.trim().toLowerCase(),
  );

  if (duplicate) {
    throw new Error(
      `Document number "${normalizedInvoice.invoiceNumber}" is already in use.`,
    );
  }

  if (isNewInvoice) {
    const expectedNumber = getNextDocumentNumber(
      documentType,
      normalizedInvoice.issueDate,
    );

    if (
      normalizedInvoice.invoiceNumber.toUpperCase() !==
      expectedNumber.toUpperCase()
    ) {
      throw new Error(
        `The next document number is ${expectedNumber}. Refresh the form and try again.`,
      );
    }
  } else {
    const existingInvoice = invoices[existingIndex];

    // Keep the original number and document type when editing.
    normalizedInvoice.invoiceNumber = existingInvoice.invoiceNumber;
    normalizedInvoice.documentType =
      existingInvoice.documentType ?? "invoice";
  }

  const updatedInvoices = [...invoices];

  if (isNewInvoice) {
    updatedInvoices.push(normalizedInvoice);
  } else {
    updatedInvoices[existingIndex] = normalizedInvoice;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedInvoices),
  );

  if (isNewInvoice) {
    const datePrefix = getDatePrefix(normalizedInvoice.issueDate);
    const prefix = getDocumentPrefix(documentType);
    const key = `${prefix}-${datePrefix}`;

    const sequence = getSequence(
      normalizedInvoice.invoiceNumber,
      datePrefix,
      prefix,
    );

    const counters = getCounters();

    counters[key] = Math.max(
      Number(counters[key]) || 0,
      sequence,
    );

    window.localStorage.setItem(
      COUNTER_KEY,
      JSON.stringify(counters),
    );
  }

  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function deleteInvoice(invoiceId: string): void {
  if (typeof window === "undefined") return;

  const invoices = getInvoices().filter(
    (invoice) => invoice.id !== invoiceId,
  );

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

export function updateInvoiceStatus(
  invoiceId: string,
  status: Invoice["status"],
): void {
  if (typeof window === "undefined") {
    throw new Error("Document status can only be updated in the browser.");
  }

  const invoices = getInvoices();
  const index = invoices.findIndex(
    (invoice) => invoice.id === invoiceId,
  );

  if (index < 0) {
    throw new Error("Document not found.");
  }

  const updatedInvoices = [...invoices];

  updatedInvoices[index] = {
    ...updatedInvoices[index],
    status,
  };

  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(updatedInvoices),
  );

  window.dispatchEvent(new Event(STORAGE_EVENT));
}