
import { describe, expect, it } from "vitest";
import type { Invoice } from "../types";
import { validateInvoice } from "./validation";

const validInvoice: Invoice = {
  id: "inv-1",
  invoiceNumber: "INV-001",
  clientName: "Acme Inc.",
  issueDate: "2026-10-10",
  dueDate: "2026-10-20",
  currency: "USD",
  taxRatePercent: 10,
  status: "draft",
  lineItems: [
    {
      id: "item-1",
      description: "Web development",
      quantity: 2,
      unitPriceMinor: 5000,
    },
  ],
};

describe("validateInvoice", () => {
  it("accepts a valid invoice", () => {
    expect(validateInvoice(validInvoice)).toEqual({
      valid: true,
      errors: [],
    });
  });

  it("rejects a missing client name", () => {
    const result = validateInvoice({
      ...validInvoice,
      clientName: " ",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Client name is required.");
  });

  it("rejects a due date before the issue date", () => {
    const result = validateInvoice({
      ...validInvoice,
      dueDate: "2026-10-09",
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Due date cannot be before issue date.",
    );
  });

  it("rejects a negative quantity", () => {
    const result = validateInvoice({
      ...validInvoice,
      lineItems: [
        {
          ...validInvoice.lineItems[0],
          quantity: -1,
        },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Line item 1: quantity must be greater than zero.",
    );
  });

  it("rejects a tax rate above 100%", () => {
    const result = validateInvoice({
      ...validInvoice,
      taxRatePercent: 150,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      "Tax rate must be between 0 and 100.",
    );
  });
});
