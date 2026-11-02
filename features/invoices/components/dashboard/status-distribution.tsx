import { Card, CardHeader } from "@/components/ui/card";
import { STATUS_DOT, STATUS_LABELS } from "@/components/ui/status-badge";
import type { InvoiceStatus } from "../../types";
import type { DashboardSummary } from "../../lib/summary";

const ORDER: InvoiceStatus[] = ["paid", "sent", "draft", "overdue"];

export function StatusDistribution({ summary }: { summary: DashboardSummary }) {
  const { statusCounts, totalCount } = summary;
  const parts = ORDER.filter((status) => statusCounts[status] > 0);

  const description = ORDER.map(
    (status) => `${statusCounts[status]} ${STATUS_LABELS[status].toLowerCase()}`,
  ).join(", ");

  return (
    <Card>
      <CardHeader title="Status" description="Where your documents stand today" />
      <div className="p-5">
        {/* The bar is decorative; the list below is the accessible data. */}
        <div
          role="img"
          aria-label={`Status distribution: ${description}`}
          className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-sunken"
        >
          {parts.map((status) => (
            <div
              key={status}
              className={`${STATUS_DOT[status]} transition-[flex-grow] duration-300`}
              style={{ flexGrow: statusCounts[status], flexBasis: 0 }}
            />
          ))}
        </div>

        <ul className="mt-5 space-y-2.5">
          {ORDER.map((status) => {
            const count = statusCounts[status];
            const percent = totalCount ? Math.round((count / totalCount) * 100) : 0;
            return (
              <li key={status} className="flex items-center gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className={`size-2 rounded-full ${STATUS_DOT[status]}`}
                />
                <span className="flex-1 text-ink-muted">{STATUS_LABELS[status]}</span>
                <span className="font-medium tabular-nums">{count}</span>
                <span className="w-10 text-right text-xs tabular-nums text-ink-faint">
                  {percent}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
