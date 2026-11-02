import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { SampleInvoice } from "./sample-invoice";

const FEATURES = [
  {
    title: "Exact to the cent",
    body: "Totals use whole-number arithmetic, so rounding never drifts. Discounts apply before tax, and every figure is calculated in one place.",
  },
  {
    title: "Five currencies, handled properly",
    body: "USD, EUR, GBP, JPY and PHP, each with the right number of decimals. Balances in different currencies are never added together.",
  },
  {
    title: "Live preview as you type",
    body: "See the finished invoice update while you fill it in, with clear messages beside any field that needs attention.",
  },
  {
    title: "Overdue tracking that updates itself",
    body: "An unpaid invoice past its due date shows as overdue automatically. Paid invoices stay paid.",
  },
  {
    title: "Print or save as PDF",
    body: "A clean, print-ready document on A4. Use your browser's print dialog to save it as a PDF.",
  },
  {
    title: "Private by default",
    body: "No account and no server. Your invoices are stored in your own browser and never leave it.",
  },
];

const STEPS = [
  {
    title: "Enter the details",
    body: "Your business, your client, the items and the tax. Dates and payment terms start with sensible defaults.",
  },
  {
    title: "Check the preview",
    body: "Review the real invoice alongside the form. Fix anything flagged before you save.",
  },
  {
    title: "Send it and track it",
    body: "Print or save a PDF, then follow each document from draft to paid on your dashboard.",
  },
];

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-md bg-ink text-xs font-semibold tracking-tight text-white"
      >
        IP
      </span>
      <span className="text-sm font-semibold tracking-tight">Invoice Processor</span>
    </Link>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <header className="border-b border-line">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-8">
          <Brand />
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/invoices"
              className={buttonStyles("ghost", "md", "hidden sm:inline-flex")}
            >
              Invoices
            </Link>
            <Link
              href="/converter"
              className={buttonStyles("ghost", "md", "hidden sm:inline-flex")}
            >
              Converter
            </Link>
            <Link href="/dashboard" className={buttonStyles("primary", "md")}>
              Open app
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:px-8 sm:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,34rem)] lg:items-center lg:gap-16">
          <div>
            <p className="text-sm font-medium text-accent">Multi-currency invoicing</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl sm:leading-[1.08]">
              Invoices that get the maths right.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-ink-muted">
              Create professional invoices and receipts in the currency your client pays
              in. Totals are exact, statuses keep themselves up to date, and everything
              stays in your browser.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/invoices/new" className={buttonStyles("primary", "lg")}>
                Create an invoice
              </Link>
              <Link href="/dashboard" className={buttonStyles("secondary", "lg")}>
                Open dashboard
              </Link>
            </div>
            <p className="mt-4 text-sm text-ink-faint">
              No account needed. Nothing to install.
            </p>
          </div>

          <SampleInvoice />
        </section>

        {/* Features */}
        <section
          aria-labelledby="features-heading"
          className="border-y border-line bg-surface"
        >
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
            <h2
              id="features-heading"
              className="max-w-2xl text-3xl font-semibold tracking-tight"
            >
              Everything an invoice needs, nothing it doesn&apos;t.
            </h2>
            <ul className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <li key={feature.title}>
                  <h3 className="text-base font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-muted">{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section
          aria-labelledby="steps-heading"
          className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20"
        >
          <h2 id="steps-heading" className="text-3xl font-semibold tracking-tight">
            From blank page to paid in three steps.
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-lg border border-line bg-surface p-6 shadow-card"
              >
                <span
                  aria-hidden="true"
                  className="flex size-8 items-center justify-center rounded-full bg-sunken text-sm font-semibold tabular-nums"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold tracking-tight">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Closing call to action */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-8 sm:pb-24">
          <div className="rounded-lg bg-ink px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <h2 className="mx-auto max-w-xl text-3xl font-semibold tracking-tight">
              Send your first invoice in a few minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/70">
              Your data stays in this browser. Export it by printing to PDF whenever you
              need a copy.
            </p>
            <Link
              href="/invoices/new"
              className={buttonStyles(
                "secondary",
                "lg",
                "mt-8 border-transparent",
              )}
            >
              Create an invoice
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Brand />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            <Link href="/dashboard" className="hover:text-ink">Dashboard</Link>
            <Link href="/invoices" className="hover:text-ink">Invoices</Link>
            <Link href="/converter" className="hover:text-ink">Currency converter</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
