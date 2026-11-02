"use client";

import { useEffect, useState } from "react";
import {
  getInvoiceRepository,
  type InvoiceRepository,
} from "../repository";

export type QueryState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: Error };

function toError(value: unknown): Error {
  return value instanceof Error ? value : new Error("Something went wrong.");
}

/**
 * Runs `load` against the repository and re-runs it whenever the data
 * changes (in this tab or another). `load` must be referentially stable
 * (module-level, or wrapped in useCallback) or it will refetch every render.
 *
 * Starts as "loading" on both server and client, so there is no hydration
 * mismatch even though the data only exists in the browser.
 */
export function useRepositoryQuery<T>(
  load: (repository: InvoiceRepository) => Promise<T>,
): QueryState<T> {
  const [state, setState] = useState<QueryState<T>>({ status: "loading" });

  useEffect(() => {
    const repository = getInvoiceRepository();
    let active = true;
    let latestRequest = 0;

    function run() {
      const request = ++latestRequest;

      load(repository).then(
        (data) => {
          if (active && request === latestRequest) {
            setState({ status: "ready", data });
          }
        },
        (error: unknown) => {
          if (active && request === latestRequest) {
            setState({ status: "error", error: toError(error) });
          }
        },
      );
    }

    run();
    const unsubscribe = repository.subscribe(run);

    return () => {
      active = false;
      unsubscribe();
    };
  }, [load]);

  return state;
}
