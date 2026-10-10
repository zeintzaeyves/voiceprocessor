
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

export type InvoiceLineItem = {
  id: string;
  description: string;
  quantity: number;
  unitPriceMinor: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  taxRatePercent: number;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
};
