import { z } from "zod";
import { CURRENCY_CODES } from "./lib/currencies";
import {
  MAX_MINOR_AMOUNT,
  MAX_QUANTITY,
  PERCENT_DECIMALS,
  QUANTITY_DECIMALS,
  hasAtMostDecimals,
} from "./lib/money";

/** A real calendar date in YYYY-MM-DD form (rejects 2026-02-31). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    );
  }, "Enter a valid date.");

export const invoiceStatusSchema = z.enum([
  "draft",
  "sent",
  "paid",
  "overdue",
]);

export const documentTypeSchema = z.enum(["invoice", "receipt"]);

const requiredText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

/** Optional free text: trimmed, and an empty string is stored as absent. */
const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const optionalEmail = (label: string) =>
  optionalText(label, 120).refine(
    (value) => value === undefined || EMAIL_PATTERN.test(value),
    `Enter a valid ${label.toLowerCase()}.`,
  );

const percentSchema = (label: string) =>
  z
    .number({ error: `${label} must be a number.` })
    .min(0, `${label} must be between 0 and 100.`)
    .max(100, `${label} must be between 0 and 100.`)
    .refine(
      (value) => hasAtMostDecimals(value, PERCENT_DECIMALS),
      `${label} can have at most ${PERCENT_DECIMALS} decimal places.`,
    );

export const lineItemSchema = z.object({
  id: z.string().min(1),
  description: requiredText("Description", 200),
  quantity: z
    .number({ error: "Quantity must be a number." })
    .gt(0, "Quantity must be greater than zero.")
    .max(MAX_QUANTITY, "Quantity is too large.")
    .refine(
      (value) => hasAtMostDecimals(value, QUANTITY_DECIMALS),
      `Quantity can have at most ${QUANTITY_DECIMALS} decimal places.`,
    ),
  unitPriceMinor: z
    .number({ error: "Unit price must be a number." })
    .int("Unit price must be a whole number of minor units.")
    .min(0, "Unit price cannot be negative.")
    .max(MAX_MINOR_AMOUNT, "Unit price is too large."),
});

export const discountSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({ type: z.literal("percent"), percent: percentSchema("Discount") }),
  z.object({
    type: z.literal("fixed"),
    amountMinor: z
      .number({ error: "Discount must be a number." })
      .int()
      .min(0, "Discount cannot be negative.")
      .max(MAX_MINOR_AMOUNT, "Discount is too large."),
  }),
]);

export const invoiceSchema = z
  .object({
    id: z.string().min(1),
    documentType: documentTypeSchema.default("invoice"),
    companyName: requiredText("Company name", 120),
    invoiceNumber: requiredText("Document number", 64),
    companyEmail: optionalEmail("Company email"),
    companyAddress: optionalText("Company address", 300),
    clientName: requiredText("Client name", 120),
    clientEmail: optionalEmail("Client email"),
    clientAddress: optionalText("Client address", 300),
    issueDate: isoDateSchema,
    dueDate: isoDateSchema,
    currency: z.enum(CURRENCY_CODES, {
      error: "Choose a supported currency.",
    }),
    taxRatePercent: percentSchema("Tax rate"),
    discount: discountSchema.default({ type: "none" }),
    status: invoiceStatusSchema,
    notes: optionalText("Notes", 1000),
    /** ISO timestamps set by the repository; absent on legacy records. */
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    lineItems: z
      .array(lineItemSchema)
      .min(1, "Add at least one line item.")
      .max(200, "An invoice can have at most 200 line items."),
  })
  .superRefine((invoice, ctx) => {
    if (invoice.dueDate < invoice.issueDate) {
      ctx.addIssue({
        code: "custom",
        path: ["dueDate"],
        message: "Due date cannot be before issue date.",
      });
    }
  });

export type InvoiceInput = z.input<typeof invoiceSchema>;
