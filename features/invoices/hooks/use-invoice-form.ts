"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { addDays } from "../lib/dates";
import {
  DEFAULT_PAYMENT_TERMS_DAYS,
  computeForm,
  emptyValues,
  newLineItem,
  valuesFromInvoice,
  type DiscountKind,
  type FormValues,
  type LineItemValues,
} from "../lib/form-state";
import { getInvoiceRepository, InvoiceRepositoryError } from "../repository";
import type { Invoice } from "../types";

type Options = {
  initialInvoice?: Invoice;
  /** Today's local date; used to seed a new document. */
  today: string;
};

function messagesFrom(error: unknown): string[] {
  if (error instanceof InvoiceRepositoryError) return error.messages;
  return [
    error instanceof Error
      ? error.message
      : "The document could not be saved. Please try again.",
  ];
}

/**
 * Owns everything about editing one document: the text the person typed,
 * which errors to show and when, the number preview and saving.
 *
 * Errors appear for a field once it has been left, and for every field once
 * a save has been attempted, so nobody is scolded while still typing.
 */
export function useInvoiceForm({ initialInvoice, today }: Options) {
  const router = useRouter();
  const { toast } = useToast();
  const isEditing = initialInvoice !== undefined;

  const [values, setValues] = useState<FormValues>(() =>
    initialInvoice
      ? valuesFromInvoice(initialInvoice)
      : emptyValues(today, crypto.randomUUID()),
  );
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [previewNumber, setPreviewNumber] = useState("");
  /** Bumped when a save is rejected, so the form can move focus to the first problem. */
  const [focusRequest, setFocusRequest] = useState(0);
  /** A newly added line whose description should receive focus. */
  const [focusLineId, setFocusLineId] = useState<string | null>(null);

  const savingRef = useRef(false);

  const status: Invoice["status"] =
    initialInvoice?.status ??
    (values.documentType === "receipt" ? "paid" : "draft");

  const computation = useMemo(
    () => computeForm(values, status),
    [values, status],
  );

  // A new document previews the number it will receive. Existing ones keep theirs.
  const { documentType, issueDate } = values;
  useEffect(() => {
    if (isEditing) return;

    let active = true;
    getInvoiceRepository()
      .peekNextNumber(documentType, issueDate)
      .then(
        (next) => {
          if (active) setPreviewNumber(next);
        },
        () => {
          // An empty or invalid date has no number yet.
          if (active) setPreviewNumber("");
        },
      );

    return () => {
      active = false;
    };
  }, [isEditing, documentType, issueDate]);

  const invoiceNumber = initialInvoice?.invoiceNumber ?? previewNumber;

  // ------------------------------------------------------------- editing

  function setField<K extends keyof Omit<FormValues, "lineItems">>(
    name: K,
    value: FormValues[K],
  ) {
    setValues((current) => {
      const next = { ...current, [name]: value };

      // Keep payment terms when the issue date moves, unless the due date
      // was set by hand.
      if (name === "issueDate" && typeof value === "string") {
        const hadDefaultTerms =
          current.dueDate ===
          addDays(current.issueDate, DEFAULT_PAYMENT_TERMS_DAYS);
        if (hadDefaultTerms) {
          next.dueDate = addDays(value, DEFAULT_PAYMENT_TERMS_DAYS);
        }
      }
      return next;
    });
  }

  function setDiscountKind(kind: DiscountKind) {
    setValues((current) => ({
      ...current,
      discountKind: kind,
      discountValue: kind === "none" ? "" : current.discountValue,
    }));
  }

  function updateLine(id: string, patch: Partial<Omit<LineItemValues, "id">>) {
    setValues((current) => ({
      ...current,
      lineItems: current.lineItems.map((line) =>
        line.id === id ? { ...line, ...patch } : line,
      ),
    }));
  }

  function addLine() {
    const id = crypto.randomUUID();
    setValues((current) => ({
      ...current,
      lineItems: [...current.lineItems, newLineItem(id)],
    }));
    setFocusLineId(id);
  }

  function removeLine(id: string) {
    setValues((current) =>
      current.lineItems.length <= 1
        ? current
        : {
            ...current,
            lineItems: current.lineItems.filter((line) => line.id !== id),
          },
    );
  }

  // --------------------------------------------------------- validation

  function touch(key: string) {
    setTouched((current) =>
      current.has(key) ? current : new Set(current).add(key),
    );
  }

  function errorFor(key: string): string | undefined {
    return submitted || touched.has(key) ? computation.errors[key] : undefined;
  }

  // -------------------------------------------------------------- saving

  /** Returns whether the document was saved. */
  async function submit(): Promise<boolean> {
    if (savingRef.current) return false;

    setSubmitted(true);
    setSubmitErrors([]);

    if (Object.keys(computation.errors).length > 0) {
      setFocusRequest((n) => n + 1);
      return false;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const repository = getInvoiceRepository();
      const saved = initialInvoice
        ? await repository.update(initialInvoice.id, computation.invoice)
        : await repository.create(computation.invoice);

      toast({
        title: `${saved.invoiceNumber} ${isEditing ? "updated" : "saved"}`,
      });
      router.push(`/invoices/${saved.id}`);
      return true;
    } catch (error) {
      setSubmitErrors(messagesFrom(error));
      return false;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return {
    isEditing,
    values,
    invoice: computation.invoice,
    totals: computation.totals,
    errors: computation.errors,
    invoiceNumber,
    status,
    saving,
    submitErrors,
    focusRequest,
    focusLineId,
    clearFocusLine: () => setFocusLineId(null),
    setField,
    setDiscountKind,
    updateLine,
    addLine,
    removeLine,
    touch,
    errorFor,
    submit,
  };
}
