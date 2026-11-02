// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@/components/ui/toast";
import { getInvoiceRepository } from "../repository";
import type { NewInvoice } from "../repository";
import { DashboardView } from "./dashboard/dashboard-view";
import { InvoiceListView } from "./list/invoice-list-view";

let searchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
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
  searchParams = new URLSearchParams();
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 15, 12) });
});

afterEach(() => {
  vi.useRealTimers();
});

function draft(overrides: Partial<NewInvoice> = {}): NewInvoice {
  return {
    documentType: "invoice",
    companyName: "Acme",
    clientName: "Globex",
    issueDate: "2026-10-01",
    dueDate: "2026-10-31",
    currency: "USD",
    taxRatePercent: 0,
    discount: { type: "none" },
    status: "sent",
    lineItems: [{ id: "l", description: "Work", quantity: 1, unitPriceMinor: 10000 }],
    ...overrides,
  };
}

const wrap = (node: ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

async function seedThree() {
  const repo = getInvoiceRepository();
  await repo.create(draft({ clientName: "Zeta Ltd", issueDate: "2026-10-03" }));
  await repo.create(draft({ clientName: "Alpha Co", issueDate: "2026-10-05", status: "paid" }));
  await repo.create(
    draft({ clientName: "Mid Inc", issueDate: "2026-09-20", dueDate: "2026-10-01", currency: "EUR" }),
  );
}

describe("InvoiceListView", () => {
  it("shows an honest empty state with no documents", async () => {
    wrap(<InvoiceListView />);
    expect(await screen.findByText("No documents yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create a document" })).toHaveAttribute(
      "href",
      "/invoices/new",
    );
  });

  it("lists documents newest first, deriving overdue from the due date", async () => {
    await seedThree();
    wrap(<InvoiceListView />);

    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Alpha Co");
    expect(rows[1]).toHaveTextContent("Zeta Ltd");
    expect(rows[2]).toHaveTextContent("Mid Inc");

    // Mid Inc was stored as "sent" but is past due.
    expect(
      within(rows[2]).getByRole("combobox", { name: /^Status of/ }),
    ).toHaveValue("overdue");
  });

  it("filters by search text and by status, and can clear", async () => {
    const user = userEvent.setup();
    await seedThree();
    wrap(<InvoiceListView />);
    await screen.findByRole("table");

    await user.type(screen.getByLabelText("Search documents"), "alpha");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);

    await user.clear(screen.getByLabelText("Search documents"));
    await user.click(screen.getByRole("button", { name: /^Paid/ }));
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("Alpha Co");

    await user.type(screen.getByLabelText("Search documents"), "zzz");
    expect(await screen.findByText("No matching documents")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(4);
  });

  it("shows status counts on the tabs and honours ?status= from the URL", async () => {
    searchParams = new URLSearchParams("status=overdue");
    await seedThree();
    wrap(<InvoiceListView />);

    const overdueTab = await screen.findByRole("button", { name: /^Overdue/ });
    expect(overdueTab).toHaveAttribute("aria-pressed", "true");
    expect(overdueTab).toHaveTextContent("1");
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);
  });

  it("ignores an invalid ?status= value", async () => {
    searchParams = new URLSearchParams("status=bogus");
    await seedThree();
    wrap(<InvoiceListView />);
    await screen.findByRole("table");
    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute("aria-pressed", "true");
  });

  it("sorts by client name", async () => {
    const user = userEvent.setup();
    await seedThree();
    wrap(<InvoiceListView />);
    await screen.findByRole("table");

    await user.selectOptions(screen.getByLabelText("Sort documents"), "client-asc");
    const rows = within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Alpha Co"),
      expect.stringContaining("Mid Inc"),
      expect.stringContaining("Zeta Ltd"),
    ]);
  });

  it("changes status and confirms with a toast", async () => {
    const user = userEvent.setup();
    await getInvoiceRepository().create(draft());
    wrap(<InvoiceListView />);

    const table = await screen.findByRole("table");
    const select = within(table).getByRole("combobox", { name: /^Status of/ });
    await user.selectOptions(select, "paid");

    expect(await screen.findByText(/marked paid/)).toBeInTheDocument();
    await waitFor(async () =>
      expect((await getInvoiceRepository().list())[0].status).toBe("paid"),
    );
  });

  it("asks before deleting, and cancel keeps the document", async () => {
    const user = userEvent.setup();
    await getInvoiceRepository().create(draft());
    wrap(<InvoiceListView />);

    await user.click(
      within(await screen.findByRole("table")).getByRole("button", { name: /^Delete INV-/ }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent(/cannot be undone/);

    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(await getInvoiceRepository().list()).toHaveLength(1);
  });

  it("deletes only after confirmation", async () => {
    const user = userEvent.setup();
    await getInvoiceRepository().create(draft());
    wrap(<InvoiceListView />);

    await user.click(
      within(await screen.findByRole("table")).getByRole("button", { name: /^Delete INV-/ }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Delete" }));

    await waitFor(async () => expect(await getInvoiceRepository().list()).toEqual([]));
    expect(await screen.findByText("No documents yet")).toBeInTheDocument();
  });

  it("reports unreadable saved records instead of hiding them", async () => {
    window.localStorage.setItem(
      "currency-invoice-processor:invoices:v2",
      JSON.stringify({ version: 2, invoices: [{ id: "junk" }], quarantine: [] }),
    );
    wrap(<InvoiceListView />);
    expect(await screen.findByText(/unreadable and set aside/)).toBeInTheDocument();
  });
});

describe("DashboardView", () => {
  it("shows an empty state and no invented figures when there is no data", async () => {
    wrap(<DashboardView />);
    expect(await screen.findByText("No documents yet")).toBeInTheDocument();
    expect(screen.queryByText("Total invoiced")).not.toBeInTheDocument();
    expect(screen.queryByText("Insights")).not.toBeInTheDocument();
  });

  it("summarises real data per currency without mixing them", async () => {
    await seedThree();
    wrap(<DashboardView />);

    expect(await screen.findByText("Total invoiced")).toBeInTheDocument();
    const invoiced = screen.getByText("Total invoiced").closest("div")!;
    expect(within(invoiced).getByText("$200.00")).toBeInTheDocument();
    expect(within(invoiced).getByText("€100.00")).toBeInTheDocument();

    // 3 documents: 1 paid, 1 overdue (EUR, past due), 1 sent.
    expect(
      screen.getByRole("img", {
        name: "Status distribution: 1 paid, 1 sent, 0 draft, 1 overdue",
      }),
    ).toBeInTheDocument();
  });

  it("calls out overdue documents and the next payment due", async () => {
    await seedThree();
    wrap(<DashboardView />);

    expect(await screen.findByText("1 overdue document")).toBeInTheDocument();
    expect(screen.getByText("Next payment due")).toBeInTheDocument();
  });

  it("lists recent activity linking to each document", async () => {
    await seedThree();
    wrap(<DashboardView />);
    const recent = await screen.findByRole("region", { name: "Recent activity" });
    expect(within(recent).getAllByRole("link", { name: /INV-/ })).toHaveLength(3);
  });
});
