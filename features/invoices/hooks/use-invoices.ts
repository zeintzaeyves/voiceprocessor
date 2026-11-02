"use client";

import { useCallback } from "react";
import type { Invoice } from "../types";
import type {
  InvoiceRepository,
  RepositoryHealth,
} from "../repository";
import { useRepositoryQuery, type QueryState } from "./use-repository-query";

type InvoicesData = { invoices: Invoice[]; health: RepositoryHealth };

async function loadInvoices(
  repository: InvoiceRepository,
): Promise<InvoicesData> {
  const [invoices, health] = await Promise.all([
    repository.list(),
    repository.getHealth(),
  ]);
  return { invoices, health };
}

/** All invoices plus storage health, with explicit loading and error states. */
export function useInvoices(): QueryState<InvoicesData> {
  return useRepositoryQuery(loadInvoices);
}

/** One invoice by id. `data` is null when no such invoice exists. */
export function useInvoice(id: string): QueryState<Invoice | null> {
  const load = useCallback(
    (repository: InvoiceRepository) => repository.get(id),
    [id],
  );
  return useRepositoryQuery(load);
}
