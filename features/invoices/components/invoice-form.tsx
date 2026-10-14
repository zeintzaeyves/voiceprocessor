
"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import type { DocumentType, Invoice, InvoiceLineItem } from "../types";
import { calculateInvoiceTotals } from "../lib/calculations";
import { validateInvoice } from "../lib/validation";
import {
  getInvoices,
  getNextDocumentNumber,
  saveInvoice,
} from "../storage";

type InvoiceFormProps = {
  invoiceId?: string;
  initialInvoice?: Invoice;
};

type DraftLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-500 disabled:cursor-not-allowed disabled:bg-gray-100";

function getTodayLocalDate() {
  const today = new Date();

  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatMoney(amountMinor: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amountMinor / 100);
  } catch {
    return `${currency} ${(amountMinor / 100).toFixed(2)}`;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

export function InvoiceForm({
  invoiceId,
  initialInvoice,
}: InvoiceFormProps) {
  const [companyName, setCompanyName] = useState(
    initialInvoice?.companyName ?? "",
  );

  const [documentType, setDocumentType] = useState<DocumentType>(
    initialInvoice?.documentType ?? "invoice",
  );

  const [clientName, setClientName] = useState(
    initialInvoice?.clientName ?? "",
  );

  const [issueDate, setIssueDate] = useState(
    initialInvoice?.issueDate ?? "",
  );

  const [dueDate, setDueDate] = useState(
    initialInvoice?.dueDate ?? "",
  );

  const [currency, setCurrency] = useState(
    initialInvoice?.currency ?? "USD",
  );

  const [taxRate, setTaxRate] = useState(
    initialInvoice?.taxRatePercent ?? 10,
  );

  const [invoiceNumber, setInvoiceNumber] = useState(
    initialInvoice?.invoiceNumber ?? "",
  );

  const [lineItems, setLineItems] = useState<DraftLineItem[]>(
    initialInvoice
      ? initialInvoice.lineItems.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unitPrice: (item.unitPriceMinor / 100).toFixed(2),
        }))
      : [
          {
            id: "item-initial",
            description: "",
            quantity: 1,
            unitPrice: "0.00",
          },
        ],
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedDocumentId, setSavedDocumentId] = useState<string | null>(
    initialInvoice?.id ?? null,
  );

  const submittingRef = useRef(false);

  const invoiceLineItems: InvoiceLineItem[] = lineItems.map((item) => ({
    id: item.id,
    description: item.description.trim(),
    quantity: Number(item.quantity),
    unitPriceMinor: Math.round(Number(item.unitPrice) * 100),
  }));

  const totals = calculateInvoiceTotals(invoiceLineItems, taxRate);

  const isReceipt = documentType === "receipt";
  const documentLabel = isReceipt ? "receipt" : "invoice";

  function updateLineItem(
    id: string,
    field: keyof Omit<DraftLineItem, "id">,
    value: string | number,
  ) {
    setLineItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );

    setSaved(false);
  }

  function addLineItem() {
    setLineItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unitPrice: "0.00",
      },
    ]);

    setSaved(false);
  }

  function removeLineItem(id: string) {
    setLineItems((current) => current.filter((item) => item.id !== id));
    setSaved(false);
  }

  function handleIssueDateChange(nextDate: string) {
    setIssueDate(nextDate);
    setSaved(false);
    setErrors([]);

    if (invoiceId || !nextDate) return;

    try {
      setInvoiceNumber(getNextDocumentNumber(documentType, nextDate));
    } catch (error) {
      setInvoiceNumber("");
      setErrors([
        error instanceof Error
          ? error.message
          : "Unable to generate the document number.",
      ]);
    }
  }

  function handleDocumentTypeChange(nextType: DocumentType) {
    if (invoiceId) return;

    setDocumentType(nextType);
    setSaved(false);
    setErrors([]);

    if (!issueDate) {
      setInvoiceNumber("");
      return;
    }

    try {
      setInvoiceNumber(getNextDocumentNumber(nextType, issueDate));
    } catch (error) {
      setInvoiceNumber("");
      setErrors([
        error instanceof Error
          ? error.message
          : "Unable to generate the document number.",
      ]);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (submittingRef.current || saved) return;

    submittingRef.current = true;
    setSaving(true);
    setErrors([]);

    try {
      const existingDocuments = getInvoices();

      const existingDocument = invoiceId
        ? existingDocuments.find((item) => item.id === invoiceId)
        : undefined;

      if (invoiceId && !existingDocument) {
        setErrors([
          "This document could not be found in local storage. Return to the dashboard and try again.",
        ]);
        return;
      }

      const finalDocumentType =
        existingDocument?.documentType ?? documentType;

      const finalDocumentNumber = invoiceId
        ? existingDocument!.invoiceNumber
        : getNextDocumentNumber(finalDocumentType, issueDate);

      const duplicate = existingDocuments.some(
        (item) =>
          item.id !== invoiceId &&
          item.invoiceNumber.trim().toLowerCase() ===
            finalDocumentNumber.trim().toLowerCase(),
      );

      if (duplicate) {
        setErrors([
          `Document number "${finalDocumentNumber}" is already in use. Please try again.`,
        ]);
        return;
      }

      const invoice: Invoice = {
        id: invoiceId ?? crypto.randomUUID(),
        documentType: finalDocumentType,
        companyName: companyName.trim(),
        invoiceNumber: finalDocumentNumber,
        clientName: clientName.trim(),
        issueDate,
        dueDate,
        currency,
        taxRatePercent: Number(taxRate),
        status:
          existingDocument?.status ??
          initialInvoice?.status ??
          (finalDocumentType === "receipt" ? "paid" : "draft"),
        lineItems: invoiceLineItems,
      };

      const result = validateInvoice(invoice);

      if (!result.valid) {
        setErrors(result.errors);
        return;
      }

      saveInvoice(invoice);

      setInvoiceNumber(finalDocumentNumber);
      setSavedDocumentId(invoice.id);
      setSaved(true);
    } catch (error) {
      setErrors([
        error instanceof Error
          ? error.message
          : "Unable to save the document. Please try again.",
      ]);
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-950 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-sm text-gray-500 transition hover:text-gray-950"
        >
          ← Back to documents
        </Link>

        <header className="mb-8 mt-6">
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-gray-500">
            Currency Invoice Processor
          </p>

          <h1 className="text-3xl font-semibold tracking-tight">
            {invoiceId
              ? `Edit ${documentLabel}`
              : `Create ${documentLabel}`}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Enter your business details and add the products or services for
            your document.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
            <h2 className="mb-6 text-lg font-semibold">
              Document details
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Company name">
                <input
                  required
                  value={companyName}
                  onChange={(event) => {
                    setCompanyName(event.target.value);
                    setSaved(false);
                  }}
                  className={inputClass}
                  placeholder="Your business name"
                />
              </Field>

              <Field label="Document type">
                <select
                  required
                  value={documentType}
                  disabled={Boolean(invoiceId)}
                  onChange={(event) =>
                    handleDocumentTypeChange(
                      event.target.value as DocumentType,
                    )
                  }
                  className={inputClass}
                >
                  <option value="invoice">Invoice</option>
                  <option value="receipt">Receipt</option>
                </select>
              </Field>

              <Field label="Document number">
                <input
                  required
                  value={invoiceNumber || "Select an issue date"}
                  readOnly
                  className={`${inputClass} cursor-not-allowed bg-gray-50 text-gray-600`}
                />
              </Field>

              <Field label="Client name">
                <input
                  required
                  value={clientName}
                  onChange={(event) => {
                    setClientName(event.target.value);
                    setSaved(false);
                  }}
                  className={inputClass}
                  placeholder="Client or company name"
                />
              </Field>

              <Field label={isReceipt ? "Payment date" : "Issue date"}>
                <input
                  required
                  type="date"
                  value={issueDate}
                  onFocus={() => {
                    if (!issueDate && !invoiceId) {
                      handleIssueDateChange(getTodayLocalDate());
                    }
                  }}
                  onChange={(event) =>
                    handleIssueDateChange(event.target.value)
                  }
                  className={inputClass}
                />
              </Field>

              {!isReceipt && (
                <Field label="Due date">
                  <input
                    required
                    type="date"
                    value={dueDate}
                    onChange={(event) => {
                      setDueDate(event.target.value);
                      setSaved(false);
                    }}
                    className={inputClass}
                  />
                </Field>
              )}

              <Field label="Currency">
                <select
                  value={currency}
                  onChange={(event) => {
                    setCurrency(event.target.value);
                    setSaved(false);
                  }}
                  className={inputClass}
                >
                  <option value="USD">USD — US Dollar</option>
                  <option value="PHP">PHP — Philippine Peso</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="GBP">GBP — British Pound</option>
                  <option value="JPY">JPY — Japanese Yen</option>
                </select>
              </Field>

              <Field label="Tax rate (%)">
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={taxRate}
                  onChange={(event) => {
                    setTaxRate(Number(event.target.value));
                    setSaved(false);
                  }}
                  className={inputClass}
                />
              </Field>
            </div>

            {isReceipt && (
              <p className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                Receipts are saved with a Paid status.
              </p>
            )}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Line items</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Add the products or services being listed on this document.
                </p>
              </div>

              <button
                type="button"
                onClick={addLineItem}
                className="shrink-0 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium transition hover:bg-gray-50"
              >
                + Add item
              </button>
            </div>

            <div className="space-y-4">
              {lineItems.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-xl border border-gray-100 p-4 sm:grid-cols-12"
                >
                  <div className="sm:col-span-5">
                    <label
                      className="mb-2 block text-sm font-medium"
                      htmlFor={`description-${item.id}`}
                    >
                      Description
                    </label>

                    <input
                      id={`description-${item.id}`}
                      required
                      value={item.description}
                      onChange={(event) =>
                        updateLineItem(
                          item.id,
                          "description",
                          event.target.value,
                        )
                      }
                      className={inputClass}
                      placeholder={`Item ${index + 1}`}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      className="mb-2 block text-sm font-medium"
                      htmlFor={`quantity-${item.id}`}
                    >
                      Quantity
                    </label>

                    <input
                      id={`quantity-${item.id}`}
                      required
                      type="number"
                      min="0.01"
                      step="any"
                      value={item.quantity}
                      onChange={(event) =>
                        updateLineItem(
                          item.id,
                          "quantity",
                          Number(event.target.value),
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label
                      className="mb-2 block text-sm font-medium"
                      htmlFor={`price-${item.id}`}
                    >
                      Unit price
                    </label>

                    <input
                      id={`price-${item.id}`}
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(event) =>
                        updateLineItem(
                          item.id,
                          "unitPrice",
                          event.target.value,
                        )
                      }
                      className={inputClass}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-sm font-medium">
                      Line total
                    </span>

                    <div className="flex min-h-11 items-center font-medium">
                      {formatMoney(
                        Math.round(
                          Number(item.quantity) *
                            Number(item.unitPrice || 0) *
                            100,
                        ),
                        currency,
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={lineItems.length === 1}
                      onClick={() => removeLineItem(item.id)}
                      className="mt-1 text-xs text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
            <h2 className="mb-5 text-lg font-semibold">Summary</h2>

            <div className="ml-auto max-w-sm space-y-3 text-sm">
              <div className="flex justify-between gap-4 text-gray-600">
                <span>Subtotal</span>
                <span>{formatMoney(totals.subtotalMinor, currency)}</span>
              </div>

              <div className="flex justify-between gap-4 text-gray-600">
                <span>Tax ({taxRate || 0}%)</span>
                <span>{formatMoney(totals.taxMinor, currency)}</span>
              </div>

              <div className="flex justify-between gap-4 border-t border-gray-200 pt-4 text-base font-semibold">
                <span>{isReceipt ? "Amount paid" : "Total due"}</span>
                <span>{formatMoney(totals.totalMinor, currency)}</span>
              </div>
            </div>
          </section>

          {errors.length > 0 && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <p className="mb-2 font-semibold">Please fix the following:</p>
              <ul className="list-inside list-disc space-y-1">
                {errors.map((error, index) => (
                  <li key={`${index}-${error}`}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {saved && (
            <div
              role="status"
              className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700"
            >
              {isReceipt ? "Receipt" : "Invoice"}{" "}
              {invoiceId ? "updated" : "saved"} successfully!

              {savedDocumentId && (
                <div className="mt-2">
                  <Link
                    href={`/invoices/${savedDocumentId}`}
                    className="font-semibold underline"
                  >
                    View {documentLabel}
                  </Link>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center rounded-lg border border-gray-200 bg-white px-5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={!invoiceNumber || !issueDate || saving || saved}
              className="min-h-12 rounded-lg bg-gray-950 px-6 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : saved
                  ? "Saved successfully"
                  : invoiceId
                    ? `Update ${documentLabel}`
                    : `Save ${documentLabel}`}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
