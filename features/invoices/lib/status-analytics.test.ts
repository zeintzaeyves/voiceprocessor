import { describe, expect, it } from "vitest";
import type { Invoice } from "../types";
import { calculateInvoiceAnalytics } from "./analytics";
import { getEffectiveInvoiceStatus } from "./status";

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "i1",
    documentType: "invoice",
    companyName: "Acme",
    invoiceNumber: "INV-10102026-001",
    clientName: "Globex",
    issueDate: "2026-10-01",
    dueDate: "2026-10-15",
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

describe("getEffectiveInvoiceStatus", () => {
  it("never changes a paid invoice, even when past due", () => {
    expect(
      getEffectiveInvoiceStatus(makeInvoice({ status: "paid" }), "2027-01-01"),
    ).toBe("paid");
  });

  it("becomes overdue only when the due date is strictly before today", () => {
    const invoice = makeInvoice({ dueDate: "2026-10-15" });
    expect(getEffectiveInvoiceStatus(invoice, "2026-10-15")).toBe("sent");
    expect(getEffectiveInvoiceStatus(invoice, "2026-10-16")).toBe("overdue");
  });

  it("treats drafts past their due date as overdue", () => {
    expect(
      getEffectiveInvoiceStatus(makeInvoice({ status: "draft" }), "2026-12-01"),
    ).toBe("overdue");
  });

  it("reverts a stale overdue flag when the due date is in the future", () => {
    expect(
      getEffectiveInvoiceStatus(
        makeInvoice({ status: "overdue", dueDate: "2026-12-31" }),
        "2026-10-20",
      ),
    ).toBe("sent");
  });
});

describe("calculateInvoiceAnalytics", () => {
  const today = "2026-10-20";

  it("returns nothing when there are no invoices", () => {
    expect(calculateInvoiceAnalytics([], today)).toEqual([]);
  });

  it("groups by currency and never mixes them", () => {
    const result = calculateInvoiceAnalytics(
      [
        makeInvoice({ id: "a", currency: "USD" }),
        makeInvoice({ id: "b", currency: "EUR" }),
        makeInvoice({ id: "c", currency: "USD", status: "paid" }),
      ],
      today,
    );

    expect(result.map((entry) => entry.currency)).toEqual(["EUR", "USD"]);
    const usd = result.find((entry) => entry.currency === "USD")!;
    expect(usd).toMatchObject({
      totalInvoices: 2,
      paidInvoices: 1,
      paidMinor: 10000,
      outstandingMinor: 10000,
    });
  });

  it("counts overdue amounts as outstanding and overdue", () => {
    const [usd] = calculateInvoiceAnalytics(
      [makeInvoice({ dueDate: "2026-10-01" })],
      today,
    );
    expect(usd).toMatchObject({
      overdueInvoices: 1,
      overdueMinor: 10000,
      outstandingMinor: 10000,
      paidMinor: 0,
    });
  });

  it("includes discounts and tax in amounts", () => {
    const [usd] = calculateInvoiceAnalytics(
      [
        makeInvoice({
          taxRatePercent: 10,
          discount: { type: "percent", percent: 50 },
          status: "paid",
        }),
      ],
      today,
    );
    // 100.00 − 50% = 50.00; + 10% tax = 55.00
    expect(usd.paidMinor).toBe(5500);
  });
});
