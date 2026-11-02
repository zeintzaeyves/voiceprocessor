// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { getInvoiceRepository, InvoiceRepositoryError } from "../repository";
import type { Invoice } from "../types";
import { InvoiceForm } from "./invoice-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
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
  push.mockClear();
  // Fix "today" so default dates and numbering are deterministic, leaving timers real.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 10, 12) });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function renderForm(initialInvoice?: Invoice) {
  return render(
    <ToastProvider>
      <InvoiceForm initialInvoice={initialInvoice} />
    </ToastProvider>,
  );
}

const preview = () => screen.getByRole("complementary", { name: "Live preview" });

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Company name"), "Acme Studio");
  await user.type(screen.getByLabelText("Client name"), "Globex");
  await user.type(screen.getByLabelText(/^Description/), "Brand design");
  await user.clear(screen.getByLabelText("Quantity"));
  await user.type(screen.getByLabelText("Quantity"), "2");
  await user.type(screen.getByLabelText("Unit price"), "1,250.50");
}

describe("InvoiceForm: a new document", () => {
  it("starts with today's date, net-14 terms and a number preview", async () => {
    renderForm();

    expect(screen.getByLabelText("Issue date")).toHaveValue("2026-10-10");
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-10-24");
    expect(await screen.findByDisplayValue("INV-10102026-001")).toBeInTheDocument();
  });

  it("labels every control", () => {
    renderForm();
    for (const label of [
      "Document number",
      "Currency",
      "Issue date",
      "Due date",
      "Company name",
      "Client name",
      "Client email",
      "Quantity",
      "Unit price",
      "Tax rate (%)",
      "Discount",
      "Notes",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.getByRole("radio", { name: /Invoice/ })).toBeChecked();
  });

  it("keeps the due date aligned with net-14 terms when the issue date moves", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Issue date"), { target: { value: "2026-11-01" } });
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-11-15");
  });

  it("leaves a hand-picked due date alone when the issue date moves", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-12-31" } });
    fireEvent.change(screen.getByLabelText("Issue date"), { target: { value: "2026-11-01" } });
    expect(screen.getByLabelText("Due date")).toHaveValue("2026-12-31");
  });

  it("saves a valid invoice, announces it and opens it", async () => {
    const user = userEvent.setup();
    renderForm();

    await fillValid(user);
    await screen.findByDisplayValue("INV-10102026-001");
    await user.click(screen.getByRole("button", { name: "Save invoice" }));

    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));

    const [saved] = await getInvoiceRepository().list();
    expect(saved).toMatchObject({
      invoiceNumber: "INV-10102026-001",
      companyName: "Acme Studio",
      clientName: "Globex",
      issueDate: "2026-10-10",
      dueDate: "2026-10-24",
      currency: "USD",
      taxRatePercent: 0,
      status: "draft",
      lineItems: [{ description: "Brand design", quantity: 2, unitPriceMinor: 125050 }],
    });
    expect(push).toHaveBeenCalledWith(`/invoices/${saved.id}`);
    expect(await screen.findByRole("status")).toHaveTextContent("INV-10102026-001 saved");
  });

  it("recalculates the preview exactly as you type", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "3");
    await user.type(screen.getByLabelText("Unit price"), "19.99");
    await user.clear(screen.getByLabelText("Tax rate (%)"));
    await user.type(screen.getByLabelText("Tax rate (%)"), "10");

    // 3 × 19.99 = 59.97; 10% tax = 5.997 → 6.00; total 65.97
    const live = within(preview());
    expect(live.getByText("Subtotal").nextSibling).toHaveTextContent("$59.97");
    expect(live.getByText("Tax (10%)").nextSibling).toHaveTextContent("$6.00");
    expect(live.getByText("Total due").nextSibling).toHaveTextContent("$65.97");
  });

  it("applies a percentage discount before tax and shows it", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Unit price"), "100");
    await user.clear(screen.getByLabelText("Tax rate (%)"));
    await user.type(screen.getByLabelText("Tax rate (%)"), "10");
    await user.selectOptions(screen.getByLabelText("Discount"), "percent");
    await user.type(screen.getByLabelText("Percent off"), "20");

    const live = within(preview());
    expect(live.getByText("Discount (20%)").nextSibling).toHaveTextContent("−$20.00");
    // 100 − 20 = 80; tax 8; total 88
    expect(live.getByText("Total due").nextSibling).toHaveTextContent("$88.00");
  });

  it("does not crash or blank out while a field is half-typed", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Unit price"), "5");
    await user.clear(screen.getByLabelText("Quantity"));
    await user.type(screen.getByLabelText("Quantity"), "abc");

    expect(within(preview()).getByText("Total due")).toBeInTheDocument();
  });
});

