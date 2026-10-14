
"use client";

import { useState } from "react";
import Link from "next/link";
import type { Invoice, InvoiceStatus } from "@/features/invoices/types";
import {
  formatMoney,
  getInvoiceTotal,
  STATUSES,
  STATUS_STYLES,
} from "@/features/invoices/lib/dashboard-utils";

interface InvoiceListProps {
  invoices: Invoice[];
  onStatusChange: (id: string, status: InvoiceStatus) => void;
  onDelete: (invoice: Invoice) => void;
}

export function InvoiceList({
  invoices,
  onStatusChange,
  onDelete,
}: InvoiceListProps) {
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState<
    "all" | InvoiceStatus
  >("all");

  const query = search.trim().toLowerCase();

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.invoiceNumber.toLowerCase().includes(query) ||
      invoice.clientName.toLowerCase().includes(query);

    const matchesStatus =
      activeStatus === "all" || invoice.status === activeStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-semibold">All invoices</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredInvoices.length}{" "}
              {filteredInvoices.length === 1 ? "invoice" : "invoices"} found
            </p>
          </div>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search invoices..."
            aria-label="Search invoices"
            className="min-h-11 w-full rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-gray-500 sm:max-w-xs"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setActiveStatus(status)}
              className={`rounded-lg px-3 py-2 text-sm capitalize transition ${
                activeStatus === status
                  ? "bg-gray-950 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {status === "all" ? "All statuses" : status}
            </button>
          ))}
        </div>
      </div>

      {filteredInvoices.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-gray-100 text-xl">
            {invoices.length === 0 ? "＋" : "⌕"}
          </div>

          <h3 className="mt-4 font-semibold">
            {invoices.length === 0
              ? "No invoices yet"
              : "No matching invoices"}
          </h3>

          <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
            {invoices.length === 0
              ? "Create your first invoice to get started."
              : "Try changing your search or status filter."}
          </p>

          {invoices.length === 0 && (
            <Link
              href="/invoices/new"
              className="mt-5 inline-flex rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white"
            >
              Create your first invoice
            </Link>
          )}
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {filteredInvoices.map((invoice) => (
            <article
              key={invoice.id}
              className="flex flex-col justify-between gap-4 p-5 transition hover:bg-gray-50/70 sm:flex-row sm:items-center sm:px-6"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="font-semibold">{invoice.invoiceNumber}</h3>

                  <select
                    value={invoice.status}
                    onChange={(event) =>
                      onStatusChange(
                        invoice.id,
                        event.target.value as InvoiceStatus,
                      )
                    }
                    aria-label={`Status for ${invoice.invoiceNumber}`}
                    className={`rounded-full border-0 px-3 py-1.5 text-xs font-medium capitalize outline-none ${STATUS_STYLES[invoice.status]}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                <p className="mt-1 text-sm text-gray-600">
                  {invoice.clientName}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Issued {invoice.issueDate || "—"} · Due{" "}
                  {invoice.dueDate || "—"}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                <p className="font-semibold tabular-nums">
                  {formatMoney(getInvoiceTotal(invoice), invoice.currency)}
                </p>

                <Link
                  href={`/invoices/${invoice.id}`}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-white"
                >
                  View
                </Link>

                <Link
                  href={`/invoices/${invoice.id}/edit`}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-white"
                >
                  Edit
                </Link>

                <button
                  type="button"
                  onClick={() => onDelete(invoice)}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
