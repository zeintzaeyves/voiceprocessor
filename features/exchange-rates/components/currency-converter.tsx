"use client";

import { useState } from "react";
import { getExchangeRate } from "../lib/frankfurter";

const currencies = [
  { code: "USD", name: "US Dollar" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
];

const inputClass =
  "min-h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-gray-500";

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [base, setBase] = useState("USD");
  const [target, setTarget] = useState("PHP");
  const [rate, setRate] = useState<number | null>(null);
  const [rateDate, setRateDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleConvert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 0) {
      setError("Enter a valid amount of zero or more.");
      return;
    }

    setLoading(true);
    setError("");
    setRate(null);

    try {
      const result = await getExchangeRate(base, target, numericAmount);
      setRate(result.rates[target]);
      setRateDate(result.date);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while converting currencies.",
      );
    } finally {
      setLoading(false);
    }
  }

  const convertedAmount =
    rate === null ? null : base === target ? Number(amount) : rate;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
          Exchange rates
        </p>
        <h2 className="mt-2 text-xl font-semibold">Currency converter</h2>
        <p className="mt-1 text-sm text-gray-500">
          Convert using the latest available reference rate.
        </p>
      </div>

      <form onSubmit={handleConvert} className="space-y-5">
        <div>
          <label
            htmlFor="conversion-amount"
            className="mb-2 block text-sm font-medium"
          >
            Amount
          </label>
          <input
            id="conversion-amount"
            type="number"
            min="0"
            step="any"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="base-currency"
              className="mb-2 block text-sm font-medium"
            >
              From
            </label>
            <select
              id="base-currency"
              value={base}
              onChange={(event) => setBase(event.target.value)}
              className={inputClass}
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="target-currency"
              className="mb-2 block text-sm font-medium"
            >
              To
            </label>
            <select
              id="target-currency"
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              className={inputClass}
            >
              {currencies.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currency.code} — {currency.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-11 w-full rounded-lg bg-gray-950 px-4 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Fetching rate..." : "Convert currency"}
        </button>
      </form>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      {convertedAmount !== null && !error && (
        <div className="mt-6 rounded-xl bg-gray-50 p-5">
          <p className="text-sm text-gray-500">Converted amount</p>
          <p className="mt-2 break-words text-3xl font-semibold tracking-tight">
            {formatMoney(convertedAmount, target)}
          </p>

          <p className="mt-3 text-sm text-gray-500">
            {base === target
              ? `1 ${base} = 1 ${target}`
              : `1 ${base} = ${(rate! / Number(amount || 1)).toLocaleString(
                  "en-US",
                  { maximumFractionDigits: 6 },
                )} ${target}`}
          </p>

          {rateDate && (
            <p className="mt-1 text-xs text-gray-400">
              Reference rate date: {rateDate}
            </p>
          )}
        </div>
      )}
    </section>
  );
}