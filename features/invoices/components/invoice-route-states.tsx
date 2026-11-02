import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { QueryState } from "../hooks/use-repository-query";
import type { Invoice } from "../types";

export function InvoicePageSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading document"
      className="mx-auto max-w-3xl space-y-6"
    >
      <Skeleton className="h-10 w-full" />
      <Card className="space-y-5 p-8">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="ml-auto h-16 w-1/3" />
      </Card>
    </div>
  );
}

/**
 * Renders the loading, error and not-found states of a single-invoice query
 * and calls `children` only when the invoice exists.
 */
export function InvoiceQueryBoundary({
  query,
  children,
}: {
  query: QueryState<Invoice | null>;
  children: (invoice: Invoice) => React.ReactNode;
}) {
  if (query.status === "loading") return <InvoicePageSkeleton />;

  if (query.status === "error") {
    return (
      <Card className="mx-auto max-w-xl">
        <div role="alert">
          <EmptyState
            title="Could not load this document"
            description={query.error.message}
            action={<LinkButton href="/invoices">Back to documents</LinkButton>}
          />
        </div>
      </Card>
    );
  }

  if (!query.data) {
    return (
      <Card className="mx-auto max-w-xl">
        <EmptyState
          title="Document not found"
          description="It may have been deleted, or it was saved in a different browser."
          action={<LinkButton href="/invoices">Back to documents</LinkButton>}
        />
      </Card>
    );
  }

  return <>{children(query.data)}</>;
}