describe("InvoiceForm: validation", () => {
  it("shows no errors while the form is untouched", () => {
    renderForm();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a field's error once it has been left, not while typing", async () => {
    const user = userEvent.setup();
    renderForm();

    const company = screen.getByLabelText("Company name");
    await user.click(company);
    expect(screen.queryByText("Company name is required.")).not.toBeInTheDocument();

    await user.tab();
    expect(await screen.findByText("Company name is required.")).toBeInTheDocument();
    expect(company).toHaveAttribute("aria-invalid", "true");
    expect(company).toHaveAccessibleDescription("Company name is required.");
  });

  it("on a rejected save shows every problem, focuses the first and saves nothing", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Save invoice" }));

    expect(await screen.findByText("Company name is required.")).toBeInTheDocument();
    expect(screen.getByText("Client name is required.")).toBeInTheDocument();
    expect(screen.getByText("Description is required.")).toBeInTheDocument();
    expect(screen.getByText("Enter a unit price.")).toBeInTheDocument();
    expect(screen.getByLabelText("Company name")).toHaveFocus();

    expect(await getInvoiceRepository().list()).toEqual([]);
    expect(push).not.toHaveBeenCalled();
  });

  it("explains a price with too many decimals for the currency", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Unit price"), "10.999");
    await user.tab();

    expect(await screen.findByText(/up to 2 decimal places/)).toBeInTheDocument();
  });

  it("asks for whole amounts in a zero-decimal currency", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.selectOptions(screen.getByLabelText("Currency"), "JPY");
    await user.type(screen.getByLabelText("Unit price"), "10.5");
    await user.tab();

    expect(await screen.findByText(/whole amount/)).toBeInTheDocument();
  });

  it("rejects a due date before the issue date", async () => {
    const user = userEvent.setup();
    renderForm();

    fireEvent.change(screen.getByLabelText("Due date"), { target: { value: "2026-10-01" } });
    fireEvent.blur(screen.getByLabelText("Due date"));

    expect(await screen.findByText("Due date cannot be before issue date.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save invoice" }));
    expect(await getInvoiceRepository().list()).toEqual([]);
  });

  it("surfaces a storage failure instead of failing silently", async () => {
    const user = userEvent.setup();
    renderForm();
    vi.spyOn(getInvoiceRepository(), "create").mockRejectedValue(
      new InvoiceRepositoryError(
        "storage-write-failed",
        "Your changes could not be saved because browser storage is full or blocked.",
      ),
    );

    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Save invoice" }));

    const alert = await screen.findByText(/could not be saved\./);
    expect(alert.closest("[role=alert]")).toHaveTextContent(/storage is full or blocked/);
    expect(push).not.toHaveBeenCalled();
    // The button is usable again so the person can retry.
    expect(screen.getByRole("button", { name: "Save invoice" })).toBeEnabled();
  });
});

describe("InvoiceForm: line items", () => {
  it("adds an item and moves focus to its description", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("button", { name: "Add item" }));

    const descriptions = screen.getAllByLabelText(/^Description/);
    expect(descriptions).toHaveLength(2);
    expect(descriptions[1]).toHaveFocus();
  });

  it("removes an item but never the last one", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByRole("button", { name: "Remove item 1" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Add item" }));
    await user.click(screen.getByRole("button", { name: "Remove item 1" }));

    expect(screen.getAllByLabelText(/^Description/)).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Remove item 1" })).toBeDisabled();
  });
});

describe("InvoiceForm: receipts", () => {
  it("drops the due date and saves a paid receipt dated on its payment date", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.click(screen.getByRole("radio", { name: /Receipt/ }));
    expect(screen.queryByLabelText("Due date")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Payment date")).toBeInTheDocument();

    await fillValid(user);
    await screen.findByDisplayValue("REC-10102026-001");
    await user.click(screen.getByRole("button", { name: "Save receipt" }));
    await waitFor(() => expect(push).toHaveBeenCalled());

    const [saved] = await getInvoiceRepository().list();
    expect(saved).toMatchObject({
      documentType: "receipt",
      status: "paid",
      issueDate: "2026-10-10",
      dueDate: "2026-10-10",
    });
  });
});

describe("InvoiceForm: editing", () => {
  async function seed(): Promise<Invoice> {
    return getInvoiceRepository().create({
      documentType: "invoice",
      companyName: "Acme Studio",
      clientName: "Globex",
      issueDate: "2026-10-10",
      dueDate: "2026-10-24",
      currency: "USD",
      taxRatePercent: 10,
      discount: { type: "percent", percent: 20 },
      status: "sent",
      notes: "Thank you",
      lineItems: [{ id: "l1", description: "Retainer", quantity: 1, unitPriceMinor: 50000 }],
    });
  }

  it("loads the saved values, keeps the number and locks the document type", async () => {
    const original = await seed();
    renderForm(original);

    expect(screen.getByLabelText("Client name")).toHaveValue("Globex");
    expect(screen.getByLabelText("Unit price")).toHaveValue("500.00");
    expect(screen.getByLabelText("Discount")).toHaveValue("percent");
    expect(screen.getByLabelText("Percent off")).toHaveValue("20");
    expect(screen.getByLabelText("Notes")).toHaveValue("Thank you");
    expect(screen.getByLabelText("Document number")).toHaveValue(original.invoiceNumber);
    expect(screen.getByRole("radio", { name: /Invoice/ })).toBeDisabled();
    // 500 − 20% = 400; +10% tax = 440
    expect(within(preview()).getByText("Total due").nextSibling).toHaveTextContent("$440.00");
  });

  it("saves changes without touching the number, status or timestamps' creation", async () => {
    const original = await seed();
    const user = userEvent.setup();
    renderForm(original);

    await user.clear(screen.getByLabelText("Client name"));
    await user.type(screen.getByLabelText("Client name"), "Initech");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith(`/invoices/${original.id}`));

    const all = await getInvoiceRepository().list();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      id: original.id,
      invoiceNumber: original.invoiceNumber,
      clientName: "Initech",
      status: "sent",
      discount: { type: "percent", percent: 20 },
      createdAt: original.createdAt,
    });
  });
});
