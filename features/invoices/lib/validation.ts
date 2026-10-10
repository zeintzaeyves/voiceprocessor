
import type { Invoice } from "../types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateInvoice(invoice: Invoice): ValidationResult {
  const errors: string[] = [];

  if (!invoice.invoiceNumber.trim()) {
    errors.push("Invoice number is required.");
  }

  if (!invoice.clientName.trim()) {
    errors.push("Client name is required.");
  }

  if (!invoice.issueDate) {
    errors.push("Issue date is required.");
  }

  if (!invoice.dueDate) {
    errors.push("Due date is required.");
  }

  if (
    invoice.issueDate &&
    invoice.dueDate &&
    invoice.dueDate < invoice.issueDate
  ) {
    errors.push("Due date cannot be before issue date.");
  }

  if (!invoice.currency.trim()) {
    errors.push("Currency is required.");
  }

  if (
    !Number.isFinite(invoice.taxRatePercent) ||
    invoice.taxRatePercent < 0 ||
    invoice.taxRatePercent > 100
  ) {
    errors.push("Tax rate must be between 0 and 100.");
  }

  if (invoice.lineItems.length === 0) {
    errors.push("At least one line item is required.");
  }

  invoice.lineItems.forEach((item, index) => {
    const row = index + 1;

    if (!item.description.trim()) {
      errors.push(`Line item ${row}: description is required.`);
    }

    if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
      errors.push(`Line item ${row}: quantity must be greater than zero.`);
    }

    if (
      !Number.isSafeInteger(item.unitPriceMinor) ||
      item.unitPriceMinor < 0
    ) {
      errors.push(`Line item ${row}: unit price must be a non-negative integer in minor units.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
