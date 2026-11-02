export type NavItem = {
  href: string;
  label: string;
  /** Whether the item should show as current for this pathname. */
  match: (pathname: string) => boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", match: (p) => p === "/dashboard" },
  {
    href: "/invoices",
    label: "Invoices",
    match: (p) =>
      p === "/invoices" ||
      (p.startsWith("/invoices/") && p !== "/invoices/new"),
  },
  {
    href: "/converter",
    label: "Currency converter",
    match: (p) => p === "/converter",
  },
];

/** A short name for where the user is, shown in the top bar. */
export function getSectionLabel(pathname: string): string {
  if (pathname === "/dashboard") return "Dashboard";
  if (pathname === "/invoices") return "Invoices";
  if (pathname === "/invoices/new") return "New document";
  if (pathname.endsWith("/edit")) return "Edit document";
  if (pathname.startsWith("/invoices/")) return "Document";
  if (pathname === "/converter") return "Currency converter";
  return "Invoice Processor";
}
