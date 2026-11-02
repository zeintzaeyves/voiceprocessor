import { describe, expect, it } from "vitest";
import { invoiceSchema, isoDateSchema } from "../schema";
import { getFieldErrors, parseInvoice, validateInvoice } from "./validation";

const base = {
  id: "inv-1",
  documentType: "invoice",
  companyName: "  Acme Studio  ",
  invoiceNumber: "INV-10102026-001",
  clientName: "Globex",
  issueDate: "2026-10-10",
  dueDate: "2026-10-20",
  currency: "USD",
  taxRatePercent: 8.25,
  discount: { type: "percent", percent: 10 },
  status: "draft",
  lineItems: [
    { id: "a", description: "Design", quantity: 1.5, unitPriceMinor: 10000 },
  ],
};

describe("isoDateSchema", () => {
  it.each(["2026-02-28", "2028-02-29", "2026-12-31"])("accepts %s", (d) => {
    expect(isoDateSchema.safeParse(d).success).toBe(true);
  });

  it.each(["2026-02-30", "2026-13-01", "2026-00-10", "10/10/2026", ""])(
    "rejects %j",
    (d) => {
      expect(isoDateSchema.safeParse(d).success).toBe(false);
    },
  );
});

describe("invoiceSchema", () => {
  it("accepts a valid invoice and trims text", () => {
    const parsed = invoiceSchema.parse(base);
    expect(parsed.companyName).toBe("Acme Studio");
  });

  it("defaults discount and document type for older data", () => {
    const rest: Record<string, unknown> = { ...base };
    delete rest.discount;
    delete rest.documentType;

    const parsed = invoiceSchema.parse(rest);
    expect(parsed.discount).toEqual({ type: "none" });
    expect(parsed.documentType).toBe("invoice");
  });

  it.each([
    ["negative price", { lineItems: [{ ...base.lineItems[0], unitPriceMinor: -1 }] }],
    ["fractional minor units", { lineItems: [{ ...base.lineItems[0], unitPriceMinor: 10.5 }] }],
    ["zero quantity", { lineItems: [{ ...base.lineItems[0], quantity: 0 }] }],
    ["4-decimal quantity", { lineItems: [{ ...base.lineItems[0], quantity: 1.0001 }] }],
    ["NaN quantity", { lineItems: [{ ...base.lineItems[0], quantity: Number.NaN }] }],
    ["string quantity", { lineItems: [{ ...base.lineItems[0], quantity: "2" }] }],
    ["no line items", { lineItems: [] }],
    ["blank description", { lineItems: [{ ...base.lineItems[0], description: "   " }] }],
    ["unsupported currency", { currency: "XYZ" }],
    ["tax above 100", { taxRatePercent: 100.01 }],
    ["tax with 3 decimals", { taxRatePercent: 8.255 }],
    ["negative tax", { taxRatePercent: -1 }],
    ["discount over 100%", { discount: { type: "percent", percent: 101 } }],
    ["negative fixed discount", { discount: { type: "fixed", amountMinor: -5 } }],
    ["unknown discount type", { discount: { type: "bogus" } }],
    ["blank company", { companyName: " " }],
    ["impossible issue date", { issueDate: "2026-02-31" }],
    ["due before issue", { dueDate: "2026-10-09" }],
    ["unknown status", { status: "void" }],
  ])("rejects %s", (_name, override) => {
    expect(invoiceSchema.safeParse({ ...base, ...override }).success).toBe(
      false,
    );
  });

  it.each([null, undefined, 42, "text", [], {}])(
    "rejects malformed input %j without throwing",
    (input) => {
      expect(() => validateInvoice(input)).not.toThrow();
      expect(validateInvoice(input).valid).toBe(false);
    },
  );
});

describe("optional contact fields", () => {
  it("accepts a normal email, including addresses containing the letter s", () => {
    const parsed = invoiceSchema.parse({
      ...base,
      clientEmail: "sales@steady-systems.example",
    });
    expect(parsed.clientEmail).toBe("sales@steady-systems.example");
  });

  it.each(["not-an-email", "a@b", "a b@c.com", "@c.com"])(
    "rejects the email %j",
    (clientEmail) => {
      expect(invoiceSchema.safeParse({ ...base, clientEmail }).success).toBe(
        false,
      );
    },
  );

  it("treats blank optional text as absent", () => {
    const parsed = invoiceSchema.parse({
      ...base,
      clientEmail: "  ",
      companyAddress: "",
      notes: "   ",
    });
    expect(parsed.clientEmail).toBeUndefined();
    expect(parsed.companyAddress).toBeUndefined();
    expect(parsed.notes).toBeUndefined();
  });

  it("limits note length", () => {
    expect(
      invoiceSchema.safeParse({ ...base, notes: "x".repeat(1001) }).success,
    ).toBe(false);
  });
});

describe("validation helpers", () => {
  it("returns field-keyed errors for forms", () => {
    const errors = getFieldErrors({
      ...base,
      dueDate: "2026-10-01",
      lineItems: [{ ...base.lineItems[0], quantity: 0 }],
    });
    expect(errors["dueDate"]).toBe("Due date cannot be before issue date.");
    expect(errors["lineItems.0.quantity"]).toBe(
      "Quantity must be greater than zero.",
    );
  });

  it("parseInvoice returns normalized data or messages", () => {
    const ok = parseInvoice(base);
    expect(ok.ok).toBe(true);

    const bad = parseInvoice({ ...base, clientName: "" });
    expect(bad).toEqual({ ok: false, errors: ["Client name is required."] });
  });
});
