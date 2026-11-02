/** Single source of truth for currencies offered anywhere in the app. */
export const SUPPORTED_CURRENCIES = [
  { code: "USD", name: "US Dollar" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "JPY", name: "Japanese Yen" },
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const CURRENCY_CODES = SUPPORTED_CURRENCIES.map(
  (currency) => currency.code,
) as [CurrencyCode, ...CurrencyCode[]];

export function isSupportedCurrency(value: string): value is CurrencyCode {
  return (CURRENCY_CODES as string[]).includes(value);
}
