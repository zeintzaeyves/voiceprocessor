"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import type { Invoice } from "@/features/invoices/types";
import { getInvoices } from "@/features/invoices/storage";
import { InvoicePreview } from "@/features/invoices/components/invoice-preview";

const STORAGE_EVENT = "invoices-updated";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function getSnapshot() {
  return JSON.stringify(getInvoices());
}

function getServerSnapshot() {
  return "[]";
}

export default function InvoiceDetailsClient() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  let invoices: Invoice[];

  try {
    invoices = JSON.parse(snapshot) as Invoice[];
  } catch {
    invoices = [];
  }

  const invoice = invoices.find((item) => item.id === id);

  if (!invoice) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 text-gray-950">
        <div className="max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <h1 className="text-xl font-semibold">Invoice not found</h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            This invoice may have been deleted or saved in another browser.
          </p>

          <Link
            href="/"
            className="mt-6 inline-flex rounded-lg bg-gray-950 px-4 py-2.5 text-sm font-medium text-white"
          >
            Back to invoices
          </Link>
        </div>
      </main>
    );
  }

  return <InvoicePreview invoice={invoice} />;
}