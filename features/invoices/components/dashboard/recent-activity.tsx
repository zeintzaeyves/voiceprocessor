import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate } from "../../lib/dates";
import { getInvoiceTotals } from "../../lib/calculations";
import { formatMoney } from "../../lib/money";
import { lastActivity } from "../../lib/summary";
import type { Invoice } from "../../types";

export function RecentActivity({ invoices }: { invoices: Invoice[] }) {
  return (
    <Card role="region" aria-label="Recent activity">
      <CardHeader
        title="Recent activity"
        description="Most recently created or changed"
        action={
          <Link href="/invoices" className="text-xs font-medium text-accent hover:underline">
            View all
          </Link>
        }
      />
      <ul className="divide-y divide-line">
        {invoices.map((invoice) => (
          <li key={invoice.id}>
            <Link
              href={`/invoices/${invoice.id}`}
              className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-canvas"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{invoice.invoiceNumber}</p>
                <p className="truncate text-xs text-ink-muted">
                  {invoice.clientName} · {formatDate(lastActivity(invoice))}
                </p>
              </div>
              <div className="hidden sm:block">
                <StatusBadge status={invoice.status} />
              </div>
              <p className="text-right text-sm font-medium tabular-nums">
                {formatMoney(getInvoiceTotals(invoice).totalMinor, invoice.currency)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
