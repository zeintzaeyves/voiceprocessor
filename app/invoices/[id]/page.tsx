import { Suspense } from "react";
import InvoiceDetailsClient from "./invoice-details-client";

export default function InvoiceDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-sm text-gray-500">Loading invoice...</p>
        </main>
      }
    >
      <InvoiceDetailsClient />
    </Suspense>
  );
}