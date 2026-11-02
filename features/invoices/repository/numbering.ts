import type { DocumentType } from "../types";

/**
 * Document numbers look like INV-MMDDYYYY-001 / REC-MMDDYYYY-001.
 * The sequence restarts for each document type and issue date.
 */

const PREFIXES: Record<DocumentType, string> = {
  invoice: "INV",
  receipt: "REC",
};

export type NumberingScope = {
  /** Counter bucket, e.g. "INV-10102026". */
  key: string;
  prefix: string;
  datePart: string;
};

export function getNumberingScope(
  documentType: DocumentType,
  issueDate: string,
): NumberingScope {
  const match = issueDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new RangeError("Select a valid issue date.");

  const [, year, month, day] = match;
  const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (
    check.getUTCFullYear() !== Number(year) ||
    check.getUTCMonth() + 1 !== Number(month) ||
    check.getUTCDate() !== Number(day)
  ) {
    throw new RangeError("Select a valid issue date.");
  }

  const prefix = PREFIXES[documentType];
  const datePart = `${month}${day}${year}`;
  return { key: `${prefix}-${datePart}`, prefix, datePart };
}

/** The sequence number inside a document number for this scope, or 0. */
export function parseSequence(
  documentNumber: string,
  scope: NumberingScope,
): number {
  const prefix = `${scope.key}-`;
  if (!documentNumber.toUpperCase().startsWith(prefix)) return 0;

  const tail = documentNumber.slice(prefix.length);
  if (!/^\d+$/.test(tail)) return 0;

  const sequence = Number(tail);
  return Number.isSafeInteger(sequence) ? sequence : 0;
}

export function formatDocumentNumber(
  scope: NumberingScope,
  sequence: number,
): string {
  return `${scope.key}-${String(sequence).padStart(3, "0")}`;
}
