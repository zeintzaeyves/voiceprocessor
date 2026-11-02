// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";
import { Field, Input } from "./form-controls";
import { ToastProvider, useToast } from "./toast";

afterEach(() => {
  vi.useRealTimers();
});

describe("Field", () => {
  it("ties label, control, hint and error together for assistive tech", () => {
    const { rerender } = render(
      <Field label="Email" hint="We never share it" required>
        {(props) => <Input {...props} />}
      </Field>,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-required", "true");
    expect(input).not.toHaveAttribute("aria-invalid");
    expect(input).toHaveAccessibleDescription("We never share it");

    rerender(
      <Field label="Email" hint="We never share it" error="Enter a valid email." required>
        {(props) => <Input {...props} />}
      </Field>,
    );
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email.");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
  });
});

describe("ConfirmDialog", () => {
  function setup(onConfirm = vi.fn(), onCancel = vi.fn()) {
    render(
      <ConfirmDialog
        open
        title="Delete it?"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    return { onConfirm, onCancel };
  }

  it("is an accessible, named dialog with a description", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Delete it?" });
    expect(dialog).toHaveAccessibleDescription("This cannot be undone.");
  });

  it("confirms and cancels through its buttons", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("treats Escape as cancel", () => {
    const { onCancel } = setup();
    const dialog = screen.getByRole("dialog");
    dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows a busy state and blocks double-submits while confirming", async () => {
    const user = userEvent.setup();
    let finish!: () => void;
    const onConfirm = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    setup(onConfirm);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    const busy = screen.getByRole("button", { name: "Delete" });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");

    await act(async () => finish());
    expect(screen.getByRole("button", { name: "Delete" })).toBeEnabled();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("Toast", () => {
  function Trigger({ tone }: { tone?: "success" | "error" }) {
    const { toast } = useToast();
    return (
      <button onClick={() => toast({ title: "Saved", description: "All good", tone })}>
        go
      </button>
    );
  }

  it("announces success politely and dismisses itself", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("status")).toHaveTextContent("Saved");

    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("uses an alert for errors and keeps them longer", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <ToastProvider>
        <Trigger tone="error" />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: "go" }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("can be dismissed by hand", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "go" }));
    await user.click(screen.getByRole("button", { name: "Dismiss notification" }));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("refuses to be used without a provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });
});
