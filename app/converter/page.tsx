import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/page-header";
import { CurrencyConverter } from "@/features/exchange-rates/components/currency-converter";

export const metadata: Metadata = { title: "Currency converter" };

export default function ConverterPage() {
  return (
    <>
      <PageHeader
        title="Currency converter"
        description="Check what an amount is worth in another currency before you invoice."
      />
      <CurrencyConverter />
    </>
  );
}
