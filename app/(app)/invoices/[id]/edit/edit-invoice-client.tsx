"use client";

import { useParams } from "next/navigation";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import { InvoiceQueryBoundary } from "@/features/invoices/components/invoice-route-states";
import { useInvoice } from "@/features/invoices/hooks/use-invoices";

export default function EditInvoiceClient() {
  const { id } = useParams<{ id: string }>();
  const query = useInvoice(id);

  return (
    <InvoiceQueryBoundary query={query}>
      {(invoice) => (
        // Keyed by id so a different invoice never inherits another's edits.
        <InvoiceForm key={invoice.id} initialInvoice={invoice} />
      )}
    </InvoiceQueryBoundary>
  );
}
