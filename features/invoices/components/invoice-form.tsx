"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, LinkButton } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/form-controls";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { useInvoiceForm } from "../hooks/use-invoice-form";
import { useToday } from "../hooks/use-today";
import { SUPPORTED_CURRENCIES, type CurrencyCode } from "../lib/currencies";
import { formatMoney } from "../lib/money";
import type { DiscountKind } from "../lib/form-state";
import type { DocumentType, Invoice } from "../types";
import { LineItemsEditor } from "./form/line-items-editor";
import { InvoiceDocument } from "./invoice-document";

type Props = {
  /** Present when editing; absent when creating. */
  initialInvoice?: Invoice;
};

const DOCUMENT_TYPES: Array<{ value: DocumentType; label: string; hint: string }> = [
  { value: "invoice", label: "Invoice", hint: "Request payment" },
  { value: "receipt", label: "Receipt", hint: "Confirm a payment" },
];

function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading form" className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * New documents are seeded with today's date, which is only known in the
 * browser. Waiting for it here keeps the server-rendered page free of a
 * build-time date.
 */
export function InvoiceForm({ initialInvoice }: Props) {
  const today = useToday();
  if (!initialInvoice && !today) return <FormSkeleton />;
  return <InvoiceFormInner initialInvoice={initialInvoice} today={today} />;
}

