import type { CurrencyCode } from "./currencies";
import { addDays } from "./dates";
import {
  calculatePreviewTotals,
  type InvoiceTotals,
} from "./calculations";
import {
  getCurrencyExponent,
  minorToInputString,
  parseMoneyInput,
} from "./money";
import { getFieldErrors } from "./validation";
import type { NewInvoice } from "../repository/invoice-repository";
import type {
  DocumentType,
  Invoice,
  InvoiceDiscount,
  InvoiceLineItem,
} from "../types";

/**
 * What the form edits. Everything a person types stays a string until it is
 * converted here, so "1." or "" while typing never becomes a bogus number.
 */
export type DiscountKind = "none" | "percent" | "fixed";

export type LineItemValues = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

export type FormValues = {
  documentType: DocumentType;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  currency: CurrencyCode;
  taxRate: string;
  discountKind: DiscountKind;
  discountValue: string;
  notes: string;
  lineItems: LineItemValues[];
};

export type FieldErrors = Record<string, string>;

export const DEFAULT_PAYMENT_TERMS_DAYS = 14;

export function newLineItem(id: string): LineItemValues {
  return { id, description: "", quantity: "1", unitPrice: "" };
}

export function emptyValues(today: string, firstLineId: string): FormValues {
  return {
    documentType: "invoice",
    companyName: "",
    companyEmail: "",
    companyAddress: "",
    clientName: "",
    clientEmail: "",
    clientAddress: "",
    issueDate: today,
    dueDate: addDays(today, DEFAULT_PAYMENT_TERMS_DAYS),
    currency: "USD",
    taxRate: "0",
    discountKind: "none",
    discountValue: "",
    notes: "",
    lineItems: [newLineItem(firstLineId)],
  };
}

export function valuesFromInvoice(invoice: Invoice): FormValues {
  const { discount } = invoice;

  return {
    documentType: invoice.documentType,
    companyName: invoice.companyName,
    companyEmail: invoice.companyEmail ?? "",
    companyAddress: invoice.companyAddress ?? "",
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail ?? "",
    clientAddress: invoice.clientAddress ?? "",
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    taxRate: String(invoice.taxRatePercent),
    discountKind: discount.type,
    discountValue:
      discount.type === "percent"
        ? String(discount.percent)
        : discount.type === "fixed"
          ? minorToInputString(discount.amountMinor, invoice.currency)
          : "",
    notes: invoice.notes ?? "",
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: String(item.quantity),
      unitPrice: minorToInputString(item.unitPriceMinor, invoice.currency),
    })),
  };
}

// ---------------------------------------------------------------- parsing

const QUANTITY_PATTERN = /^\d+(\.\d{1,3})?$/;
const PERCENT_PATTERN = /^\d+(\.\d{1,2})?$/;

function parseQuantity(text: string): number {
  const cleaned = text.trim().replace(/,/g, "");
  return QUANTITY_PATTERN.test(cleaned) ? Number(cleaned) : Number.NaN;
}

function parsePercent(text: string): number {
  const cleaned = text.trim();
  if (cleaned === "") return 0; // a blank tax rate means no tax
  return PERCENT_PATTERN.test(cleaned) ? Number(cleaned) : Number.NaN;
}

function moneyHint(currency: string): string {
  const digits = getCurrencyExponent(currency);
  return digits === 0
    ? "Enter a whole amount, e.g. 1500."
    : `Enter an amount with up to ${digits} decimal places, e.g. ${(1234.5).toFixed(digits)}.`;
}

type Built = {
  /** Ready for the repository, except unparseable numbers are NaN. */
  invoice: NewInvoice;
  /** Messages for text that could not be turned into a number at all. */
  parseErrors: FieldErrors;
};

