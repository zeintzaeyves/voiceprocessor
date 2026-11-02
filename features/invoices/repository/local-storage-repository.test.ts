import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  InvoiceRepositoryError,
  type InvoiceRepository,
  type NewInvoice,
} from "./invoice-repository";
import {
  STORAGE_KEYS,
  createLocalStorageInvoiceRepository,
  type StorageLike,
} from "./local-storage-repository";

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  failWrites = false;

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new Error("QuotaExceededError");
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

const draft = (overrides: Partial<NewInvoice> = {}): NewInvoice => ({
  documentType: "invoice",
  companyName: "Acme",
  clientName: "Globex",
  issueDate: "2026-10-10",
  dueDate: "2026-10-20",
  currency: "USD",
  taxRatePercent: 10,
  discount: { type: "none" },
  status: "draft",
  lineItems: [
    { id: "l1", description: "Work", quantity: 2, unitPriceMinor: 5000 },
  ],
  ...overrides,
});

let storage: MemoryStorage;
let repo: InvoiceRepository;
let idCounter: number;

beforeEach(() => {
  storage = new MemoryStorage();
  idCounter = 0;
  repo = createLocalStorageInvoiceRepository({
    getStorage: () => storage,
    generateId: () => `id-${++idCounter}`,
  });
});

async function expectRepoError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(InvoiceRepositoryError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe("create", () => {
  it("assigns an id and a sequential document number", async () => {
    const first = await repo.create(draft());
    const second = await repo.create(draft());

    expect(first).toMatchObject({
      id: "id-1",
      invoiceNumber: "INV-10102026-001",
    });
    expect(second.invoiceNumber).toBe("INV-10102026-002");
  });

  it("numbers invoices and receipts independently, per date", async () => {
    await repo.create(draft());
    const receipt = await repo.create(draft({ documentType: "receipt" }));
    const otherDay = await repo.create(draft({ issueDate: "2026-10-11" }));

    expect(receipt.invoiceNumber).toBe("REC-10102026-001");
    expect(otherDay.invoiceNumber).toBe("INV-10112026-001");
  });

  it("never reuses a number after deletion", async () => {
    const a = await repo.create(draft());
    await repo.create(draft());
    await repo.remove(a.id);
    const latest = (await repo.list()).at(-1)!;
    await repo.remove(latest.id);

    const next = await repo.create(draft());
    expect(next.invoiceNumber).toBe("INV-10102026-003");
  });

  it("persists and returns normalized data", async () => {
    const created = await repo.create(draft({ companyName: "  Acme  " }));
    expect(created.companyName).toBe("Acme");
    expect(await repo.get(created.id)).toEqual(created);
    expect(await repo.list()).toHaveLength(1);
  });

  it("rejects invalid data with readable messages and saves nothing", async () => {
    const promise = repo.create(draft({ clientName: " ", lineItems: [] }));
    await expectRepoError(promise, "validation");
    await expect(promise).rejects.toMatchObject({
      messages: expect.arrayContaining([
        "Client name is required.",
        "Add at least one line item.",
      ]),
    });
    expect(await repo.list()).toEqual([]);
  });

  it("rejects an impossible issue date", async () => {
    await expectRepoError(
      repo.create(draft({ issueDate: "2026-02-31" })),
      "validation",
    );
  });
});

describe("update", () => {
  it("edits fields but keeps id, number and document type", async () => {
    const created = await repo.create(draft());
    const updated = await repo.update(created.id, {
      ...draft({ clientName: "Initech", taxRatePercent: 5 }),
    });

    expect(updated).toMatchObject({
      id: created.id,
      invoiceNumber: created.invoiceNumber,
      documentType: "invoice",
      clientName: "Initech",
      taxRatePercent: 5,
    });
  });

  it("does not change the number when the issue date changes", async () => {
    const created = await repo.create(draft());
    const updated = await repo.update(
      created.id,
      draft({ issueDate: "2026-11-01", dueDate: "2026-11-10" }),
    );
    expect(updated.invoiceNumber).toBe(created.invoiceNumber);
  });

  it("rejects invalid edits and leaves the stored invoice untouched", async () => {
    const created = await repo.create(draft());
    await expectRepoError(
      repo.update(created.id, draft({ dueDate: "2026-10-01" })),
      "validation",
    );
    expect(await repo.get(created.id)).toEqual(created);
  });

  it("reports unknown ids", async () => {
    await expectRepoError(repo.update("nope", draft()), "not-found");
  });
});

describe("updateStatus and remove", () => {
  it("changes only the status", async () => {
    const created = await repo.create(draft());
    const paid = await repo.updateStatus(created.id, "paid");
    // Only the status changes; updatedAt is the one other field allowed to move.
    expect({ ...paid, updatedAt: created.updatedAt }).toEqual({
      ...created,
      status: "paid",
    });
  });

  it("reports an unknown id for status changes", async () => {
    await expectRepoError(repo.updateStatus("nope", "paid"), "not-found");
  });

  it("removes an invoice and is idempotent", async () => {
    const created = await repo.create(draft());
    await repo.remove(created.id);
    await repo.remove(created.id);
    expect(await repo.list()).toEqual([]);
    expect(await repo.get(created.id)).toBeNull();
  });
});

describe("peekNextNumber", () => {
  it("previews without reserving", async () => {
    expect(await repo.peekNextNumber("invoice", "2026-10-10")).toBe(
      "INV-10102026-001",
    );
    expect(await repo.peekNextNumber("invoice", "2026-10-10")).toBe(
      "INV-10102026-001",
    );
    const created = await repo.create(draft());
    expect(created.invoiceNumber).toBe("INV-10102026-001");
  });
});

describe("subscribe", () => {
  it("notifies after writes and stops after unsubscribe", async () => {
    const listener = vi.fn();
    const unsubscribe = repo.subscribe(listener);

    const created = await repo.create(draft());
    await repo.updateStatus(created.id, "sent");
    await repo.remove(created.id);
    expect(listener).toHaveBeenCalledTimes(3);

    unsubscribe();
    await repo.create(draft());
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("does not notify when a failed write changed nothing", async () => {
    const listener = vi.fn();
    repo.subscribe(listener);
    await expect(repo.create(draft({ clientName: "" }))).rejects.toThrow();
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("legacy (v1) migration", () => {
  const legacyRecord = {
    id: "old-1",
    invoiceNumber: "INV-09092026-004",
    clientName: "Legacy Client",
    issueDate: "2026-09-09",
    dueDate: "2026-09-19",
    currency: "USD",
    taxRatePercent: 10,
    status: "sent",
    lineItems: [
      { id: "x", description: "Old work", quantity: 1, unitPriceMinor: 2500 },
    ],
  };

  it("upgrades old records, filling documentType, company and discount", async () => {
    storage.data.set(STORAGE_KEYS.legacy, JSON.stringify([legacyRecord]));

    const [migrated] = await repo.list();
    expect(migrated).toMatchObject({
      id: "old-1",
      documentType: "invoice",
      companyName: "(Unnamed company)",
      discount: { type: "none" },
      status: "sent",
    });
  });

  it("rescales amounts for currencies that are not two-decimal", async () => {
    storage.data.set(
      STORAGE_KEYS.legacy,
      JSON.stringify([
        {
          ...legacyRecord,
          currency: "JPY",
          lineItems: [
            { id: "x", description: "Yen", quantity: 1, unitPriceMinor: 500000 },
          ],
        },
      ]),
    );

    const [migrated] = await repo.list();
    expect(migrated.lineItems[0].unitPriceMinor).toBe(5000);
  });

  it("writes the new format and leaves the legacy data untouched", async () => {
    const legacyJson = JSON.stringify([legacyRecord]);
    storage.data.set(STORAGE_KEYS.legacy, legacyJson);

    await repo.list();

    expect(storage.data.get(STORAGE_KEYS.legacy)).toBe(legacyJson);
    expect(JSON.parse(storage.data.get(STORAGE_KEYS.current)!)).toMatchObject({
      version: 2,
    });
  });

  it("continues numbering after migrated records", async () => {
    storage.data.set(STORAGE_KEYS.legacy, JSON.stringify([legacyRecord]));
    expect(await repo.peekNextNumber("invoice", "2026-09-09")).toBe(
      "INV-09092026-005",
    );
  });

  it("quarantines records it cannot repair instead of dropping them", async () => {
    const broken = { id: "bad", currency: "USD" };
    storage.data.set(
      STORAGE_KEYS.legacy,
      JSON.stringify([legacyRecord, broken]),
    );

    expect(await repo.list()).toHaveLength(1);
    expect(await repo.getHealth()).toEqual({
      quarantinedCount: 1,
      corrupted: false,
    });

    // The broken record survives subsequent writes.
    await repo.create(draft());
    const saved = JSON.parse(storage.data.get(STORAGE_KEYS.current)!);
    expect(saved.quarantine).toEqual([broken]);
  });
});

describe("corrupted and unavailable storage", () => {
  it("backs up unparseable data and starts empty without crashing", async () => {
    storage.data.set(STORAGE_KEYS.current, "{not json");

    expect(await repo.list()).toEqual([]);
    expect((await repo.getHealth()).corrupted).toBe(true);
    expect(storage.data.get(STORAGE_KEYS.corruptBackup)).toBe("{not json");
  });

  it("does not overwrite an existing backup", async () => {
    storage.data.set(STORAGE_KEYS.corruptBackup, "first");
    storage.data.set(STORAGE_KEYS.current, "{second");
    await repo.list();
    expect(storage.data.get(STORAGE_KEYS.corruptBackup)).toBe("first");
  });

  it("quarantines individually invalid records in the current format", async () => {
    const good = await repo.create(draft());
    const envelope = JSON.parse(storage.data.get(STORAGE_KEYS.current)!);
    envelope.invoices.push({ id: "junk" });
    storage.data.set(STORAGE_KEYS.current, JSON.stringify(envelope));

    expect(await repo.list()).toEqual([good]);
    expect((await repo.getHealth()).quarantinedCount).toBe(1);
  });

  it("surfaces a clear error when a write fails and keeps old data", async () => {
    const created = await repo.create(draft());
    storage.failWrites = true;

    await expectRepoError(repo.create(draft()), "storage-write-failed");
    await expectRepoError(
      repo.updateStatus(created.id, "paid"),
      "storage-write-failed",
    );

    storage.failWrites = false;
    expect(await repo.list()).toEqual([created]);
  });

  it("reports unavailable storage", async () => {
    const unavailable = createLocalStorageInvoiceRepository({
      getStorage: () => null,
    });
    await expectRepoError(unavailable.list(), "storage-unavailable");
    await expectRepoError(unavailable.create(draft()), "storage-unavailable");
  });
});

describe("timestamps", () => {
  function repoWithClock(times: string[]) {
    const queue = [...times];
    return createLocalStorageInvoiceRepository({
      getStorage: () => storage,
      generateId: () => "t-1",
      now: () => queue.shift() ?? "2099-01-01T00:00:00.000Z",
    });
  }

  it("stamps createdAt and updatedAt on create", async () => {
    const clocked = repoWithClock(["2026-10-10T08:00:00.000Z", "2026-10-10T08:00:00.000Z"]);
    const created = await clocked.create(draft());
    expect(created.createdAt).toBe("2026-10-10T08:00:00.000Z");
    expect(created.updatedAt).toBe("2026-10-10T08:00:00.000Z");
  });

  it("advances updatedAt but never createdAt on edits and status changes", async () => {
    const clocked = repoWithClock([
      "2026-10-10T08:00:00.000Z",
      "2026-10-10T08:00:00.000Z",
      "2026-10-11T09:00:00.000Z",
      "2026-10-12T10:00:00.000Z",
    ]);
    const created = await clocked.create(draft());

    const edited = await clocked.update(created.id, draft({ clientName: "Initech" }));
    expect(edited.createdAt).toBe("2026-10-10T08:00:00.000Z");
    expect(edited.updatedAt).toBe("2026-10-11T09:00:00.000Z");

    const paid = await clocked.updateStatus(created.id, "paid");
    expect(paid.createdAt).toBe("2026-10-10T08:00:00.000Z");
    expect(paid.updatedAt).toBe("2026-10-12T10:00:00.000Z");
  });

  it("leaves legacy records without timestamps rather than inventing them", async () => {
    storage.data.set(
      STORAGE_KEYS.legacy,
      JSON.stringify([
        {
          id: "old",
          invoiceNumber: "INV-09092026-001",
          clientName: "C",
          issueDate: "2026-09-09",
          dueDate: "2026-09-19",
          currency: "USD",
          taxRatePercent: 0,
          status: "sent",
          lineItems: [{ id: "x", description: "d", quantity: 1, unitPriceMinor: 100 }],
        },
      ]),
    );
    const [legacy] = await repo.list();
    expect(legacy.createdAt).toBeUndefined();
    expect(legacy.updatedAt).toBeUndefined();
  });
});
