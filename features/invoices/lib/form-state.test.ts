import { describe, expect, it } from "vitest";
import {
  buildInvoice,
  computeForm,
  emptyValues,
  validateForm,
  valuesFromInvoice,
  type FormValues,
} from "./form-state";
import type { Invoice } from "../types";

const TODAY = "2026-10-10";

function filled(overrides: Partial<FormValues> = {}): FormValues {
  return {
    ...emptyValues(TODAY, "l1"),
    companyName: "Acme Studio",
    clientName: "Globex",
    lineItems: [
      { id: "l1", description: "Design", quantity: "2", unitPrice: "1,250.50" },
    ],
    ...overrides,
  };
}

describe("emptyValues", () => {
  it("defaults to today with net-14 terms and one blank line", () => {
    const values = emptyValues(TODAY, "first");
    expect(values).toMatchObject({
      issueDate: "2026-10-10",
      dueDate: "2026-10-24",
      currency: "USD",
      discountKind: "none",
    });
    expect(values.lineItems).toEqual([
      { id: "first", description: "", quantity: "1", unitPrice: "" },
    ]);
  });
});

describe("validateForm", () => {
  it("has no errors for a complete form", () => {
    expect(validateForm(filled())).toEqual({});
  });

  it("flags every blank required field", () => {
    const errors = validateForm(emptyValues(TODAY, "l1"));
    expect(errors).toMatchObject({
      companyName: "Company name is required.",
      clientName: "Client name is required.",
      "lineItems.0.description": "Description is required.",
      "lineItems.0.unitPriceMinor": "Enter a unit price.",
    });
  });

  it("reports a due date before the issue date on the due date field", () => {
    expect(validateForm(filled({ dueDate: "2026-10-01" })).dueDate).toBe(
      "Due date cannot be before issue date.",
    );
  });

  it("reports the date problem even while other fields are still invalid", () => {
    // Blank price and names make the schema skip its cross-field rule.
    const errors = validateForm({
      ...emptyValues(TODAY, "l1"),
      dueDate: "2026-10-01",
    });
    expect(errors.dueDate).toBe("Due date cannot be before issue date.");
    expect(errors.companyName).toBeTruthy();
  });

  it("gives a currency-aware message for too many decimals", () => {
    const usd = validateForm(
      filled({ lineItems: [{ id: "l1", description: "x", quantity: "1", unitPrice: "10.999" }] }),
    );
    expect(usd["lineItems.0.unitPriceMinor"]).toMatch(/up to 2 decimal places/);

    const jpy = validateForm(
      filled({
        currency: "JPY",
        lineItems: [{ id: "l1", description: "x", quantity: "1", unitPrice: "10.5" }],
      }),
    );
    expect(jpy["lineItems.0.unitPriceMinor"]).toMatch(/whole amount/);
  });

  it.each(["0", "-1", "abc", "1.2345", ""])(
    "rejects the quantity %j",
    (quantity) => {
      const errors = validateForm(
        filled({ lineItems: [{ id: "l1", description: "x", quantity, unitPrice: "5" }] }),
      );
      expect(errors["lineItems.0.quantity"]).toBeTruthy();
    },
  );

  it("accepts fractional quantities", () => {
    expect(
      validateForm(
        filled({ lineItems: [{ id: "l1", description: "x", quantity: "1.5", unitPrice: "5" }] }),
      ),
    ).toEqual({});
  });

  it.each(["101", "-1", "abc", "8.255"])("rejects the tax rate %j", (taxRate) => {
    expect(validateForm(filled({ taxRate })).taxRatePercent).toBeTruthy();
  });

  it("treats a blank tax rate as zero", () => {
    expect(validateForm(filled({ taxRate: "" }))).toEqual({});
  });

  it("requires a value once a discount type is chosen", () => {
    expect(
      validateForm(filled({ discountKind: "percent", discountValue: "" })).discount,
    ).toBeTruthy();
    expect(
      validateForm(filled({ discountKind: "percent", discountValue: "150" })).discount,
    ).toBeTruthy();
    expect(
      validateForm(filled({ discountKind: "fixed", discountValue: "5.00" })),
    ).toEqual({});
  });

  it("does not demand a due date change for receipts", () => {
    const errors = validateForm(filled({ documentType: "receipt", dueDate: "2020-01-01" }));
    expect(errors.dueDate).toBeUndefined();
  });

  it("validates optional contact details", () => {
    expect(validateForm(filled({ clientEmail: "nope" })).clientEmail).toBeTruthy();
    expect(validateForm(filled({ clientEmail: "ok@example.com" }))).toEqual({});
  });
});

