import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoicePageSkeleton } from "@/features/invoices/components/invoice-route-states";
import EditInvoiceClient from "./edit-invoice-client";

export const metadata: Metadata = { title: "Edit document" };

export default function EditInvoicePage() {
  return (
    <Suspense fallback={<InvoicePageSkeleton />}>
      <EditInvoiceClient />
    </Suspense>
  );
}
