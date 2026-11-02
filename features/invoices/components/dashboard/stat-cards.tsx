import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { DashboardSummary } from "../../lib/summary";
import { formatMoney } from "../../lib/money";

type Money = Array<{ currency: string; amountMinor: number }>;

/** One line per currency: balances in different currencies are never summed. */
function MoneyLines({ lines }: { lines: Money }) {
  if (lines.length === 0) {
    return <p className="text-2xl font-semibold tabular-nums">—</p>;
  }
  return (
    <div className="space-y-0.5">
      {lines.map(({ currency, amountMinor }) => (
        <p
          key={currency}
          className="truncate text-2xl font-semibold leading-tight tracking-tight tabular-nums"
        >
          {formatMoney(amountMinor, currency)}
        </p>
      ))}
    </div>
  );
}

function StatCard({
  label,
  detail,
  children,
}: {
  label: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-ink-muted">{label}</p>
      <div className="mt-2.5 min-h-8">{children}</div>
      <p className="mt-2 text-xs text-ink-faint">{detail}</p>
    </Card>
  );
}

export function StatCardsSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading figures"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
    >
      {Array.from({ length: 4 }, (_, i) => (
        <Card key={i} className="p-5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-3 h-7 w-32" />
          <Skeleton className="mt-3 h-3 w-28" />
        </Card>
      ))}
    </div>
  );
}

export function StatCards({ summary }: { summary: DashboardSummary }) {
  const { statusCounts, totalCount, currencies } = summary;
  const unpaid = totalCount - statusCounts.paid;

  const invoiced = currencies.map((c) => ({ currency: c.currency, amountMinor: c.invoicedMinor }));
  const outstanding = currencies
    .filter((c) => c.outstandingMinor > 0)
    .map((c) => ({ currency: c.currency, amountMinor: c.outstandingMinor }));
  const paid = currencies
    .filter((c) => c.paidMinor > 0)
    .map((c) => ({ currency: c.currency, amountMinor: c.paidMinor }));

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Total documents"
        detail={`${statusCounts.draft} draft · ${statusCounts.sent} sent`}
      >
        <p className="text-2xl font-semibold leading-tight tracking-tight tabular-nums">
          {totalCount}
        </p>
      </StatCard>

      <StatCard label="Total invoiced" detail="Paid and outstanding, by currency">
        <MoneyLines lines={invoiced} />
      </StatCard>

      <StatCard
        label="Outstanding"
        detail={
          unpaid === 0
            ? "Nothing is waiting on payment"
            : `${unpaid} unpaid · ${statusCounts.overdue} overdue`
        }
      >
        <MoneyLines lines={outstanding} />
      </StatCard>

      <StatCard
        label="Paid"
        detail={`${statusCounts.paid} paid document${statusCounts.paid === 1 ? "" : "s"}`}
      >
        <MoneyLines lines={paid} />
      </StatCard>
    </div>
  );
}
