import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import {
  calculatePreviewTotals,
  type InvoiceTotals,
} from "../lib/calculations";
import { formatLongDate } from "../lib/dates";
import { formatMoney } from "../lib/money";
import type { Invoice } from "../types";

export type DocumentData = Pick<
  Invoice,
  | "documentType"
  | "companyName"
  | "companyEmail"
  | "companyAddress"
  | "clientName"
  | "clientEmail"
  | "clientAddress"
  | "issueDate"
  | "dueDate"
  | "currency"
  | "taxRatePercent"
  | "discount"
  | "lineItems"
  | "notes"
  | "status"
> & { invoiceNumber: string };

type Props = {
  data: DocumentData;
  totals: InvoiceTotals;
  /** Drafts show soft placeholders for fields that are still empty. */
  draft?: boolean;
  /** Saved documents show their status; a draft preview does not. */
  showStatus?: boolean;
};

function Placeholder({ children }: { children: string }) {
  return <span className="italic text-ink-faint">{children}</span>;
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-faint">
      {children}
    </p>
  );
}

/**
 * The invoice as a printed page. It is sized by its container, not the
 * viewport, so the same component reads well beside the form, full width on
 * its own page, and on paper.
 */
export function InvoiceDocument({
  data,
  totals,
  draft = false,
  showStatus = false,
}: Props) {
  const isReceipt = data.documentType === "receipt";
  const title = isReceipt ? "Receipt" : "Invoice";

  return (
    <article
      aria-label={`${title} ${data.invoiceNumber}`}
      className="@container rounded-lg border border-line bg-surface p-5 text-ink shadow-card @md:p-8 @2xl:p-12 print:rounded-none print:border-0 print:p-0 print:shadow-none"
    >
      <header className="flex flex-col gap-5 @md:flex-row @md:items-start @md:justify-between">
        <div className="min-w-0">
          <p className="break-words text-lg font-semibold tracking-tight">
            {data.companyName || (draft ? <Placeholder>Your company</Placeholder> : "—")}
          </p>
          {data.companyAddress && (
            <p className="mt-1 whitespace-pre-line text-sm text-ink-muted">
              {data.companyAddress}
            </p>
          )}
          {data.companyEmail && (
            <p className="mt-1 break-all text-sm text-ink-muted">{data.companyEmail}</p>
          )}
        </div>

        <div className="@md:text-right">
          <p className="text-2xl font-semibold tracking-tight">{title}</p>
          <p className="mt-1 break-all font-mono text-sm text-ink-muted">
            {data.invoiceNumber || (draft ? <Placeholder>Number assigned on save</Placeholder> : "—")}
          </p>
          {showStatus && (
            <div className="mt-2 @md:flex @md:justify-end">
              <StatusBadge status={data.status} />
            </div>
          )}
        </div>
      </header>

      <section className="mt-8 grid gap-6 @md:grid-cols-2">
        <div className="min-w-0">
          <Label>Billed to</Label>
          <p className="mt-1.5 break-words text-sm font-medium">
            {data.clientName || (draft ? <Placeholder>Client name</Placeholder> : "—")}
          </p>
          {data.clientAddress && (
            <p className="mt-0.5 whitespace-pre-line text-sm text-ink-muted">
              {data.clientAddress}
            </p>
          )}
          {data.clientEmail && (
            <p className="mt-0.5 break-all text-sm text-ink-muted">{data.clientEmail}</p>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
          <div>
            <dt><Label>{isReceipt ? "Payment date" : "Issued"}</Label></dt>
            <dd className="mt-1.5 text-sm">{formatLongDate(data.issueDate)}</dd>
          </div>
          {!isReceipt && (
            <div>
              <dt><Label>Due</Label></dt>
              <dd className="mt-1.5 text-sm">{formatLongDate(data.dueDate)}</dd>
            </div>
          )}
          <div>
            <dt><Label>Currency</Label></dt>
            <dd className="mt-1.5 text-sm">{data.currency}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Items</caption>
          <thead>
            <tr className="border-b border-line-strong text-[11px] uppercase tracking-[0.08em] text-ink-faint">
              <th scope="col" className="pb-2 pr-3 font-medium">Description</th>
              <th scope="col" className="px-3 pb-2 text-right font-medium">Qty</th>
              <th scope="col" className="hidden px-3 pb-2 text-right font-medium @md:table-cell">Unit price</th>
              <th scope="col" className="pb-2 pl-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data.lineItems.map((item) => {
              const amount = calculatePreviewTotals([item], 0).subtotalMinor;
              const priceKnown = Number.isSafeInteger(item.unitPriceMinor);
              return (
                <tr key={item.id}>
                  <td className="break-words py-3 pr-3 align-top">
                    {item.description || (draft ? <Placeholder>Item description</Placeholder> : "—")}
                    {priceKnown && (
                      <span className="mt-0.5 block text-xs text-ink-faint @md:hidden">
                        {formatMoney(item.unitPriceMinor, data.currency)} each
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right align-top tabular-nums">
                    {Number.isFinite(item.quantity) ? item.quantity : "—"}
                  </td>
                  <td className="hidden px-3 py-3 text-right align-top tabular-nums @md:table-cell">
                    {priceKnown ? formatMoney(item.unitPriceMinor, data.currency) : "—"}
                  </td>
                  <td className="py-3 pl-3 text-right align-top font-medium tabular-nums">
                    {formatMoney(amount, data.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-6 flex justify-end border-t border-line-strong pt-5">
        <dl className="w-full space-y-2 text-sm @md:max-w-xs">
          <div className="flex justify-between gap-6">
            <dt className="text-ink-muted">Subtotal</dt>
            <dd className="tabular-nums">{formatMoney(totals.subtotalMinor, data.currency)}</dd>
          </div>

          {totals.discountMinor > 0 && (
            <div className="flex justify-between gap-6">
              <dt className="text-ink-muted">
                Discount
                {data.discount.type === "percent" && ` (${data.discount.percent}%)`}
              </dt>
              <dd className="tabular-nums">−{formatMoney(totals.discountMinor, data.currency)}</dd>
            </div>
          )}

          {(data.taxRatePercent > 0 || totals.taxMinor > 0) && (
            <div className="flex justify-between gap-6">
              <dt className="text-ink-muted">Tax ({data.taxRatePercent}%)</dt>
              <dd className="tabular-nums">{formatMoney(totals.taxMinor, data.currency)}</dd>
            </div>
          )}

          <div
            className={cn(
              "flex items-baseline justify-between gap-6 border-t border-line-strong pt-3",
            )}
          >
            <dt className="font-semibold">{isReceipt ? "Amount paid" : "Total due"}</dt>
            <dd className="text-xl font-semibold tracking-tight tabular-nums">
              {formatMoney(totals.totalMinor, data.currency)}
            </dd>
          </div>
        </dl>
      </section>

      {data.notes && (
        <section className="mt-8">
          <Label>Notes</Label>
          <p className="mt-1.5 whitespace-pre-line text-sm text-ink-muted">{data.notes}</p>
        </section>
      )}

      <footer className="mt-10 border-t border-line pt-4 text-xs text-ink-faint">
        {isReceipt
          ? "This receipt confirms payment for the items listed above."
          : data.invoiceNumber
            ? `Please quote ${data.invoiceNumber} when making payment.`
            : "Please quote the invoice number when making payment."}
      </footer>
    </article>
  );
}
