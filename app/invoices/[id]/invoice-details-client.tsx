"use client";

import { useParams } from "next/navigation";
import { InvoiceDetailView } from "@/features/invoices/components/invoice-detail-view";
import { InvoiceQueryBoundary } from "@/features/invoices/components/invoice-route-states";
import { useInvoice } from "@/features/invoices/hooks/use-invoices";

export default function InvoiceDetailsClient() {
  const { id } = useParams<{ id: string }>();
  const query = useInvoice(id);

  return (
    <InvoiceQueryBoundary query={query}>
      {(invoice) => <InvoiceDetailView invoice={invoice} />}
    </InvoiceQueryBoundary>
  );
}
