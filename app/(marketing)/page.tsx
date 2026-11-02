import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: { absolute: "Invoice Processor · Multi-currency invoicing" },
  description:
    "Create exact, professional invoices and receipts in USD, EUR, GBP, JPY and PHP. No account needed; your data stays in your browser.",
};

export default function HomePage() {
  return <LandingPage />;
}
