export type ExchangeRateResponse = {
  amount: number;
  base: string;
  date: string;
  rates: Record<string, number>;
};

const API_BASE_URL = "https://api.frankfurter.dev/v2";

export async function getExchangeRate(
  base: string,
  target: string,
  amount = 1,
): Promise<ExchangeRateResponse> {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error("Please enter a valid, non-negative amount.");
  }

  if (base === target) {
    return {
      amount,
      base,
      date: new Date().toISOString().slice(0, 10),
      rates: { [target]: amount },
    };
  }

  const url = `${API_BASE_URL}/rate/${encodeURIComponent(base)}/${encodeURIComponent(target)}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Unable to fetch exchange rates (${response.status}).`;

    try {
      const errorData: unknown = await response.json();

      if (
        typeof errorData === "object" &&
        errorData !== null &&
        "message" in errorData &&
        typeof errorData.message === "string"
      ) {
        message = errorData.message;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  const data: unknown = await response.json();

  if (
    typeof data !== "object" ||
    data === null ||
    !("rate" in data) ||
    !("date" in data) ||
    typeof data.rate !== "number" ||
    typeof data.date !== "string"
  ) {
    throw new Error("The exchange-rate API returned an invalid response.");
  }

  return {
    amount,
    base,
    date: data.date,
    rates: {
      [target]: amount * data.rate,
    },
  };
}