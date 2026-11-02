import type { InvoiceStatus } from "@/features/invoices/types";
import { cn } from "@/lib/cn";

const styles: Record<
  InvoiceStatus,
  { label: string; chip: string; dot: string }
> = {
  draft: { label: "Draft", chip: "bg-sunken text-ink-muted", dot: "bg-ink-faint" },
  sent: { label: "Sent", chip: "bg-accent-soft text-accent", dot: "bg-accent" },
  paid: { label: "Paid", chip: "bg-success-soft text-success", dot: "bg-success" },
  overdue: {
    label: "Overdue",
    chip: "bg-danger-soft text-danger",
    dot: "bg-danger",
  },
};

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: styles.draft.label,
  sent: styles.sent.label,
  paid: styles.paid.label,
  overdue: styles.overdue.label,
};

export const STATUS_DOT: Record<InvoiceStatus, string> = {
  draft: styles.draft.dot,
  sent: styles.sent.dot,
  paid: styles.paid.dot,
  overdue: styles.overdue.dot,
};

/** Status is conveyed by text and a dot, never by colour alone. */
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const { label, chip, dot } = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        chip,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", dot)} />
      {label}
    </span>
  );
}
