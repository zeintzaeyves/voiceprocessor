"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import {
  CloseIcon,
  ConverterIcon,
  DashboardIcon,
  InvoicesIcon,
  MenuIcon,
  PlusIcon,
} from "./icons";
import { NAV_ITEMS, getSectionLabel } from "./nav";

const ICONS: Record<string, ReactNode> = {
  "/": <DashboardIcon />,
  "/invoices": <InvoicesIcon />,
  "/converter": <ConverterIcon />,
};

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-md bg-ink text-xs font-semibold tracking-tight text-white"
      >
        IP
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">
          Invoice Processor
        </span>
        <span className="block text-xs text-ink-faint">Multi-currency</span>
      </span>
    </Link>
  );
}

/** Reads the pathname, which is only known at request time, so it suspends. */
function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <ul className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition duration-150",
                active
                  ? "bg-sunken text-ink"
                  : "text-ink-muted hover:bg-sunken/70 hover:text-ink",
              )}
            >
              {ICONS[item.href]}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function StaticNavLinks() {
  return (
    <ul className="space-y-0.5">
      {NAV_ITEMS.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-ink-muted"
          >
            {ICONS[item.href]}
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="px-1 pt-1">
        <Brand />
      </div>

      <Link
        href="/invoices/new"
        onClick={onNavigate}
        className={buttonStyles("primary", "md", "w-full")}
      >
        <PlusIcon />
        New document
      </Link>

      <nav aria-label="Main">
        <Suspense fallback={<StaticNavLinks />}>
          <NavLinks onNavigate={onNavigate} />
        </Suspense>
      </nav>

      <p className="mt-auto px-3 text-xs leading-5 text-ink-faint">
        Data is stored in this browser only.
      </p>
    </div>
  );
}

function SectionLabel() {
  const pathname = usePathname();
  return <>{getSectionLabel(pathname)}</>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const drawer = useRef<HTMLDialogElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (drawerOpen && !dialog.open) dialog.showModal();
    if (!drawerOpen && dialog.open) dialog.close();
  }, [drawerOpen]);

  // If the window grows past the mobile breakpoint, the drawer is pointless.
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const onChange = (event: MediaQueryListEvent) => {
      if (event.matches) setDrawerOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <aside
        data-print-hide
        className="sticky top-0 hidden h-dvh border-r border-line bg-surface lg:block"
      >
        <SidebarContent />
      </aside>

      <dialog
        ref={drawer}
        aria-label="Navigation"
        onClose={() => setDrawerOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDrawerOpen(false);
        }}
        className="drawer m-0 h-dvh max-h-none w-[min(18rem,85vw)] max-w-none border-r border-line bg-surface p-0 shadow-pop"
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close navigation"
          className="absolute right-3 top-4 rounded-md p-2 text-ink-muted hover:bg-sunken"
        >
          <CloseIcon />
        </button>
        <SidebarContent onNavigate={() => setDrawerOpen(false)} />
      </dialog>

      <div className="flex min-w-0 flex-col">
        <header
          data-print-hide
          className="sticky top-0 z-30 flex min-h-14 items-center gap-3 border-b border-line bg-canvas/85 px-4 backdrop-blur sm:px-8"
        >
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            className="-ml-2 rounded-md p-2 text-ink-muted transition hover:bg-sunken hover:text-ink lg:hidden"
          >
            <MenuIcon />
          </button>

          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-muted">
            <Suspense fallback="Invoice Processor">
              <SectionLabel />
            </Suspense>
          </p>

          <Link
            href="/invoices/new"
            className={buttonStyles("secondary", "sm", "hidden sm:inline-flex lg:hidden")}
          >
            <PlusIcon />
            New
          </Link>
        </header>

        <main
          id="main"
          data-print-reset
          className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-10"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
