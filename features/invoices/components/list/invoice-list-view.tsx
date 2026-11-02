"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { PlusIcon } from "@/components/shell/icons";
import { Button, LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input, Select } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_LABELS } from "@/components/ui/status-badge";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useInvoices } from "../../hooks/use-invoices";
import { useToday } from "../../hooks/use-today";
import { getInvoiceTotals } from "../../lib/calculations";
import { formatDate } from "../../lib/dates";
import {
  DEFAULT_FILTERS,
  SORT_OPTIONS,
  filterAndSortInvoices,
  hasActiveFilters,
  type ListFilters,
  type SortKey,
} from "../../lib/list";
import { formatMoney } from "../../lib/money";
import { withEffectiveStatus } from "../../lib/status";
import { getInvoiceRepository } from "../../repository";
import { invoiceStatusSchema } from "../../schema";
import type { Invoice, InvoiceStatus } from "../../types";
import { StorageNotice } from "../storage-notice";
import { StatusSelect } from "./status-select";

const STATUS_TABS: Array<ListFilters["status"]> = [
  "all",
  "draft",
  "sent",
  "paid",
  "overdue",
];

function readInitialFilters(params: URLSearchParams): ListFilters {
  const status = invoiceStatusSchema.safeParse(params.get("status"));
  return { ...DEFAULT_FILTERS, status: status.success ? status.data : "all" };
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function InvoiceListView() {
  const params = useSearchParams();
  const query = useInvoices();
  const today = useToday();
  const { toast } = useToast();

  const [filters, setFilters] = useState<ListFilters>(() =>
    readInitialFilters(params),
  );
  const [pendingDelete, setPendingDelete] = useState<Invoice | null>(null);

  const all = useMemo(
    () =>
      query.status === "ready"
        ? withEffectiveStatus(query.data.invoices, today)
        : [],
    [query, today],
  );

  const visible = useMemo(
    () => filterAndSortInvoices(all, filters),
    [all, filters],
  );

  const currencies = useMemo(
    () => [...new Set(all.map((invoice) => invoice.currency))].sort(),
    [all],
  );

  const counts = useMemo(() => {
    const result: Record<ListFilters["status"], number> = {
      all: all.length,
      draft: 0,
      sent: 0,
      paid: 0,
      overdue: 0,
    };
    for (const invoice of all) result[invoice.status] += 1;
    return result;
  }, [all]);

  function update(patch: Partial<ListFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function changeStatus(invoice: Invoice, status: InvoiceStatus) {
    try {
      await getInvoiceRepository().updateStatus(invoice.id, status);
      toast({
        title: `${invoice.invoiceNumber} marked ${STATUS_LABELS[status].toLowerCase()}`,
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "Status not changed",
        description: errorText(error),
      });
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;

    try {
      await getInvoiceRepository().remove(target.id);
      toast({ title: `${target.invoiceNumber} deleted` });
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not delete",
        description: errorText(error),
      });
    } finally {
      setPendingDelete(null);
    }
  }

  const loading = query.status === "loading";
  const filtering = hasActiveFilters(filters);

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Search, filter and manage every invoice and receipt."
        actions={
          <LinkButton href="/invoices/new" variant="primary">
            <PlusIcon />
            New document
          </LinkButton>
        }
      />

      {query.status === "ready" && <StorageNotice health={query.data.health} />}

      {query.status === "error" && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <p className="font-medium">Your documents could not be loaded.</p>
          <p className="mt-1">{query.error.message}</p>
        </div>
      )}

      {query.status !== "error" && (
        <Card>
          {/* Toolbar */}
          <div className="space-y-3 border-b border-line p-4">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="lg:flex-1">
                <Input
                  type="search"
                  aria-label="Search documents"
                  placeholder="Search by number, client or company"
                  value={filters.query}
                  onChange={(event) => update({ query: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 lg:flex">
                <Select
                  aria-label="Filter by currency"
                  value={filters.currency}
                  onChange={(event) => update({ currency: event.target.value })}
                  className="lg:w-40"
                >
                  <option value="all">All currencies</option>
                  {currencies.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Sort documents"
                  value={filters.sort}
                  onChange={(event) =>
                    update({ sort: event.target.value as SortKey })
                  }
                  className="lg:w-52"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div
              role="group"
              aria-label="Filter by status"
              className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
            >
              {STATUS_TABS.map((status) => {
                const active = filters.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update({ status })}
                    className={cn(
                      "min-h-9 shrink-0 rounded-full px-3.5 text-sm font-medium transition duration-150",
                      active
                        ? "bg-ink text-white"
                        : "text-ink-muted hover:bg-sunken hover:text-ink",
                    )}
                  >
                    {status === "all" ? "All" : STATUS_LABELS[status]}
                    <span
                      className={cn(
                        "ml-1.5 text-xs tabular-nums",
                        active ? "text-white/70" : "text-ink-faint",
                      )}
                    >
                      {counts[status]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results announced politely when filters change */}
          <p className="sr-only" role="status">
            {loading ? "Loading documents" : `${visible.length} documents shown`}
          </p>

          {loading && (
            <div aria-busy="true" aria-label="Loading documents" className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          )}

          {!loading && all.length === 0 && (
            <EmptyState
              title="No documents yet"
              description="Invoices and receipts you create will be listed here."
              action={
                <LinkButton href="/invoices/new" variant="primary">
                  Create a document
                </LinkButton>
              }
            />
          )}

          {!loading && all.length > 0 && visible.length === 0 && (
            <EmptyState
              title="No matching documents"
              description="Nothing matches the current search and filters."
              action={
                filtering ? (
                  <Button onClick={() => setFilters(DEFAULT_FILTERS)}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          )}

          {!loading && visible.length > 0 && (
            <>
              {/* Table: tablet and up */}
              <div className="hidden md:block">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Invoices and receipts</caption>
                  <thead className="border-b border-line text-xs text-ink-muted">
                    <tr>
                      <th scope="col" className="px-4 py-3 font-medium">Document</th>
                      <th scope="col" className="px-4 py-3 font-medium">Client</th>
                      <th scope="col" className="hidden px-4 py-3 font-medium xl:table-cell">Issued</th>
                      <th scope="col" className="px-4 py-3 font-medium">Due</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                      <th scope="col" className="px-4 py-3 font-medium">Status</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visible.map((invoice) => (
                      <tr key={invoice.id} className="transition-colors hover:bg-canvas">
                        <td className="px-4 py-3">
                          <Link
                            href={`/invoices/${invoice.id}`}
                            className="font-medium hover:text-accent"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <p className="text-xs capitalize text-ink-faint">
                            {invoice.documentType}
                          </p>
                        </td>
                        <td className="max-w-48 truncate px-4 py-3">{invoice.clientName}</td>
                        <td className="hidden px-4 py-3 text-ink-muted xl:table-cell">
                          {formatDate(invoice.issueDate)}
                        </td>
                        <td className="px-4 py-3 text-ink-muted">{formatDate(invoice.dueDate)}</td>
                        <td className="px-4 py-3 text-right font-medium tabular-nums">
                          {formatMoney(getInvoiceTotals(invoice).totalMinor, invoice.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusSelect
                            value={invoice.status}
                            label={`Status of ${invoice.invoiceNumber}`}
                            onChange={(status) => changeStatus(invoice, status)}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <LinkButton href={`/invoices/${invoice.id}`} variant="ghost" size="sm" aria-label={`View ${invoice.invoiceNumber}`}>
                              View
                            </LinkButton>
                            <LinkButton href={`/invoices/${invoice.id}/edit`} variant="ghost" size="sm" aria-label={`Edit ${invoice.invoiceNumber}`}>
                              Edit
                            </LinkButton>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hover:text-danger"
                              aria-label={`Delete ${invoice.invoiceNumber}`}
                              onClick={() => setPendingDelete(invoice)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Cards: phones */}
              <ul className="divide-y divide-line md:hidden">
                {visible.map((invoice) => (
                  <li key={invoice.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:text-accent"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="truncate text-sm text-ink-muted">{invoice.clientName}</p>
                      </div>
                      <p className="shrink-0 text-right font-semibold tabular-nums">
                        {formatMoney(getInvoiceTotals(invoice).totalMinor, invoice.currency)}
                      </p>
                    </div>
                    <p className="text-xs text-ink-faint">
                      Issued {formatDate(invoice.issueDate)} · Due {formatDate(invoice.dueDate)}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <StatusSelect
                        value={invoice.status}
                        label={`Status of ${invoice.invoiceNumber}`}
                        onChange={(status) => changeStatus(invoice, status)}
                      />
                      <div className="flex gap-1">
                        <LinkButton href={`/invoices/${invoice.id}/edit`} variant="secondary" size="sm" aria-label={`Edit ${invoice.invoiceNumber}`}>
                          Edit
                        </LinkButton>
                        <Button
                          size="sm"
                          aria-label={`Delete ${invoice.invoiceNumber}`}
                          onClick={() => setPendingDelete(invoice)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="border-t border-line px-4 py-3 text-xs text-ink-faint">
                Showing {visible.length} of {all.length}. Amounts sort within each currency, never across currencies.
              </p>
            </>
          )}
        </Card>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title={`Delete ${pendingDelete?.invoiceNumber ?? "document"}?`}
        description={
          <>
            This permanently removes the {pendingDelete?.documentType ?? "document"} for{" "}
            <strong className="font-medium text-ink">{pendingDelete?.clientName}</strong>.
            This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
