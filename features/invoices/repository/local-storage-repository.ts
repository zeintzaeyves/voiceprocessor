import { invoiceSchema } from "../schema";
import type { DocumentType, Invoice, InvoiceStatus } from "../types";
import { validateInvoice } from "../lib/validation";
import {
  InvoiceRepositoryError,
  type InvoiceChanges,
  type InvoiceRepository,
  type NewInvoice,
  type RepositoryHealth,
} from "./invoice-repository";
import { migrateLegacyRecord } from "./migration";
import {
  formatDocumentNumber,
  getNumberingScope,
  parseSequence,
} from "./numbering";

const NAMESPACE = "currency-invoice-processor";

export const STORAGE_KEYS = {
  /** Version 1: a bare JSON array. Never modified after migration. */
  legacy: `${NAMESPACE}:invoices`,
  /** Version 2: { version, invoices, quarantine }. */
  current: `${NAMESPACE}:invoices:v2`,
  counters: `${NAMESPACE}:invoice-counters`,
  /** Raw copy of unparseable data, kept so it can be recovered by hand. */
  corruptBackup: `${NAMESPACE}:invoices:corrupt-backup`,
} as const;

export type StorageLike = Pick<
  Storage,
  "getItem" | "setItem" | "removeItem"
>;

type Envelope = {
  version: 2;
  invoices: Invoice[];
  /** Records that failed validation. Preserved, never silently dropped. */
  quarantine: unknown[];
};

type LoadedState = Envelope & { corrupted: boolean };

type Options = {
  getStorage?: () => StorageLike | null;
  generateId?: () => string;
  now?: () => string;
};

function defaultGetStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Accessing localStorage throws when site data is blocked.
    return null;
  }
}

function parseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch {
    return { ok: false };
  }
}

function splitRecords(records: unknown[]): {
  valid: Invoice[];
  invalid: unknown[];
} {
  const valid: Invoice[] = [];
  const invalid: unknown[] = [];

  for (const record of records) {
    const result = invoiceSchema.safeParse(record);
    if (result.success) valid.push(result.data);
    else invalid.push(record);
  }

  return { valid, invalid };
}

