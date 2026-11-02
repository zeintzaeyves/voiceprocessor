import type { Metadata } from "next";
import { DashboardView } from "@/features/invoices/components/dashboard/dashboard-view";

// The root layout's title template does not apply to the page in the same segment.
export const metadata: Metadata = {
  title: { absolute: "Dashboard · Invoice Processor" },
};

export default function DashboardPage() {
  return <DashboardView />;
}
