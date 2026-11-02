import { getCurrencyExponent, convertLegacyMinor } from "../lib/money";

export const UNNAMED_COMPANY = "(Unnamed company)";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function roundTo(value: unknown, decimals: number): unknown {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  const scale = 10 ** decimals;
  return Math.round(value * scale) / scale;
}

/**
 * Brings a version-1 record (a bare array entry written by the original app)
 * up to the current shape *before* schema validation. It only repairs what
 * older versions are known to have produced; anything else is left alone so
 * the schema can reject it and the record is quarantined rather than lost.
 *
 * v1 differences:
 *  - amounts were stored with two decimals for every currency
 *  - documentType / companyName / discount did not exist yet
 *  - quantities and tax could carry more precision than we now allow
 */
export function migrateLegacyRecord(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;

  const currency = typeof raw.currency === "string" ? raw.currency : "";
  const needsExponentFix =
    currency !== "" && getCurrencyExponent(currency) !== 2;

  const lineItems = Array.isArray(raw.lineItems)
    ? raw.lineItems.map((item: unknown) => {
        if (!isRecord(item)) return item;
        return {
          ...item,
          quantity: roundTo(item.quantity, 3),
          unitPriceMinor:
            needsExponentFix && typeof item.unitPriceMinor === "number"
              ? convertLegacyMinor(item.unitPriceMinor, currency)
              : item.unitPriceMinor,
        };
      })
    : raw.lineItems;

  const companyName =
    typeof raw.companyName === "string" && raw.companyName.trim() !== ""
      ? raw.companyName
      : UNNAMED_COMPANY;

  return {
    ...raw,
    documentType:
      raw.documentType === "receipt" ? "receipt" : "invoice",
    companyName,
    taxRatePercent: roundTo(raw.taxRatePercent, 2),
    lineItems,
  };
}
