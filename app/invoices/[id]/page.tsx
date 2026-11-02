import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoicePageSkeleton } from "@/features/invoices/components/invoice-route-states";
import InvoiceDetailsClient from "./invoice-details-client";

export const metadata: Metadata = { title: "Document" };

export default function InvoiceDetailsPage() {
  return (
    <Suspense fallback={<InvoicePageSkeleton />}>
      <InvoiceDetailsClient />
    </Suspense>
  );
}
