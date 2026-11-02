import { invoiceSchema } from "../schema";
import type { Invoice } from "../types";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

/** Prefixes line-item issues with their row, e.g. "Line item 2: price …". */
function formatIssue(path: PropertyKey[], message: string): string {
  if (path[0] === "lineItems" && typeof path[1] === "number") {
    const lowered = message.charAt(0).toLowerCase() + message.slice(1);
    return `Line item ${path[1] + 1}: ${lowered}`;
  }
  return message;
}

/**
 * Validates untrusted invoice data against the schema. Never throws and
 * accepts `unknown` so malformed input cannot crash callers.
 */
export function validateInvoice(invoice: unknown): ValidationResult {
  const result = invoiceSchema.safeParse(invoice);

  if (result.success) return { valid: true, errors: [] };

  return {
    valid: false,
    errors: result.error.issues.map(
      (issue) => formatIssue(issue.path, issue.message),
    ),
  };
}

/** Field-keyed errors for forms: "dueDate" → message, "lineItems.0.quantity" → message. */
export function getFieldErrors(invoice: unknown): Record<string, string> {
  const result = invoiceSchema.safeParse(invoice);
  if (result.success) return {};

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}

export function parseInvoice(
  invoice: unknown,
): { ok: true; invoice: Invoice } | { ok: false; errors: string[] } {
  const result = invoiceSchema.safeParse(invoice);
  if (result.success) return { ok: true, invoice: result.data };
  return { ok: false, errors: validateInvoice(invoice).errors };
}