/** Converts form text into the domain shape, recording what could not be parsed. */
export function buildInvoice(
  values: FormValues,
  status: Invoice["status"],
): Built {
  const parseErrors: FieldErrors = {};
  const isReceipt = values.documentType === "receipt";

  const lineItems: InvoiceLineItem[] = values.lineItems.map((item, index) => {
    const quantity = parseQuantity(item.quantity);
    if (Number.isNaN(quantity)) {
      parseErrors[`lineItems.${index}.quantity`] =
        "Enter a quantity such as 2 or 1.5 (up to 3 decimals).";
    }

    const price = parseMoneyInput(item.unitPrice, values.currency);
    if (price === null) {
      parseErrors[`lineItems.${index}.unitPriceMinor`] =
        item.unitPrice.trim() === ""
          ? "Enter a unit price."
          : moneyHint(values.currency);
    }

    return {
      id: item.id,
      description: item.description,
      quantity,
      unitPriceMinor: price ?? Number.NaN,
    };
  });

  const taxRatePercent = parsePercent(values.taxRate);
  if (Number.isNaN(taxRatePercent)) {
    parseErrors.taxRatePercent =
      "Enter a percentage with up to 2 decimals, e.g. 8.25.";
  }

  let discount: InvoiceDiscount = { type: "none" };
  if (values.discountKind === "percent") {
    const percent = parsePercent(values.discountValue);
    if (values.discountValue.trim() === "" || Number.isNaN(percent)) {
      parseErrors.discount = "Enter a percentage with up to 2 decimals.";
    }
    discount = { type: "percent", percent };
  } else if (values.discountKind === "fixed") {
    const amount = parseMoneyInput(values.discountValue, values.currency);
    if (amount === null) {
      parseErrors.discount = moneyHint(values.currency);
    }
    discount = { type: "fixed", amountMinor: amount ?? Number.NaN };
  }

  return {
    parseErrors,
    invoice: {
      documentType: values.documentType,
      companyName: values.companyName,
      companyEmail: values.companyEmail,
      companyAddress: values.companyAddress,
      clientName: values.clientName,
      clientEmail: values.clientEmail,
      clientAddress: values.clientAddress,
      issueDate: values.issueDate,
      // A receipt is settled on its payment date, so it has no separate due date.
      dueDate: isReceipt ? values.issueDate : values.dueDate,
      currency: values.currency,
      taxRatePercent,
      discount,
      status,
      notes: values.notes,
      lineItems,
    },
  };
}

/** Schema paths that the form shows under a single control. */
function toFormKey(path: string): string {
  if (path.startsWith("discount")) return "discount";
  return path;
}

export function validateForm(
  values: FormValues,
  status: Invoice["status"] = "draft",
): FieldErrors {
  const { invoice, parseErrors } = buildInvoice(values, status);

  const schemaErrors = getFieldErrors({
    ...invoice,
    id: "draft",
    invoiceNumber: "draft",
  });

  const errors: FieldErrors = {};
  for (const [path, message] of Object.entries(schemaErrors)) {
    const key = toFormKey(path);
    if (!(key in errors)) errors[key] = message;
  }
  // The schema's cross-field date rule is skipped whenever any other field has
  // a hard type error (e.g. an empty price), which would hide this message
  // until everything else was fixed. Check it here, independently.
  if (
    invoice.documentType === "invoice" &&
    !errors.issueDate &&
    !errors.dueDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(invoice.issueDate) &&
    /^\d{4}-\d{2}-\d{2}$/.test(invoice.dueDate) &&
    invoice.dueDate < invoice.issueDate
  ) {
    errors.dueDate = "Due date cannot be before issue date.";
  }

  // Specific parse messages beat the schema's generic "must be a number".
  return { ...errors, ...parseErrors };
}

export type FormComputation = {
  invoice: NewInvoice;
  totals: InvoiceTotals;
  errors: FieldErrors;
};

export function computeForm(
  values: FormValues,
  status: Invoice["status"],
): FormComputation {
  const { invoice } = buildInvoice(values, status);

  // While a discount is half-typed or invalid, show totals without it
  // rather than blanking everything.
  const { discount } = invoice;
  const usableDiscount: InvoiceDiscount =
    (discount.type === "percent" && Number.isFinite(discount.percent)) ||
    (discount.type === "fixed" && Number.isFinite(discount.amountMinor))
      ? discount
      : { type: "none" };

  return {
    invoice,
    totals: calculatePreviewTotals(
      invoice.lineItems,
      invoice.taxRatePercent,
      usableDiscount,
    ),
    errors: validateForm(values, status),
  };
}
