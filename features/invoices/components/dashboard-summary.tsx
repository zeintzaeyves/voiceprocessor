
interface SummaryCardProps {
  label: string;
  value: string;
  description: string;
}

function SummaryCard({
  label,
  value,
  description,
}: SummaryCardProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{label}</p>

      <p className="mt-3 break-words text-2xl font-semibold tracking-tight">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-400">{description}</p>
    </div>
  );
}

interface DashboardSummaryProps {
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalValueLabel: string;
}

export function DashboardSummary({
  totalInvoices,
  paidInvoices,
  overdueInvoices,
  totalValueLabel,
}: DashboardSummaryProps) {
  const cards = [
    {
      label: "Total invoices",
      value: String(totalInvoices),
      description: "All saved invoices",
    },
    {
      label: "Paid invoices",
      value: String(paidInvoices),
      description: "Invoices marked as paid",
    },
    {
      label: "Overdue invoices",
      value: String(overdueInvoices),
      description: "Past their due date and unpaid",
    },
    {
      label: "Invoice values",
      value: totalValueLabel,
      description: "Totals grouped by currency",
    },
  ];

  return (
    <section className="mt-9 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <SummaryCard key={card.label} {...card} />
      ))}
    </section>
  );
}
