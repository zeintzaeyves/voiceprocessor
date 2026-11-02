"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoices } from "../../hooks/use-invoices";
import { useToday } from "../../hooks/use-today";
import { buildDashboardSummary } from "../../lib/summary";
import { PlusIcon } from "@/components/shell/icons";
import { StorageNotice } from "../storage-notice";
import { Insights } from "./insights";
import { RecentActivity } from "./recent-activity";
import { StatCards, StatCardsSkeleton } from "./stat-cards";
import { StatusDistribution } from "./status-distribution";

export function DashboardView() {
  const query = useInvoices();
  const today = useToday();

  const invoices = query.status === "ready" ? query.data.invoices : null;
  const summary = useMemo(
    () => (invoices ? buildDashboardSummary(invoices, today) : null),
    [invoices, today],
  );

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A live view of what you have invoiced and what is still owed."
        actions={
          <LinkButton href="/invoices/new" variant="primary">
            <PlusIcon />
            New document
          </LinkButton>
        }
      />

      {query.status === "error" && (
        <div
          role="alert"
          className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          <p className="font-medium">Your documents could not be loaded.</p>
          <p className="mt-1">{query.error.message}</p>
        </div>
      )}

      {query.status === "ready" && <StorageNotice health={query.data.health} />}

      {query.status === "loading" && (
        <div className="space-y-6">
          <StatCardsSkeleton />
          <div className="grid gap-6 lg:grid-cols-3">
            <Skeleton className="h-56 lg:col-span-1" />
            <Skeleton className="h-56 lg:col-span-2" />
          </div>
        </div>
      )}

      {summary && summary.totalCount === 0 && (
        <Card>
          <EmptyState
            title="No documents yet"
            description="Create your first invoice or receipt. Totals, status and insights appear here as soon as you have data."
            action={
              <LinkButton href="/invoices/new" variant="primary">
                Create your first document
              </LinkButton>
            }
          />
        </Card>
      )}

      {summary && summary.totalCount > 0 && (
        <div className="space-y-6">
          <StatCards summary={summary} />

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-1">
              <StatusDistribution summary={summary} />
              <Insights summary={summary} today={today} />
            </div>
            <div className="lg:col-span-2">
              <RecentActivity invoices={summary.recent} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
