// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import axe from "axe-core";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { NAV_ITEMS, getSectionLabel } from "../shell/nav";
import { LandingPage } from "./landing-page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

/** Routes that exist in app/. Keep in sync when adding pages. */
const REAL_ROUTES = new Set(["/", "/dashboard", "/invoices", "/invoices/new", "/converter"]);

describe("LandingPage", () => {
  it("has one h1 and a sensible heading outline", () => {
    render(<LandingPage />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: /invoices that get the maths right/i }),
    ).toBeInTheDocument();

    const h2 = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(h2).toHaveLength(3);
  });

  it("points the primary actions into the app", () => {
    render(<LandingPage />);
    const main = within(screen.getByRole("main"));

    expect(main.getAllByRole("link", { name: "Create an invoice" })[0]).toHaveAttribute(
      "href",
      "/invoices/new",
    );
    expect(main.getByRole("link", { name: "Open dashboard" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
    expect(screen.getByRole("link", { name: "Open app" })).toHaveAttribute(
      "href",
      "/dashboard",
    );
  });

  it("never links to a page that does not exist", () => {
    render(<LandingPage />);
    const targets = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter((href): href is string => href !== null && !href.startsWith("#"));

    expect(targets.length).toBeGreaterThan(5);
    for (const href of targets) expect(REAL_ROUTES.has(href), href).toBe(true);
  });

  it("labels its sample invoice as made up rather than presenting it as real", () => {
    render(<LandingPage />);
    expect(screen.getByRole("figure", { name: "Sample invoice" })).toHaveTextContent(
      "made-up details",
    );
  });

  it("shows correct sample figures", () => {
    render(<LandingPage />);
    // 2,400.00 + 6 × 180.00 + 2.5 × 95.00 = 3,717.50; −10% = 3,345.75;
    // +23% tax = 769.52 (769.5225 rounded); total 4,115.27
    const sample = within(screen.getByRole("figure", { name: "Sample invoice" }));
    expect(sample.getByText("€3,717.50")).toBeInTheDocument();
    expect(sample.getByText("−€371.75")).toBeInTheDocument();
    expect(sample.getByText("€769.52")).toBeInTheDocument();
    expect(sample.getByText("€4,115.27")).toBeInTheDocument();
  });

  it("makes no invented claims", () => {
    render(<LandingPage />);
    const text = document.body.textContent ?? "";
    // Guard against drifting into fake social proof or metrics.
    expect(text).not.toMatch(/\b\d[\d,]*\+?\s*(users|customers|businesses|companies)\b/i);
    expect(text).not.toMatch(/testimonial|trusted by|as seen/i);
  });

  it("passes axe (WCAG 2.1 A/AA, excluding contrast which needs real layout)", async () => {
    const { container } = render(<LandingPage />);
    const results = await axe.run(container, {
      runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] },
      rules: { "color-contrast": { enabled: false }, region: { enabled: false } },
    });
    const summary = results.violations.map(
      (v) => `${v.id}: ${v.help}\n${v.nodes.map((n) => `  ${n.html.slice(0, 100)}`).join("\n")}`,
    );
    expect(summary, summary.join("\n")).toEqual([]);
  });
});

describe("app navigation after the landing page", () => {
  it("keeps the dashboard at /dashboard and out of the landing route", () => {
    const dashboard = NAV_ITEMS.find((item) => item.label === "Dashboard")!;
    expect(dashboard.href).toBe("/dashboard");
    expect(dashboard.match("/dashboard")).toBe(true);
    expect(dashboard.match("/")).toBe(false);
  });

  it("names the dashboard section and falls back for the landing page", () => {
    expect(getSectionLabel("/dashboard")).toBe("Dashboard");
    expect(getSectionLabel("/")).toBe("Invoice Processor");
  });

  it("only one nav item is current on any app page", () => {
    for (const path of ["/dashboard", "/invoices", "/invoices/abc", "/invoices/abc/edit", "/converter"]) {
      expect(NAV_ITEMS.filter((item) => item.match(path)), path).toHaveLength(1);
    }
    expect(NAV_ITEMS.filter((item) => item.match("/invoices/new"))).toHaveLength(0);
  });
});
