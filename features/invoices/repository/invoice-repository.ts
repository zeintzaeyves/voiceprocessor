import type { DocumentType, Invoice, InvoiceStatus } from "../types";

/** Everything the caller supplies; id and document number are assigned by the repository. */
export type NewInvoice = Omit<
  Invoice,
  "id" | "invoiceNumber" | "createdAt" | "updatedAt"
>;

/** Editable fields. The document number and type are immutable after creation. */
export type InvoiceChanges = Omit<
  Invoice,
  "id" | "invoiceNumber" | "documentType" | "createdAt" | "updatedAt"
>;

export type RepositoryErrorCode =
  | "validation"
  | "not-found"
  | "duplicate-number"
  | "storage-unavailable"
  | "storage-write-failed";

export class InvoiceRepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  /** User-presentable messages (one per validation issue). */
  readonly messages: string[];

  constructor(code: RepositoryErrorCode, messages: string | string[]) {
    const list = Array.isArray(messages) ? messages : [messages];
    super(list.join(" "));
    this.name = "InvoiceRepositoryError";
    this.code = code;
    this.messages = list;
  }
}

export type RepositoryHealth = {
  /** Records that failed validation and were moved aside, not deleted. */
  quarantinedCount: number;
  /** Stored data could not be parsed at all; a raw backup was kept. */
  corrupted: boolean;
};

/**
 * Persistence boundary for invoices. The UI depends only on this interface,
 * so a database-backed implementation can replace the localStorage one
 * without touching components.
 */
export interface InvoiceRepository {
  list(): Promise<Invoice[]>;
  get(id: string): Promise<Invoice | null>;
  create(input: NewInvoice): Promise<Invoice>;
  update(id: string, changes: InvoiceChanges): Promise<Invoice>;
  updateStatus(id: string, status: InvoiceStatus): Promise<Invoice>;
  remove(id: string): Promise<void>;
  /** The number `create` would assign right now. For display only. */
  peekNextNumber(
    documentType: DocumentType,
    issueDate: string,
  ): Promise<string>;
  getHealth(): Promise<RepositoryHealth>;
  /** Notified after any change, including changes made in other tabs. */
  subscribe(listener: () => void): () => void;
}
