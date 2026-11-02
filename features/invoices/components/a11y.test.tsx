// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import axe from "axe-core";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToastProvider } from "@/components/ui/toast";
import { CurrencyConverter } from "@/features/exchange-rates/components/currency-converter";
import { getInvoiceRepository } from "../repository";
import { DashboardView } from "./dashboard/dashboard-view";
import { InvoiceDocument } from "./invoice-document";
import { InvoiceForm } from "./invoice-form";
import { InvoiceListView } from "./list/invoice-list-view";
import { getInvoiceTotals } from "../lib/calculations";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

beforeEach(() => {
  window.localStorage.clear();
});

/**
 * Runs axe-core's WCAG A/AA rules on the rendered DOM and fails with a
 * readable list. Colour contrast needs real layout and styles, which jsdom
 * does not have, so that rule is excluded here.
 */
async function expectNoViolations(container: HTMLElement) {
  const results = await axe.run(container, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
    rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
  });

  const summary = results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help}\n` +
      violation.nodes.map((node) => `    ${node.html.slice(0, 120)}`).join("\n"),
  );
  expect(summary, summary.join("\n")).toEqual([]);
}

async function seed() {
  const repo = getInvoiceRepository();
  await repo.create({
    documentType: "invoice",
    companyName: "Acme",
    clientName: "Globex",
    clientEmail: "ap@globex.example",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    currency: "USD",
    taxRatePercent: 10,
    discount: { type: "percent", percent: 10 },
    status: "sent",
    notes: "Net 30",
    lineItems: [{ id: "l", description: "Work", quantity: 2, unitPriceMinor: 5000 }],
  });
}

describe("accessibility (axe-core, WCAG 2.1 A/AA)", () => {
  it("new document form", async () => {
    const { container } = render(
      <ToastProvider>
        <InvoiceForm />
      </ToastProvider>,
    );
    await screen.findByDisplayValue(/INV-/);
    await expectNoViolations(container);
  });

  it("new document form with validation errors showing", async () => {
    const { container } = render(
      <ToastProvider>
        <InvoiceForm />
      </ToastProvider>,
    );
    (await screen.findByRole("button", { name: "Save invoice" })).click();
    await screen.findByText("Company name is required.");
    await expectNoViolations(container);
  });

  it("invoice list with data", async () => {
    await seed();
    const { container } = render(
      <ToastProvider>
        <InvoiceListView />
      </ToastProvider>,
    );
    await screen.findByRole("table");
    await expectNoViolations(container);
  });

  it("invoice list empty state", async () => {
    const { container } = render(
      <ToastProvider>
        <InvoiceListView />
      </ToastProvider>,
    );
    await screen.findByText("No documents yet");
    await expectNoViolations(container);
  });

  it("dashboard with data", async () => {
    await seed();
    const { container } = render(
      <ToastProvider>
        <DashboardView />
      </ToastProvider>,
    );
    await screen.findByText("Total invoiced");
    await expectNoViolations(container);
  });

  it("dashboard empty state", async () => {
    const { container } = render(
      <ToastProvider>
        <DashboardView />
      </ToastProvider>,
    );
    await screen.findByText("No documents yet");
    await expectNoViolations(container);
  });

  it("invoice document", async () => {
    await seed();
    const [invoice] = await getInvoiceRepository().list();
    const { container } = render(
      <InvoiceDocument data={invoice} totals={getInvoiceTotals(invoice)} showStatus />,
    );
    await expectNoViolations(container);
  });

  it("currency converter", async () => {
    const { container } = render(<CurrencyConverter />);
    await expectNoViolations(container);
  });

  it("confirmation dialog", async () => {
    const { container } = render(
      <ConfirmDialog
        open
        title="Delete it?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    await expectNoViolations(container);
  });
});

describe("the accessibility harness itself", () => {
  it("fails on a known violation (so a pass above means something)", async () => {
    const { container } = render(
      <div>
        <input />
        {/* Deliberately inaccessible: this fixture must trip axe. */}
        {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text */}
        <img src="x.png" />
        <button />
      </div>,
    );
    await expect(expectNoViolations(container)).rejects.toThrow();
  });
});
