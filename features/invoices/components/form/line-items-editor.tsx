"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form-controls";
import { calculatePreviewTotals } from "../../lib/calculations";
import { getCurrencyExponent, formatMoney } from "../../lib/money";
import type { LineItemValues } from "../../lib/form-state";
import type { InvoiceLineItem } from "../../types";

type Props = {
  lines: LineItemValues[];
  /** Parsed counterpart of `lines`, same order; used to show each amount. */
  parsed: InvoiceLineItem[];
  currency: string;
  errorFor: (key: string) => string | undefined;
  touch: (key: string) => void;
  onChange: (id: string, patch: Partial<Omit<LineItemValues, "id">>) => void;
  onRemove: (id: string) => void;
  focusLineId: string | null;
  onFocused: () => void;
};

export function LineItemsEditor({
  lines,
  parsed,
  currency,
  errorFor,
  touch,
  onChange,
  onRemove,
  focusLineId,
  onFocused,
}: Props) {
  const list = useRef<HTMLUListElement>(null);

  // Move focus to the description of a row that was just added.
  useEffect(() => {
    if (!focusLineId) return;
    list.current
      ?.querySelector<HTMLInputElement>(`[data-line="${focusLineId}"] input`)
      ?.focus();
    onFocused();
  }, [focusLineId, onFocused]);

  const priceHint =
    getCurrencyExponent(currency) === 0 ? "Whole amounts only" : undefined;

  return (
    <ul ref={list} className="space-y-3">
      {lines.map((line, index) => {
        const amount = calculatePreviewTotals([parsed[index]], 0).subtotalMinor;
        const key = (field: string) => `lineItems.${index}.${field}`;

        return (
          <li
            key={line.id}
            data-line={line.id}
            className="rounded-md border border-line bg-canvas/60 p-3 sm:p-4"
          >
            <div className="space-y-3">
              <Field
                label={`Description (item ${index + 1})`}
                error={errorFor(key("description"))}
                required
              >
                {(props) => (
                  <Input
                    {...props}
                    value={line.description}
                    placeholder="What was provided"
                    maxLength={200}
                    onChange={(event) =>
                      onChange(line.id, { description: event.target.value })
                    }
                    onBlur={() => touch(key("description"))}
                  />
                )}
              </Field>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Field
                  label="Quantity"
                  error={errorFor(key("quantity"))}
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      inputMode="decimal"
                      value={line.quantity}
                      onChange={(event) =>
                        onChange(line.id, { quantity: event.target.value })
                      }
                      onBlur={() => touch(key("quantity"))}
                    />
                  )}
                </Field>

                <Field
                  label="Unit price"
                  error={errorFor(key("unitPriceMinor"))}
                  hint={priceHint}
                  required
                >
                  {(props) => (
                    <Input
                      {...props}
                      inputMode="decimal"
                      value={line.unitPrice}
                      placeholder={getCurrencyExponent(currency) === 0 ? "0" : "0.00"}
                      onChange={(event) =>
                        onChange(line.id, { unitPrice: event.target.value })
                      }
                      onBlur={() => touch(key("unitPriceMinor"))}
                    />
                  )}
                </Field>

                <div className="min-w-0">
                  <p className="mb-1.5 text-sm font-medium">Amount</p>
                  <p
                    className="flex min-h-11 items-center truncate text-sm font-medium tabular-nums"
                    aria-label={`Amount for item ${index + 1}`}
                  >
                    {formatMoney(amount, currency)}
                  </p>
                </div>

                <div className="flex items-end justify-end self-start sm:mt-[1.625rem]">
                  <Button
                    variant="ghost"
                    onClick={() => onRemove(line.id)}
                    disabled={lines.length === 1}
                    aria-label={`Remove item ${index + 1}`}
                    className="size-11 px-0 hover:text-danger"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="size-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6" />
                    </svg>
                  </Button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
