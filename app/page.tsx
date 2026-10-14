
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Invoice, InvoiceStatus } from "@/features/invoices/types";
import {
  deleteInvoice,
  updateInvoiceStatus,
} from "@/features/invoices/storage";
import { CurrencyConverter } from "@/features/exchange-rates/components/currency-converter";
import { getEffectiveInvoiceStatus } from "@/features/invoices/lib/status";
import { calculateInvoiceAnalytics } from "@/features/invoices/lib/analytics";
import {
  formatMoney,
  getInvoiceTotal,
  getLocalDateString,
} from "@/features/invoices/lib/dashboard-utils";
import { useInvoices } from "@/features/invoices/hooks/use-invoices";
import { WelcomeIntro } from "@/features/invoices/components/welcome-intro";
import { DashboardHeader } from "@/features/invoices/components/dashboard-header";
import { DashboardSummary } from "@/features/invoices/components/dashboard-summary";
import { FinancialOverview } from "@/features/invoices/components/financial-overview";
import { InvoiceList } from "@/features/invoices/components/invoice-list";

export default function HomePage() {
  const invoices = useInvoices();
  const [today, setToday] = useState("");

  useEffect(() => {
    const updateToday = () => setToday(getLocalDateString());

    updateToday();
    const interval = window.setInterval(updateToday, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  const effectiveInvoices = useMemo(
    () =>
      invoices.map((invoice) => ({
        ...invoice,
        status: today
          ? getEffectiveInvoiceStatus(invoice, today)
          : invoice.status,
      })),
    [invoices, today],
  );

  const paidCount = effectiveInvoices.filter(
    (invoice) => invoice.status === "paid",
  ).length;

  const overdueCount = effectiveInvoices.filter(
    (invoice) => invoice.status === "overdue",
  ).length;

  const totalValueLabel = useMemo(() => {
    const totals = new Map<string, number>();

    for (const invoice of invoices) {
      totals.set(
        invoice.currency,
        (totals.get(invoice.currency) ?? 0) + getInvoiceTotal(invoice),
      );
    }

    if (totals.size === 0) return "—";

    return Array.from(totals.entries())
      .map(([currency, amount]) => formatMoney(amount, currency))
      .join(" · ");
  }, [invoices]);

  const analytics = useMemo(
    () => (today ? calculateInvoiceAnalytics(invoices, today) : []),
    [invoices, today],
  );

  function handleStatusChange(id: string, status: InvoiceStatus) {
    try {
      updateInvoiceStatus(id, status);
    } catch {
      window.alert("Unable to update invoice status. Please try again.");
    }
  }

  function handleDelete(invoice: Invoice) {
    const confirmed = window.confirm(
      `Delete invoice ${invoice.invoiceNumber}? This cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      deleteInvoice(invoice.id);
    } catch {
      window.alert("Unable to delete this invoice. Please try again.");
    }
  }

  return (
    <>
      <WelcomeIntro />

      <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-950 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <DashboardHeader />

          <DashboardSummary
            totalInvoices={invoices.length}
            paidInvoices={paidCount}
            overdueInvoices={overdueCount}
            totalValueLabel={totalValueLabel}
          />

          <FinancialOverview
            analytics={analytics}
            loading={!today}
          />

          <div className="mt-8">
            <CurrencyConverter />
          </div>

          <InvoiceList
            invoices={effectiveInvoices}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />

          <footer className="mt-6 text-xs leading-5 text-gray-400">
            Invoices are stored in this browser using local storage.
            Financial analytics are grouped by currency and do not convert
            balances into a single reporting currency.
          </footer>
        </div>
      </main>
    </>
  );
}
