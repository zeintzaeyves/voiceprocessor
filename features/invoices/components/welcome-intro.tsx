"use client";

import { useEffect, useState } from "react";

export function WelcomeIntro() {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = visible ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [visible]);

  function enterWorkspace() {
    if (leaving) return;

    setLeaving(true);

    window.setTimeout(() => {
      setVisible(false);
    }, 300);
  }

  if (!visible) return null;

  return (
    <main
      className={`fixed inset-0 z-[100] overflow-y-auto bg-[#f7f7f4] text-[#171715] ${
        leaving ? "welcome-exit" : "welcome-enter"
      }`}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-6 sm:px-10 lg:px-16">
        {/* Header */}
        <header className="flex h-[76px] items-center justify-between border-b border-black/10">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center border border-black/15">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path
                  d="M5 7.5 12 4l7 3.5v9L12 20l-7-3.5v-9Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 10h7M8.5 13h4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <div>
              <p className="text-sm font-semibold tracking-[-0.04em]">
                Currency Processor
              </p>
              <p className="mt-0.5 text-[9px] uppercase tracking-[0.17em] text-black/45">
                Invoice management
              </p>
            </div>
          </div>

          <span className="hidden text-xs text-black/45 sm:block">
            Independent finance tool <span className="px-1.5">/</span> 01
          </span>
        </header>

        {/* Hero */}
        <section className="grid flex-1 items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
          <div className="welcome-copy max-w-xl">
            <p className="mb-8 text-[11px] uppercase tracking-[0.16em] text-black/50">
              A simpler way to manage your documents
            </p>

            <h1 className="text-[clamp(3.5rem,7.2vw,6.8rem)] font-medium leading-[0.94] tracking-[-0.085em]">
              Invoices,
              <br />
              without the
              <br />
              busywork<span className="text-[#77776f]">.</span>
            </h1>

            <p className="mt-8 max-w-md text-base leading-7 text-black/60 sm:text-[17px] sm:leading-8">
              Create invoices, issue receipts, and convert totals across
              currencies. Everything you need to keep your business documents
              organized, in one place.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button
                type="button"
                onClick={enterWorkspace}
                disabled={leaving}
                className="group inline-flex min-h-12 items-center gap-8 bg-[#171715] px-5 py-3 text-sm font-medium text-white transition-colors duration-200 hover:bg-[#383833] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-4 disabled:cursor-wait"
              >
                Open workspace
                <svg
                  viewBox="0 0 20 20"
                  fill="none"
                  className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                >
                  <path
                    d="M3.5 10h12m-5-5 5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <span className="text-xs text-black/45">
                No account required
              </span>
            </div>

            <div className="mt-12 grid max-w-md grid-cols-3 border-t border-black/15 pt-4">
              {[
                { number: "01", label: "Invoices" },
                { number: "02", label: "Receipts" },
                { number: "03", label: "Exchange rates" },
              ].map((item) => (
                <div key={item.number}>
                  <p className="text-[10px] text-black/40">{item.number}</p>
                  <p className="mt-2 text-xs font-medium">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Product preview */}
          <div className="welcome-preview min-w-0 lg:pl-3">
            <div className="border border-black/15 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 px-5 py-4 sm:px-7">
                <div>
                  <p className="text-xs font-semibold">Documents</p>
                  <p className="mt-1 text-[11px] text-black/45">
                    Workspace preview
                  </p>
                </div>

                <span className="border border-black/15 px-2.5 py-1 text-[10px] text-black/60">
                  SAMPLE DATA
                </span>
              </div>

              {/* Overview */}
              <div className="grid grid-cols-2 border-b border-black/10">
                <div className="border-r border-black/10 p-5 sm:p-7">
                  <p className="text-xs text-black/50">Document types</p>
                  <p className="mt-3 text-2xl font-medium tracking-[-0.06em] sm:text-3xl">
                    02
                  </p>
                  <p className="mt-2 text-[11px] text-black/45">
                    Invoices and receipts
                  </p>
                </div>

                <div className="p-5 sm:p-7">
                  <p className="text-xs text-black/50">Currency support</p>
                  <p className="mt-3 text-2xl font-medium tracking-[-0.06em] sm:text-3xl">
                    Multi
                  </p>
                  <p className="mt-2 text-[11px] text-black/45">
                    Frankfurter exchange rates
                  </p>
                </div>
              </div>

              {/* Documents table */}
              <div className="px-5 py-5 sm:px-7 sm:py-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-semibold">Recent documents</p>
                  <span className="text-[11px] text-black/40">Example</span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-y border-black/10 py-3 text-[10px] uppercase tracking-[0.08em] text-black/40 sm:grid-cols-[minmax(0,1fr)_minmax(90px,0.7fr)_auto]">
                  <span>Document</span>
                  <span className="hidden sm:block">Reference</span>
                  <span className="text-right">Amount</span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-black/[0.07] py-4 sm:grid-cols-[minmax(0,1fr)_minmax(90px,0.7fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      Client invoice
                    </p>
                    <p className="mt-1 text-[10px] text-black/45">Invoice</p>
                  </div>

                  <span className="hidden text-[10px] text-black/50 sm:block">
                    INV-001
                  </span>

                  <span className="text-right text-xs font-medium tabular-nums">
                    $4,200.00
                  </span>
                </div>

                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-black/[0.07] py-4 sm:grid-cols-[minmax(0,1fr)_minmax(90px,0.7fr)_auto]">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">
                      Payment received
                    </p>
                    <p className="mt-1 text-[10px] text-black/45">Receipt</p>
                  </div>

                  <span className="hidden text-[10px] text-black/50 sm:block">
                    REC-001
                  </span>

                  <span className="text-right text-xs font-medium tabular-nums">
                    $1,850.00
                  </span>
                </div>

                {/* Currency conversion */}
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border border-black/10 bg-[#f7f7f4] p-4">
                  <div>
                    <p className="text-xs font-medium">
                      Currency conversion
                    </p>
                    <p className="mt-1 text-[11px] text-black/50">
                      Convert document totals using exchange rates
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <span className="border border-black/15 bg-white px-2 py-1">
                      USD
                    </span>
                    <span className="text-black/35">→</span>
                    <span className="border border-black/15 bg-white px-2 py-1">
                      EUR
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 px-5 py-3 text-[10px] text-black/40 sm:px-7">
                <span>Local-first workspace</span>
                <span>Illustrative interface</span>
              </div>
            </div>

            <p className="mt-3 text-right text-[10px] text-black/40">
              Interface preview <span className="px-1">/</span> 001
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="flex flex-col gap-2 border-t border-black/10 py-5 text-[10px] text-black/45 sm:flex-row sm:items-center sm:justify-between">
          <span>Currency Invoice Processor</span>
          <span>Simple documents. Clear numbers.</span>
        </footer>
      </div>

      <style jsx global>{`
        .welcome-enter {
          animation: welcomeFadeIn 300ms ease both;
        }

        .welcome-exit {
          animation: welcomeFadeOut 300ms ease forwards;
          pointer-events: none;
        }

        .welcome-copy {
          animation: welcomeRise 500ms 60ms ease both;
        }

        .welcome-preview {
          animation: welcomeRise 550ms 120ms ease both;
        }

        @keyframes welcomeFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes welcomeFadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes welcomeRise {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .welcome-enter,
          .welcome-exit,
          .welcome-copy,
          .welcome-preview {
            animation-duration: 1ms !important;
            animation-delay: 0ms !important;
          }
        }
      `}</style>
    </main>
  );
}