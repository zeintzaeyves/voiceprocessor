import type { Metadata } from "next";
import { InvoiceForm } from "@/features/invoices/components/invoice-form";

export const metadata: Metadata = { title: "New document" };

export default function NewInvoicePage() {
  return <InvoiceForm />;
}
