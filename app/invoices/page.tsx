import type { Metadata } from "next";
import { Suspense } from "react";
import { InvoiceListView } from "@/features/invoices/components/list/invoice-list-view";

export const metadata: Metadata = { title: "Invoices" };

export default function InvoicesPage() {
  // The view reads ?status=… to preselect a filter, which needs Suspense.
  return (
    <Suspense>
      <InvoiceListView />
    </Suspense>
  );
}
