import { afterEach, describe, expect, it, vi } from "vitest";
import { getExchangeRate } from "./frankfurter";

function mockFetch(response: Partial<Response> & { json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getExchangeRate", () => {
  it("multiplies the amount by the returned rate", async () => {
    const fetchMock = mockFetch({
      ok: true,
      json: async () => ({ rate: 56.5, date: "2026-10-10" }),
    });

    const result = await getExchangeRate("USD", "PHP", 100);

    expect(result).toEqual({
      amount: 100,
      base: "USD",
      date: "2026-10-10",
      rates: { PHP: 5650 },
    });
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.frankfurter.dev/v2/rate/USD/PHP",
    );
  });

  it("does not call the network for the same currency", async () => {
    const fetchMock = mockFetch({ ok: true });
    const result = await getExchangeRate("EUR", "EUR", 42);
    expect(result.rates.EUR).toBe(42);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([-1, Number.NaN, Infinity])("rejects the amount %s", async (amount) => {
    await expect(getExchangeRate("USD", "EUR", amount)).rejects.toThrow(
      /valid, non-negative amount/,
    );
  });

  it("surfaces the API's own error message", async () => {
    mockFetch({
      ok: false,
      status: 404,
      json: async () => ({ message: "not found" }),
    });
    await expect(getExchangeRate("USD", "XXX", 1)).rejects.toThrow("not found");
  });

  it("falls back to a status message when the error body is not JSON", async () => {
    mockFetch({
      ok: false,
      status: 503,
      json: async () => {
        throw new Error("bad json");
      },
    });
    await expect(getExchangeRate("USD", "EUR", 1)).rejects.toThrow(/503/);
  });

  it.each([null, {}, { rate: "56" , date: "2026-10-10" }, { rate: 1 }])(
    "rejects a malformed success response %j",
    async (body) => {
      mockFetch({ ok: true, json: async () => body });
      await expect(getExchangeRate("USD", "EUR", 1)).rejects.toThrow(
        /invalid response/,
      );
    },
  );
});