function InvoiceFormInner({
  initialInvoice,
  today,
}: Props & { today: string }) {
  const form = useInvoiceForm({ initialInvoice, today });
  const { values, errorFor, touch } = form;

  const [view, setView] = useState<"edit" | "preview">("edit");
  const formRef = useRef<HTMLFormElement>(null);

  const isReceipt = values.documentType === "receipt";
  const label = isReceipt ? "receipt" : "invoice";

  // After a rejected save, bring the first problem into view and focus it.
  const { focusRequest } = form;
  useEffect(() => {
    if (focusRequest === 0) return;
    formRef.current
      ?.querySelector<HTMLElement>('[aria-invalid="true"]')
      ?.focus();
  }, [focusRequest]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const saved = await form.submit();
    // A rejected save may be showing the preview tab; errors live on the edit tab.
    if (!saved) setView("edit");
  }

  const documentData = {
    ...form.invoice,
    invoiceNumber: form.invoiceNumber,
    status: form.status,
  };

  return (
    <>
      <Link
        href={form.isEditing ? `/invoices/${initialInvoice?.id}` : "/invoices"}
        className="mb-4 inline-block text-sm text-ink-muted transition hover:text-ink"
      >
        ← {form.isEditing ? "Back to document" : "All documents"}
      </Link>

      <PageHeader
        title={form.isEditing ? `Edit ${label}` : `New ${label}`}
        description={
          form.isEditing
            ? `Changes to ${form.invoiceNumber} are saved to this browser.`
            : "Fill in the details. The preview updates as you type."
        }
      />

      {/* Below xl the form and preview share the screen via tabs. */}
      <div
        role="group"
        aria-label="Switch between editing and preview"
        className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-sunken p-1 xl:hidden"
      >
        {(["edit", "preview"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            aria-pressed={view === tab}
            onClick={() => setView(tab)}
            className={cn(
              "min-h-10 rounded-sm text-sm font-medium capitalize transition duration-150",
              view === tab
                ? "bg-surface text-ink shadow-card"
                : "text-ink-muted hover:text-ink",
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <form
        ref={formRef}
        noValidate
        onSubmit={handleSubmit}
        className="xl:grid xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start xl:gap-8"
      >
        <div className={cn("space-y-6", view === "preview" && "hidden xl:block xl:space-y-6")}>
          {/* ------------------------------------------------ Document */}
          <Card>
            <CardHeader title="Document" />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <fieldset className="sm:col-span-2">
                <legend className="mb-1.5 text-sm font-medium">Document type</legend>
                <div className="grid grid-cols-2 gap-2">
                  {DOCUMENT_TYPES.map((option) => {
                    const selected = values.documentType === option.value;
                    return (
                      <label
                        key={option.value}
                        className={cn(
                          "flex min-h-14 cursor-pointer flex-col justify-center rounded-md border px-4 py-2 transition duration-150 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent",
                          selected
                            ? "border-ink bg-surface shadow-card"
                            : "border-line-strong bg-surface hover:border-ink-faint",
                          form.isEditing && "cursor-not-allowed opacity-60",
                        )}
                      >
                        <input
                          type="radio"
                          name="documentType"
                          value={option.value}
                          checked={selected}
                          disabled={form.isEditing}
                          onChange={() => form.setField("documentType", option.value)}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{option.label}</span>
                        <span className="text-xs text-ink-muted">{option.hint}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <Field
                label="Document number"
                hint="Assigned automatically when you save."
              >
                {(props) => (
                  <Input
                    {...props}
                    readOnly
                    value={form.invoiceNumber}
                    placeholder="Pick an issue date"
                    className="bg-sunken font-mono text-ink-muted"
                  />
                )}
              </Field>

              <Field label="Currency" required>
                {(props) => (
                  <Select
                    {...props}
                    value={values.currency}
                    onChange={(event) =>
                      form.setField("currency", event.target.value as CurrencyCode)
                    }
                  >
                    {SUPPORTED_CURRENCIES.map(({ code, name }) => (
                      <option key={code} value={code}>
                        {code} — {name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field
                label={isReceipt ? "Payment date" : "Issue date"}
                error={errorFor("issueDate")}
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    type="date"
                    value={values.issueDate}
                    onChange={(event) => form.setField("issueDate", event.target.value)}
                    onBlur={() => touch("issueDate")}
                  />
                )}
              </Field>

              {!isReceipt && (
                <Field label="Due date" error={errorFor("dueDate")} required>
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={values.dueDate}
                      onChange={(event) => form.setField("dueDate", event.target.value)}
                      onBlur={() => touch("dueDate")}
                    />
                  )}
                </Field>
              )}
            </div>
          </Card>

          {/* ---------------------------------------------------- From */}
          <Card>
            <CardHeader title="From" description="Your business details." />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Company name" error={errorFor("companyName")} required className="sm:col-span-2">
                {(props) => (
                  <Input
                    {...props}
                    autoComplete="organization"
                    maxLength={120}
                    value={values.companyName}
                    placeholder="Your business name"
                    onChange={(event) => form.setField("companyName", event.target.value)}
                    onBlur={() => touch("companyName")}
                  />
                )}
              </Field>
              <Field label="Email" error={errorFor("companyEmail")}>
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    autoComplete="email"
                    value={values.companyEmail}
                    onChange={(event) => form.setField("companyEmail", event.target.value)}
                    onBlur={() => touch("companyEmail")}
                  />
                )}
              </Field>
              <Field label="Address" error={errorFor("companyAddress")} className="sm:col-span-2">
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    maxLength={300}
                    value={values.companyAddress}
                    onChange={(event) => form.setField("companyAddress", event.target.value)}
                    onBlur={() => touch("companyAddress")}
                  />
                )}
              </Field>
            </div>
          </Card>

          {/* ------------------------------------------------- Bill to */}
          <Card>
            <CardHeader title="Bill to" description="Who this document is for." />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Client name" error={errorFor("clientName")} required className="sm:col-span-2">
                {(props) => (
                  <Input
                    {...props}
                    maxLength={120}
                    value={values.clientName}
                    placeholder="Client or company name"
                    onChange={(event) => form.setField("clientName", event.target.value)}
                    onBlur={() => touch("clientName")}
                  />
                )}
              </Field>
              <Field label="Client email" error={errorFor("clientEmail")}>
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    value={values.clientEmail}
                    onChange={(event) => form.setField("clientEmail", event.target.value)}
                    onBlur={() => touch("clientEmail")}
                  />
                )}
              </Field>
              <Field label="Client address" error={errorFor("clientAddress")} className="sm:col-span-2">
                {(props) => (
                  <Textarea
                    {...props}
                    rows={2}
                    maxLength={300}
                    value={values.clientAddress}
                    onChange={(event) => form.setField("clientAddress", event.target.value)}
                    onBlur={() => touch("clientAddress")}
                  />
                )}
              </Field>
            </div>
          </Card>

          {/* ----------------------------------------------- Line items */}
          <Card>
            <CardHeader
              title="Items"
              description={`Amounts are in ${values.currency}.`}
              action={
                <Button size="sm" onClick={form.addLine}>
                  Add item
                </Button>
              }
            />
            <div className="p-5">
              <LineItemsEditor
                lines={values.lineItems}
                parsed={form.invoice.lineItems}
                currency={values.currency}
                errorFor={errorFor}
                touch={touch}
                onChange={form.updateLine}
                onRemove={form.removeLine}
                focusLineId={form.focusLineId}
                onFocused={form.clearFocusLine}
              />
              {errorFor("lineItems") && (
                <p role="alert" className="mt-3 text-xs text-danger">
                  {errorFor("lineItems")}
                </p>
              )}
            </div>
          </Card>

          {/* -------------------------------------------- Adjustments */}
          <Card>
            <CardHeader title="Tax and discount" description="The discount is applied before tax." />
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <Field label="Tax rate (%)" error={errorFor("taxRatePercent")}>
                {(props) => (
                  <Input
                    {...props}
                    inputMode="decimal"
                    value={values.taxRate}
                    onChange={(event) => form.setField("taxRate", event.target.value)}
                    onBlur={() => touch("taxRatePercent")}
                  />
                )}
              </Field>

              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-3">
                <Field label="Discount">
                  {(props) => (
                    <Select
                      {...props}
                      value={values.discountKind}
                      onChange={(event) =>
                        form.setDiscountKind(event.target.value as DiscountKind)
                      }
                    >
                      <option value="none">None</option>
                      <option value="percent">Percentage</option>
                      <option value="fixed">Fixed amount</option>
                    </Select>
                  )}
                </Field>
                <Field
                  label={values.discountKind === "percent" ? "Percent off" : "Amount off"}
                  error={errorFor("discount")}
                >
                  {(props) => (
                    <Input
                      {...props}
                      inputMode="decimal"
                      disabled={values.discountKind === "none"}
                      value={values.discountValue}
                      placeholder={values.discountKind === "none" ? "—" : undefined}
                      onChange={(event) => form.setField("discountValue", event.target.value)}
                      onBlur={() => touch("discount")}
                    />
                  )}
                </Field>
              </div>
            </div>
          </Card>

          {/* ------------------------------------------------------ Notes */}
          <Card>
            <CardHeader title="Notes" description="Payment instructions, thanks, or terms. Optional." />
            <div className="p-5">
              <Field label="Notes" error={errorFor("notes")} labelClassName="sr-only">
                {(props) => (
                  <Textarea
                    {...props}
                    rows={3}
                    maxLength={1000}
                    value={values.notes}
                    onChange={(event) => form.setField("notes", event.target.value)}
                    onBlur={() => touch("notes")}
                  />
                )}
              </Field>
            </div>
          </Card>

          {form.submitErrors.length > 0 && (
            <div
              role="alert"
              className="rounded-md border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              <p className="font-medium">This {label} could not be saved.</p>
              <ul className="mt-1 list-inside list-disc">
                {form.submitErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="sticky bottom-0 z-20 -mx-4 flex items-center justify-between gap-4 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 xl:mx-0 xl:rounded-lg xl:border xl:bg-surface xl:px-5">
            <div className="min-w-0">
              <p className="text-xs text-ink-muted">{isReceipt ? "Amount paid" : "Total due"}</p>
              <p className="truncate text-lg font-semibold tracking-tight tabular-nums">
                {formatMoney(form.totals.totalMinor, values.currency)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <LinkButton href={form.isEditing ? `/invoices/${initialInvoice?.id}` : "/invoices"}>
                Cancel
              </LinkButton>
              <Button type="submit" variant="primary" loading={form.saving}>
                {form.saving ? "Saving" : form.isEditing ? "Save changes" : `Save ${label}`}
              </Button>
            </div>
          </div>
        </div>

        {/* ------------------------------------------------- Live preview */}
        <aside
          aria-label="Live preview"
          className={cn(
            "xl:sticky xl:top-20",
            view === "edit" && "hidden xl:block",
          )}
        >
          <p className="mb-2 hidden text-xs font-medium text-ink-muted xl:block">
            Live preview
          </p>
          <InvoiceDocument data={documentData} totals={form.totals} draft />
        </aside>
      </form>
    </>
  );
}
