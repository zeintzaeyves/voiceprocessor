"use client";

import { useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { SUPPORTED_CURRENCIES } from "@/features/invoices/lib/currencies";
import { formatDate } from "@/features/invoices/lib/dates";
import { getExchangeRate } from "../lib/frankfurter";

type Result = {
  amount: number;
  base: string;
  target: string;
  converted: number;
  date: string;
};

/** Exchange amounts are real numbers, not invoice minor units. */
function formatAmount(amount: number, currency: string, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: digits,
  }).format(amount);
}

export function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [base, setBase] = useState("USD");
  const [target, setTarget] = useState("PHP");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [amountError, setAmountError] = useState("");
  const [loading, setLoading] = useState(false);

  // Only the most recent request may update the screen.
  const latestRequest = useRef(0);

  function swap() {
    setBase(target);
    setTarget(base);
    setResult(null);
  }

  async function handleConvert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numeric = Number(amount);
    if (amount.trim() === "" || !Number.isFinite(numeric) || numeric < 0) {
      setAmountError("Enter an amount of zero or more.");
      return;
    }

    const request = ++latestRequest.current;
    setAmountError("");
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await getExchangeRate(base, target, numeric);
      if (request !== latestRequest.current) return;

      setResult({
        amount: numeric,
        base,
        target,
        converted: response.rates[target],
        date: response.date,
      });
    } catch (caught) {
      if (request !== latestRequest.current) return;
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while converting currencies.",
      );
    } finally {
      if (request === latestRequest.current) setLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader
        title="Convert an amount"
        description="Uses the latest reference rate published by the European Central Bank via Frankfurter."
      />

      <form onSubmit={handleConvert} noValidate className="space-y-5 p-5">
        <Field label="Amount" error={amountError} required>
          {(props) => (
            <Input
              {...props}
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          )}
        </Field>

        <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
          <Field label="From">
            {(props) => (
              <Select
                {...props}
                value={base}
                onChange={(event) => {
                  setBase(event.target.value);
                  setResult(null);
                }}
              >
                {SUPPORTED_CURRENCIES.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {code} — {name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Button
            onClick={swap}
            aria-label="Swap currencies"
            className="mx-auto sm:mb-0"
          >
            ⇄
          </Button>

          <Field label="To">
            {(props) => (
              <Select
                {...props}
                value={target}
                onChange={(event) => {
                  setTarget(event.target.value);
                  setResult(null);
                }}
              >
                {SUPPORTED_CURRENCIES.map(({ code, name }) => (
                  <option key={code} value={code}>
                    {code} — {name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <Button type="submit" variant="primary" loading={loading}>
          {loading ? "Converting" : "Convert"}
        </Button>
      </form>

      <div aria-live="polite" className="border-t border-line p-5">
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        {result && (
          <div>
            <p className="text-sm text-ink-muted">
              {formatAmount(result.amount, result.base)} =
            </p>
            <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
              {formatAmount(result.converted, result.target)}
            </p>
            <p className="mt-3 text-xs text-ink-faint">
              {result.amount > 0 &&
                `1 ${result.base} = ${formatAmount(result.converted / result.amount, result.target, 4)} · `}
              Rate from {formatDate(result.date)}
            </p>
          </div>
        )}

        {!error && !result && !loading && (
          <p className="text-sm text-ink-muted">
            Choose currencies and an amount to see the converted value.
          </p>
        )}
      </div>
    </Card>
  );
}
