
import { calculateInvoiceAnalytics } from "@/features/invoices/lib/analytics";
import { formatMoney } from "@/features/invoices/lib/dashboard-utils";

type InvoiceAnalytics = ReturnType<typeof calculateInvoiceAnalytics>;

function Metric({
  label,
  value,
  detail,
  valueClass = "text-gray-950",
}: {
  label: string;
  value: string;
  detail: string;
  valueClass?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 break-words text-lg font-semibold ${valueClass}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-400">{detail}</p>
    </div>
  );
}

export function FinancialOverview({
  analytics,
  loading,
}: {
  analytics: InvoiceAnalytics;
  loading: boolean;
}) {
  return (
    <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Financial overview</h2>
      <p className="mt-1 text-sm text-gray-500">
        Paid, outstanding, and overdue balances by currency.
      </p>

      {loading ? (
        <div className="mt-6 rounded-xl bg-gray-50 px-4 py-8 text-center">
          <p className="text-sm text-gray-500">
            Loading financial overview...
          </p>
        </div>
      ) : analytics.length === 0 ? (
        <div className="mt-6 rounded-xl bg-gray-50 px-4 py-8 text-center">
          <p className="text-sm font-medium text-gray-700">
            No financial data yet
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Create an invoice to see your financial overview.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {analytics.map((item) => {
            const totalValue = item.paidMinor + item.outstandingMinor;
            const collectionRate =
              totalValue > 0
                ? Math.round((item.paidMinor / totalValue) * 100)
                : 0;

            return (
              <div
                key={item.currency}
                className="rounded-xl border border-gray-200 p-4 sm:p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{item.currency}</h3>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-600">
                    {item.totalInvoices}{" "}
                    {item.totalInvoices === 1 ? "invoice" : "invoices"}
                  </span>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Metric
                    label="Paid"
                    value={formatMoney(item.paidMinor, item.currency)}
                    detail={`${item.paidInvoices} paid`}
                    valueClass="text-emerald-700"
                  />

                  <Metric
                    label="Outstanding"
                    value={formatMoney(item.outstandingMinor, item.currency)}
                    detail="Not yet paid"
                  />

                  <Metric
                    label="Overdue"
                    value={formatMoney(item.overdueMinor, item.currency)}
                    detail={`${item.overdueInvoices} overdue`}
                    valueClass={
                      item.overdueMinor > 0
                        ? "text-red-600"
                        : "text-gray-950"
                    }
                  />

                  <Metric
                    label="Collection rate"
                    value={`${collectionRate}%`}
                    detail="Paid value vs. total value"
                  />
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${collectionRate}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
