import { describe, expect, it } from "vitest";
import type { Invoice } from "../types";
import {
  DEFAULT_FILTERS,
  filterAndSortInvoices,
  hasActiveFilters,
} from "./list";
import { buildDashboardSummary, lastActivity } from "./summary";

let counter = 0;
function make(overrides: Partial<Invoice> = {}): Invoice {
  counter += 1;
  return {
    id: `id-${counter}`,
    documentType: "invoice",
    companyName: "Acme",
    invoiceNumber: `INV-10102026-${String(counter).padStart(3, "0")}`,
    clientName: "Globex",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    currency: "USD",
    taxRatePercent: 0,
    discount: { type: "none" },
    status: "sent",
    lineItems: [
      { id: "l", description: "Work", quantity: 1, unitPriceMinor: 10000 },
    ],
    ...overrides,
  };
}

const TODAY = "2026-10-15";

describe("buildDashboardSummary", () => {
  it("is all zeros and empties with no invoices (nothing invented)", () => {
    expect(buildDashboardSummary([], TODAY)).toEqual({
      totalCount: 0,
      statusCounts: { draft: 0, sent: 0, paid: 0, overdue: 0 },
      currencies: [],
      recent: [],
      nextDue: null,
    });
  });

  it("counts effective statuses, so past-due unpaid invoices are overdue", () => {
    const summary = buildDashboardSummary(
      [
        make({ status: "paid" }),
        make({ status: "sent", dueDate: "2026-10-01" }),
        make({ status: "draft", dueDate: "2026-10-30" }),
        make({ status: "sent", dueDate: "2026-10-30" }),
      ],
      TODAY,
    );
    expect(summary.statusCounts).toEqual({
      draft: 1,
      sent: 1,
      paid: 1,
      overdue: 1,
    });
  });

  it("reports invoiced = paid + outstanding, per currency", () => {
    const summary = buildDashboardSummary(
      [
        make({ status: "paid" }),
        make({ status: "sent" }),
        make({ currency: "EUR", status: "sent" }),
      ],
      TODAY,
    );
    const usd = summary.currencies.find((c) => c.currency === "USD")!;
    expect(usd).toMatchObject({
      invoicedMinor: 20000,
      paidMinor: 10000,
      outstandingMinor: 10000,
    });
    expect(summary.currencies.map((c) => c.currency)).toEqual(["EUR", "USD"]);
  });

  it("orders recent activity by last touched, limited to five", () => {
    const invoices = Array.from({ length: 7 }, (_, i) =>
      make({ updatedAt: `2026-10-0${i + 1}T10:00:00.000Z` }),
    );
    const { recent } = buildDashboardSummary(invoices, TODAY);
    expect(recent).toHaveLength(5);
    expect(recent[0].updatedAt).toBe("2026-10-07T10:00:00.000Z");
    expect(recent[4].updatedAt).toBe("2026-10-03T10:00:00.000Z");
  });

  it("falls back to the issue date for legacy records without timestamps", () => {
    expect(lastActivity(make({ issueDate: "2026-09-09" }))).toBe("2026-09-09");
    expect(
      lastActivity(make({ createdAt: "2026-09-10T00:00:00.000Z" })),
    ).toBe("2026-09-10T00:00:00.000Z");
  });

  it("finds the soonest upcoming unpaid due date, ignoring paid and overdue", () => {
    const soon = make({ dueDate: "2026-10-16" });
    const summary = buildDashboardSummary(
      [
        make({ dueDate: "2026-10-01" }), // overdue
        make({ dueDate: "2026-10-16", status: "paid" }),
        make({ dueDate: "2026-11-30" }),
        soon,
      ],
      TODAY,
    );
    expect(summary.nextDue?.id).toBe(soon.id);
  });

  it("counts an invoice due today as upcoming, not overdue", () => {
    const dueToday = make({ dueDate: TODAY });
    const summary = buildDashboardSummary([dueToday], TODAY);
    expect(summary.statusCounts.overdue).toBe(0);
    expect(summary.nextDue?.id).toBe(dueToday.id);
  });
});

describe("filterAndSortInvoices", () => {
  const a = make({ clientName: "Zeta Ltd", issueDate: "2026-10-03", dueDate: "2026-10-20" });
  const b = make({ clientName: "alpha Co", issueDate: "2026-10-05", dueDate: "2026-10-10", status: "paid" });
  const c = make({
    clientName: "Mid Inc",
    issueDate: "2026-10-04",
    dueDate: "2026-10-15",
    currency: "JPY",
    lineItems: [{ id: "l", description: "x", quantity: 1, unitPriceMinor: 999999 }],
  });
  const all = [a, b, c];

  it("returns everything by default, newest issue date first", () => {
    expect(filterAndSortInvoices(all, DEFAULT_FILTERS).map((i) => i.id)).toEqual([
      b.id,
      c.id,
      a.id,
    ]);
  });

  it("does not mutate its input", () => {
    const input = [...all];
    filterAndSortInvoices(input, { ...DEFAULT_FILTERS, sort: "client-asc" });
    expect(input).toEqual(all);
  });

  it("searches number, client and company, case-insensitively, all words", () => {
    const find = (query: string) =>
      filterAndSortInvoices(all, { ...DEFAULT_FILTERS, query }).map((i) => i.id);

    expect(find("ALPHA")).toEqual([b.id]);
    expect(find(a.invoiceNumber.toLowerCase())).toEqual([a.id]);
    expect(find("acme zeta")).toEqual([a.id]);
    expect(find("nonexistent")).toEqual([]);
    expect(find("   ")).toHaveLength(3);
  });

  it("filters by status and currency", () => {
    expect(
      filterAndSortInvoices(all, { ...DEFAULT_FILTERS, status: "paid" }).map((i) => i.id),
    ).toEqual([b.id]);
    expect(
      filterAndSortInvoices(all, { ...DEFAULT_FILTERS, currency: "JPY" }).map((i) => i.id),
    ).toEqual([c.id]);
  });

  it("sorts by due date, client (ignoring case) and issue date ascending", () => {
    const ids = (sort: ListFiltersSort) =>
      filterAndSortInvoices(all, { ...DEFAULT_FILTERS, sort }).map((i) => i.id);

    expect(ids("due-asc")).toEqual([b.id, c.id, a.id]);
    expect(ids("client-asc")).toEqual([b.id, c.id, a.id]);
    expect(ids("issued-asc")).toEqual([a.id, c.id, b.id]);
  });

  it("never compares amounts across currencies", () => {
    const small = make({ currency: "USD", lineItems: [{ id: "l", description: "x", quantity: 1, unitPriceMinor: 100 }] });
    const big = make({ currency: "USD", lineItems: [{ id: "l", description: "x", quantity: 1, unitPriceMinor: 900 }] });
    const yen = make({ currency: "JPY", lineItems: [{ id: "l", description: "x", quantity: 1, unitPriceMinor: 5 }] });

    const sorted = filterAndSortInvoices([small, yen, big], {
      ...DEFAULT_FILTERS,
      sort: "amount-desc",
    }).map((i) => i.id);

    // Grouped by currency code (JPY < USD), high to low within each.
    expect(sorted).toEqual([yen.id, big.id, small.id]);
  });
});

type ListFiltersSort = Parameters<typeof filterAndSortInvoices>[1]["sort"];

describe("hasActiveFilters", () => {
  it("is false for defaults and whitespace, true otherwise", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: "  " })).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, query: "x" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, status: "paid" })).toBe(true);
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, currency: "EUR" })).toBe(true);
  });
});
