import { InvoiceDocument, type DocumentData } from "@/features/invoices/components/invoice-document";
import { getInvoiceTotals } from "@/features/invoices/lib/calculations";

/** Illustrative only. Nothing here is real customer data, and the page says so. */
const SAMPLE: DocumentData = {
  documentType: "invoice",
  invoiceNumber: "INV-11022026-001",
  companyName: "Northwind Studio",
  companyAddress: "12 Harbour Street\nLisbon, Portugal",
  companyEmail: "billing@northwind.example",
  clientName: "Fabrikam Ltd",
  clientEmail: "accounts@fabrikam.example",
  issueDate: "2026-11-02",
  dueDate: "2026-11-16",
  currency: "EUR",
  taxRatePercent: 23,
  discount: { type: "percent", percent: 10 },
  status: "sent",
  notes: "Payment by bank transfer within 14 days.",
  lineItems: [
    { id: "a", description: "Brand identity design", quantity: 1, unitPriceMinor: 240000 },
    { id: "b", description: "Website copywriting (pages)", quantity: 6, unitPriceMinor: 18000 },
    { id: "c", description: "Revision rounds", quantity: 2.5, unitPriceMinor: 9500 },
  ],
};

export function SampleInvoice() {
  return (
    <figure aria-label="Sample invoice" className="w-full">
      <InvoiceDocument data={SAMPLE} totals={getInvoiceTotals(SAMPLE)} showStatus />
      <figcaption className="mt-3 text-center text-xs text-ink-faint">
        Sample invoice with made-up details, as it appears in the app.
      </figcaption>
    </figure>
  );
}
