"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "./button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  /** Destructive actions use the danger style. */
  destructive?: boolean;
  /** May be async; the dialog shows a busy state until it settles. */
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
};

/**
 * Modal confirmation on the native <dialog> element: the browser traps
 * focus, closes on Escape and makes the page behind it inert.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Fires for Escape. Keep React state as the source of truth.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      // A click on the backdrop targets the <dialog> element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-line bg-surface p-0 shadow-pop"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-base font-semibold tracking-tight">
          {title}
        </h2>
        <div id={descriptionId} className="mt-2 text-sm text-ink-muted">
          {description}
        </div>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-line bg-canvas px-6 py-4 sm:flex-row sm:justify-end">
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant={destructive ? "danger" : "primary"}
          onClick={confirm}
          loading={busy}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
