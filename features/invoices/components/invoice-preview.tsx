
"use client";

import Link from "next/link";
import type { Invoice } from "../types";
import { calculateInvoiceTotals } from "../lib/calculations";

type InvoicePreviewProps = {
  invoice: Invoice;
};

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function formatDate(date: string) {
  if (!date) return "—";

  const parsed = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(parsed);
}

export function InvoicePreview({ invoice }: InvoicePreviewProps) {
  const totals = calculateInvoiceTotals(
    invoice.lineItems,
    invoice.taxRatePercent,
  );

  const isReceipt = invoice.documentType === "receipt";
  const documentLabel = isReceipt ? "Receipt" : "Invoice";
  const companyName =
    invoice.companyName?.trim() || "Your Company";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-950 sm:px-8 print:min-h-0 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link
            href="/"
            className="text-sm text-gray-500 transition hover:text-gray-950"
          >
            ← Back to documents
          </Link>

          <div className="flex gap-3">
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium transition hover:bg-gray-100"
            >
              Edit {documentLabel.toLowerCase()}
            </Link>

            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
            >
              Print / Save PDF
            </button>
          </div>
        </div>

        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-12 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          <header className="flex flex-col justify-between gap-8 border-b border-gray-200 pb-8 sm:flex-row">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">
                {documentLabel}
              </p>

              <h1 className="mt-3 break-words text-4xl font-semibold tracking-tight">
                {invoice.invoiceNumber}
              </h1>

              <p className="mt-3 max-w-sm text-sm leading-6 text-gray-500">
                {isReceipt
                  ? "Thank you for your payment. Please keep this receipt for your records."
                  : "Thank you for your business. Please review the details below."}
              </p>
            </div>

            <div className="sm:max-w-xs sm:text-right">
              <p className="break-words text-xl font-semibold">
                {companyName}
              </p>

              <p className="mt-1 text-sm text-gray-500">
                {isReceipt ? "Payment receipt" : "Invoice document"}
              </p>

              <div className="mt-5">
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-medium capitalize text-gray-700">
                  {isReceipt ? "Paid" : invoice.status}
                </span>
              </div>
            </div>
          </header>

          <section className="grid gap-8 border-b border-gray-200 py-8 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                {isReceipt ? "Received from" : "Bill to"}
              </p>

              <p className="mt-3 break-words text-lg font-semibold">
                {invoice.clientName}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:text-right">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {isReceipt ? "Payment date" : "Issue date"}
                </p>

                <p className="mt-2 text-sm font-medium">
                  {formatDate(invoice.issueDate)}
                </p>
              </div>

              {!isReceipt && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Due date
                  </p>

                  <p className="mt-2 text-sm font-medium">
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
              )}
            </div>
          </section>

          <section className="py-8">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="py-4 pr-4 font-medium">
                      Description
                    </th>

                    <th className="px-3 py-4 text-right font-medium">
                      Qty
                    </th>

                    <th className="px-3 py-4 text-right font-medium">
                      Unit price
                    </th>

                    <th className="py-4 pl-3 text-right font-medium">
                      Amount
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {invoice.lineItems.map((item) => {
                    const lineTotal = Math.round(
                      item.quantity * item.unitPriceMinor,
                    );

                    return (
                      <tr key={item.id}>
                        <td className="break-words py-5 pr-4 font-medium">
                          {item.description}
                        </td>

                        <td className="px-3 py-5 text-right tabular-nums">
                          {item.quantity}
                        </td>

                        <td className="px-3 py-5 text-right tabular-nums">
                          {formatMoney(
                            item.unitPriceMinor,
                            invoice.currency,
                          )}
                        </td>

                        <td className="py-5 pl-3 text-right font-medium tabular-nums">
                          {formatMoney(lineTotal, invoice.currency)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex justify-end border-t border-gray-200 pt-6">
            <div className="w-full space-y-4 sm:max-w-xs">
              <div className="flex justify-between gap-6 text-sm text-gray-500">
                <span>Subtotal</span>

                <span className="text-gray-950">
                  {formatMoney(totals.subtotalMinor, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-6 text-sm text-gray-500">
                <span>Tax ({invoice.taxRatePercent}%)</span>

                <span className="text-gray-950">
                  {formatMoney(totals.taxMinor, invoice.currency)}
                </span>
              </div>

              <div className="flex justify-between gap-6 border-t border-gray-200 pt-4 text-base font-semibold">
                <span>{isReceipt ? "Amount paid" : "Total due"}</span>

                <span>
                  {formatMoney(totals.totalMinor, invoice.currency)}
                </span>
              </div>
            </div>
          </section>

          <footer className="mt-12 border-t border-gray-200 pt-5 text-xs leading-5 text-gray-400">
            {isReceipt
              ? "This receipt confirms payment for the items listed above."
              : `Please refer to invoice number ${invoice.invoiceNumber} when making payment.`}
          </footer>
        </article>
      </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 18mm;
          }

          html,
          body {
            background: #ffffff !important;
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }

          body * {
            visibility: hidden;
          }

          article,
          article * {
            visibility: visible;
          }

          article {
            position: absolute;
            inset: 0;
            width: 100%;
          }

          table {
            break-inside: auto;
          }

          tr {
            break-inside: avoid;
          }
        }
      `}</style>
    </main>
  );
}
