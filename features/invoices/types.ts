import type { z } from "zod";
import type {
  discountSchema,
  documentTypeSchema,
  invoiceSchema,
  invoiceStatusSchema,
  lineItemSchema,
} from "./schema";

export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type InvoiceLineItem = z.infer<typeof lineItemSchema>;
export type InvoiceDiscount = z.infer<typeof discountSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
