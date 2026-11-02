import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { describeDueDate } from "../../lib/dates";
import { getInvoiceTotals } from "../../lib/calculations";
import { formatMoney } from "../../lib/money";
import type { DashboardSummary } from "../../lib/summary";

type Insight = { key: string; title: string; body: React.ReactNode };

/**
 * Only observations that follow directly from the data. An insight with
 * nothing behind it is omitted rather than filled with a placeholder.
 */
function deriveInsights(summary: DashboardSummary, today: string): Insight[] {
  const insights: Insight[] = [];

  const overdue = summary.currencies.filter((c) => c.overdueInvoices > 0);
  if (overdue.length > 0) {
    const count = summary.statusCounts.overdue;
    insights.push({
      key: "overdue",
      title: `${count} overdue document${count === 1 ? "" : "s"}`,
      body: (
        <>
          {overdue.map((c) => formatMoney(c.overdueMinor, c.currency)).join(" · ")}{" "}
          past due.{" "}
          <Link href="/invoices?status=overdue" className="font-medium text-accent hover:underline">
            Review
          </Link>
        </>
      ),
    });
  }

  if (summary.nextDue) {
    const { nextDue } = summary;
    const total = getInvoiceTotals(nextDue).totalMinor;
    insights.push({
      key: "next-due",
      title: "Next payment due",
      body: (
        <>
          <Link href={`/invoices/${nextDue.id}`} className="font-medium text-accent hover:underline">
            {nextDue.invoiceNumber}
          </Link>{" "}
          from {nextDue.clientName}, {formatMoney(total, nextDue.currency)},{" "}
          {describeDueDate(nextDue.dueDate, today)}.
        </>
      ),
    });
  }

  for (const c of summary.currencies) {
    if (c.invoicedMinor > 0 && c.paidMinor > 0) {
      const percent = Math.round((c.paidMinor / c.invoicedMinor) * 100);
      insights.push({
        key: `collected-${c.currency}`,
        title: `${percent}% collected in ${c.currency}`,
        body: `${formatMoney(c.paidMinor, c.currency)} of ${formatMoney(c.invoicedMinor, c.currency)} invoiced has been paid.`,
      });
    }
  }

  return insights;
}

export function Insights({
  summary,
  today,
}: {
  summary: DashboardSummary;
  today: string;
}) {
  const insights = deriveInsights(summary, today);

  return (
    <Card>
      <CardHeader title="Insights" description="Drawn from your documents" />
      {insights.length === 0 ? (
        <p className="p-5 text-sm text-ink-muted">
          Nothing needs attention right now.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {insights.map((insight) => (
            <li key={insight.key} className="px-5 py-3.5">
              <p className="text-sm font-medium">{insight.title}</p>
              <p className="mt-0.5 text-sm text-ink-muted">{insight.body}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
