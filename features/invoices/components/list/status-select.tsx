import type { InvoiceStatus } from "../../types";
import { STATUS_LABELS } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";

const TONE: Record<InvoiceStatus, string> = {
  draft: "bg-sunken text-ink-muted",
  sent: "bg-accent-soft text-accent",
  paid: "bg-success-soft text-success",
  overdue: "bg-danger-soft text-danger",
};

const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];

/** A native select styled as a status chip: fully keyboard and screen-reader accessible. */
export function StatusSelect({
  value,
  label,
  onChange,
}: {
  value: InvoiceStatus;
  /** Accessible name, e.g. "Status of INV-…". */
  label: string;
  onChange: (status: InvoiceStatus) => void;
}) {
  return (
    <select
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as InvoiceStatus)}
      className={cn(
        "min-h-9 cursor-pointer rounded-full border-0 py-1 pl-3 pr-7 text-xs font-medium transition duration-150 hover:brightness-95",
        TONE[value],
      )}
    >
      {STATUSES.map((status) => (
        <option key={status} value={status}>
          {STATUS_LABELS[status]}
        </option>
      ))}
    </select>
  );
}