export function createLocalStorageInvoiceRepository(
  options: Options = {},
): InvoiceRepository {
  const getStorage = options.getStorage ?? defaultGetStorage;
  const generateId = options.generateId ?? (() => crypto.randomUUID());
  const now = options.now ?? (() => new Date().toISOString());
  const listeners = new Set<() => void>();

  function requireStorage(): StorageLike {
    const storage = getStorage();
    if (!storage) {
      throw new InvoiceRepositoryError(
        "storage-unavailable",
        "Browser storage is unavailable. Check that site data is not blocked or that you are not in a restricted private window.",
      );
    }
    return storage;
  }

  function writeItem(storage: StorageLike, key: string, value: string) {
    try {
      storage.setItem(key, value);
    } catch {
      throw new InvoiceRepositoryError(
        "storage-write-failed",
        "Your changes could not be saved because browser storage is full or blocked.",
      );
    }
  }

  function backupCorrupt(storage: StorageLike, raw: string) {
    try {
      if (storage.getItem(STORAGE_KEYS.corruptBackup) === null) {
        storage.setItem(STORAGE_KEYS.corruptBackup, raw);
      }
    } catch {
      // Best effort: nothing more we can do if storage rejects the backup.
    }
  }

  function load(storage: StorageLike): LoadedState {
    const currentRaw = storage.getItem(STORAGE_KEYS.current);

    if (currentRaw !== null) {
      const parsed = parseJson(currentRaw);

      if (
        !parsed.ok ||
        typeof parsed.value !== "object" ||
        parsed.value === null ||
        !Array.isArray((parsed.value as Partial<Envelope>).invoices)
      ) {
        backupCorrupt(storage, currentRaw);
        return { version: 2, invoices: [], quarantine: [], corrupted: true };
      }

      const envelope = parsed.value as Partial<Envelope>;
      const { valid, invalid } = splitRecords(envelope.invoices ?? []);
      const priorQuarantine = Array.isArray(envelope.quarantine)
        ? envelope.quarantine
        : [];

      return {
        version: 2,
        invoices: valid,
        quarantine: [...priorQuarantine, ...invalid],
        corrupted: false,
      };
    }

    const legacyRaw = storage.getItem(STORAGE_KEYS.legacy);
    if (legacyRaw === null) {
      return { version: 2, invoices: [], quarantine: [], corrupted: false };
    }

    const parsed = parseJson(legacyRaw);
    if (!parsed.ok || !Array.isArray(parsed.value)) {
      backupCorrupt(storage, legacyRaw);
      return { version: 2, invoices: [], quarantine: [], corrupted: true };
    }

    const valid: Invoice[] = [];
    const quarantine: unknown[] = [];

    for (const original of parsed.value as unknown[]) {
      const result = invoiceSchema.safeParse(migrateLegacyRecord(original));
      // Quarantine the record as originally stored, not our attempted repair.
      if (result.success) valid.push(result.data);
      else quarantine.push(original);
    }

    const state: LoadedState = {
      version: 2,
      invoices: valid,
      quarantine,
      corrupted: false,
    };

    try {
      persist(storage, state);
    } catch {
      // Migration is repeatable; the next successful write will persist it.
    }
    return state;
  }

  function persist(storage: StorageLike, state: Envelope) {
    const envelope: Envelope = {
      version: 2,
      invoices: state.invoices,
      quarantine: state.quarantine,
    };
    writeItem(storage, STORAGE_KEYS.current, JSON.stringify(envelope));
  }

  function readCounters(storage: StorageLike): Record<string, number> {
    const raw = storage.getItem(STORAGE_KEYS.counters);
    if (raw === null) return {};

    const parsed = parseJson(raw);
    if (
      !parsed.ok ||
      typeof parsed.value !== "object" ||
      parsed.value === null ||
      Array.isArray(parsed.value)
    ) {
      return {};
    }

    const counters: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed.value)) {
      if (typeof value === "number" && Number.isSafeInteger(value)) {
        counters[key] = value;
      }
    }
    return counters;
  }

  /** Highest sequence ever issued in a scope: saved invoices and the counter. */
  function nextSequence(
    storage: StorageLike,
    invoices: Invoice[],
    documentType: DocumentType,
    issueDate: string,
  ) {
    let scope;
    try {
      scope = getNumberingScope(documentType, issueDate);
    } catch (error) {
      throw new InvoiceRepositoryError(
        "validation",
        error instanceof Error ? error.message : "Select a valid issue date.",
      );
    }

    const highestSaved = invoices.reduce(
      (highest, invoice) =>
        Math.max(highest, parseSequence(invoice.invoiceNumber, scope)),
      0,
    );
    const counter = readCounters(storage)[scope.key] ?? 0;

    return { scope, sequence: Math.max(highestSaved, counter) + 1 };
  }

  function notify() {
    for (const listener of listeners) listener();
  }

  function validated(candidate: unknown): Invoice {
    const result = invoiceSchema.safeParse(candidate);
    if (!result.success) {
      throw new InvoiceRepositoryError(
        "validation",
        validateInvoice(candidate).errors,
      );
    }
    return result.data;
  }

  function findIndex(invoices: Invoice[], id: string): number {
    const index = invoices.findIndex((invoice) => invoice.id === id);
    if (index < 0) {
      throw new InvoiceRepositoryError("not-found", "Document not found.");
    }
    return index;
  }

  async function replaceAt(
    id: string,
    build: (existing: Invoice) => unknown,
  ): Promise<Invoice> {
    const storage = requireStorage();
    const state = load(storage);
    const index = findIndex(state.invoices, id);

    const updated = validated(build(state.invoices[index]));
    const invoices = [...state.invoices];
    invoices[index] = updated;

    persist(storage, { ...state, invoices });
    notify();
    return updated;
  }

  return {
    async list() {
      return load(requireStorage()).invoices;
    },

    async get(id) {
      const found = load(requireStorage()).invoices.find(
        (invoice) => invoice.id === id,
      );
      return found ?? null;
    },

    async create(input: NewInvoice) {
      const storage = requireStorage();
      const state = load(storage);

      const { scope, sequence } = nextSequence(
        storage,
        state.invoices,
        input.documentType,
        input.issueDate,
      );
      const invoiceNumber = formatDocumentNumber(scope, sequence);

      const invoice = validated({
        ...input,
        id: generateId(),
        invoiceNumber,
        createdAt: now(),
        updatedAt: now(),
      });

      const taken = state.invoices.some(
        (existing) =>
          existing.invoiceNumber.toLowerCase() ===
          invoice.invoiceNumber.toLowerCase(),
      );
      if (taken) {
        throw new InvoiceRepositoryError(
          "duplicate-number",
          `Document number "${invoice.invoiceNumber}" is already in use.`,
        );
      }

      persist(storage, {
        ...state,
        invoices: [...state.invoices, invoice],
      });

      // Recording the counter stops numbers being reused after a delete.
      // If this write fails the invoice itself is already safely saved.
      try {
        const counters = readCounters(storage);
        counters[scope.key] = sequence;
        storage.setItem(STORAGE_KEYS.counters, JSON.stringify(counters));
      } catch {
        // Non-fatal by design.
      }

      notify();
      return invoice;
    },

    async update(id: string, changes: InvoiceChanges) {
      return replaceAt(id, (existing) => ({
        ...changes,
        id: existing.id,
        invoiceNumber: existing.invoiceNumber,
        documentType: existing.documentType,
        createdAt: existing.createdAt,
        updatedAt: now(),
      }));
    },

    async updateStatus(id: string, status: InvoiceStatus) {
      return replaceAt(id, (existing) => ({
        ...existing,
        status,
        updatedAt: now(),
      }));
    },

    async remove(id) {
      const storage = requireStorage();
      const state = load(storage);
      const invoices = state.invoices.filter((invoice) => invoice.id !== id);

      if (invoices.length === state.invoices.length) return;

      persist(storage, { ...state, invoices });
      notify();
    },

    async peekNextNumber(documentType, issueDate) {
      const storage = requireStorage();
      const { invoices } = load(storage);
      const { scope, sequence } = nextSequence(
        storage,
        invoices,
        documentType,
        issueDate,
      );
      return formatDocumentNumber(scope, sequence);
    },

    async getHealth(): Promise<RepositoryHealth> {
      const state = load(requireStorage());
      return {
        quarantinedCount: state.quarantine.length,
        corrupted: state.corrupted,
      };
    },

    subscribe(listener) {
      listeners.add(listener);

      const onStorage = (event: StorageEvent) => {
        // key === null means storage was cleared.
        if (event.key === null || event.key.startsWith(NAMESPACE)) {
          listener();
        }
      };
      if (typeof window !== "undefined") {
        window.addEventListener("storage", onStorage);
      }

      return () => {
        listeners.delete(listener);
        if (typeof window !== "undefined") {
          window.removeEventListener("storage", onStorage);
        }
      };
    },
  };
}
