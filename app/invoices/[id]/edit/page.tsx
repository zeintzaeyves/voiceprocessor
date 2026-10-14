"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";
import { getInvoices } from "@/features/invoices/storage";
import type { Invoice } from "@/features/invoices/types";

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    params.then(({ id }) => {
      const found = getInvoices().find((item) => item.id === id);

      if (cancelled) return;

      setInvoiceId(id);
      setInvoice(found ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [params]);

  if (loading) {
    return <main className="p-8 text-gray-500">Loading invoice...</main>;
  }

  if (!invoice || !invoiceId) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-8">
          <h1 className="text-xl font-semibold">Invoice not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            This invoice may have been deleted or does not exist in this browser.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg bg-gray-950 px-4 py-2.5 text-sm text-white"
          >
            Back to invoices
          </Link>
        </div>
      </main>
    );
  }

  return (
    <InvoiceForm
      key={invoice.id}
      invoiceId={invoice.id}
      initialInvoice={invoice}
    />
  );
}