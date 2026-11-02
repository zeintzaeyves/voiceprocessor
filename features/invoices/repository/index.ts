import type { InvoiceRepository } from "./invoice-repository";
import { createLocalStorageInvoiceRepository } from "./local-storage-repository";

export * from "./invoice-repository";

let instance: InvoiceRepository | undefined;

/**
 * The app-wide repository. Swap the implementation here to move to a
 * database; no component imports a concrete repository directly.
 */
export function getInvoiceRepository(): InvoiceRepository {
  instance ??= createLocalStorageInvoiceRepository();
  return instance;
}