describe("buildInvoice", () => {
  it("converts text to minor units and numbers exactly", () => {
    const { invoice } = buildInvoice(filled(), "draft");
    expect(invoice.lineItems[0]).toMatchObject({ quantity: 2, unitPriceMinor: 125050 });
    expect(invoice.currency).toBe("USD");
  });

  it("makes a receipt due on its payment date", () => {
    const { invoice } = buildInvoice(
      filled({ documentType: "receipt", issueDate: "2026-10-10", dueDate: "2030-01-01" }),
      "paid",
    );
    expect(invoice.dueDate).toBe("2026-10-10");
  });
});

describe("computeForm totals", () => {
  it("computes exact totals with tax and a percentage discount", () => {
    const { totals } = computeForm(
      filled({ taxRate: "10", discountKind: "percent", discountValue: "20" }),
      "draft",
    );
    // 2 × 1250.50 = 2501.00; −20% = 2000.80 taxable; +10% tax = 200.08
    expect(totals).toEqual({
      subtotalMinor: 250100,
      discountMinor: 50020,
      taxableMinor: 200080,
      taxMinor: 20008,
      totalMinor: 220088,
    });
  });

  it("applies a fixed discount in the chosen currency's units", () => {
    const { totals } = computeForm(
      filled({
        currency: "JPY",
        lineItems: [{ id: "l1", description: "x", quantity: "3", unitPrice: "1000" }],
        discountKind: "fixed",
        discountValue: "500",
      }),
      "draft",
    );
    expect(totals.subtotalMinor).toBe(3000);
    expect(totals.discountMinor).toBe(500);
    expect(totals.totalMinor).toBe(2500);
  });

  it("keeps showing totals while an unrelated field is invalid", () => {
    const { totals } = computeForm(
      filled({
        lineItems: [
          { id: "l1", description: "x", quantity: "2", unitPrice: "10" },
          { id: "l2", description: "y", quantity: "abc", unitPrice: "10" },
        ],
      }),
      "draft",
    );
    expect(totals.subtotalMinor).toBe(2000); // the invalid line contributes nothing
  });

  it("ignores a half-typed discount instead of blanking the totals", () => {
    const { totals } = computeForm(
      filled({ discountKind: "percent", discountValue: "1." }),
      "draft",
    );
    expect(totals.discountMinor).toBe(0);
    expect(totals.subtotalMinor).toBe(250100);
  });
});

describe("valuesFromInvoice", () => {
  const invoice: Invoice = {
    id: "i",
    documentType: "invoice",
    companyName: "Acme",
    invoiceNumber: "INV-1",
    clientName: "Globex",
    issueDate: "2026-10-10",
    dueDate: "2026-10-24",
    currency: "JPY",
    taxRatePercent: 8.25,
    discount: { type: "fixed", amountMinor: 500 },
    status: "sent",
    notes: "Thanks",
    lineItems: [{ id: "a", description: "Work", quantity: 1.5, unitPriceMinor: 2000 }],
  };

  it("round-trips back to an identical, valid invoice", () => {
    const values = valuesFromInvoice(invoice);
    expect(values).toMatchObject({
      currency: "JPY",
      taxRate: "8.25",
      discountKind: "fixed",
      discountValue: "500",
      notes: "Thanks",
    });
    expect(values.lineItems[0]).toEqual({
      id: "a",
      description: "Work",
      quantity: "1.5",
      unitPrice: "2000",
    });

    expect(validateForm(values, "sent")).toEqual({});
    const { invoice: rebuilt } = buildInvoice(values, "sent");
    expect(rebuilt.lineItems).toEqual(invoice.lineItems);
    expect(rebuilt.discount).toEqual(invoice.discount);
    expect(rebuilt.taxRatePercent).toBe(8.25);
  });
});
