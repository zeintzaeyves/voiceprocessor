"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { useToday } from "../hooks/use-today";
import { getInvoiceTotals } from "../lib/calculations";
import { getEffectiveInvoiceStatus } from "../lib/status";
import { getInvoiceRepository } from "../repository";
import type { Invoice } from "../types";
import { InvoiceDocument } from "./invoice-document";

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export function InvoiceDetailView({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const { toast } = useToast();
  const today = useToday();

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);

  const status = today ? getEffectiveInvoiceStatus(invoice, today) : invoice.status;
  const isReceipt = invoice.documentType === "receipt";

  async function markPaid() {
    setMarkingPaid(true);
    try {
      await getInvoiceRepository().updateStatus(invoice.id, "paid");
      toast({ title: `${invoice.invoiceNumber} marked paid` });
    } catch (error) {
      toast({ tone: "error", title: "Status not changed", description: errorText(error) });
    } finally {
      setMarkingPaid(false);
    }
  }

  async function remove() {
    try {
      await getInvoiceRepository().remove(invoice.id);
      toast({ title: `${invoice.invoiceNumber} deleted` });
      router.push("/invoices");
    } catch (error) {
      toast({ tone: "error", title: "Could not delete", description: errorText(error) });
      setConfirmingDelete(false);
    }
  }

  return (
    <>
      <div
        data-print-hide
        className="mx-auto mb-6 flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <Link
          href="/invoices"
          className="text-sm text-ink-muted transition hover:text-ink"
        >
          ← All documents
        </Link>

        <div className="flex flex-wrap gap-2">
          {status !== "paid" && !isReceipt && (
            <Button onClick={markPaid} loading={markingPaid}>
              Mark as paid
            </Button>
          )}
          <LinkButton href={`/invoices/${invoice.id}/edit`}>Edit</LinkButton>
          <Button onClick={() => window.print()}>Print / Save as PDF</Button>
          <Button
            variant="ghost"
            className="hover:text-danger"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-3xl" data-print-reset>
        <InvoiceDocument
          data={{ ...invoice, status }}
          totals={getInvoiceTotals(invoice)}
          showStatus
        />
      </div>

      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${invoice.invoiceNumber}?`}
        description={`This permanently removes this ${invoice.documentType} for ${invoice.clientName}. This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  );
}
