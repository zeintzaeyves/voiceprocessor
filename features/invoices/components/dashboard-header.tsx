
import Link from "next/link";

export function DashboardHeader() {
  return (
    <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Currency Invoice Processor
        </p>

        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Invoices
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Manage your invoices and keep track of payments.
        </p>
      </div>

      <Link
        href="/invoices/new"
        className="inline-flex min-h-12 items-center justify-center rounded-lg bg-gray-950 px-5 text-sm font-medium text-white transition hover:bg-gray-800"
      >
        + Create invoice
      </Link>
    </header>
  );
}
