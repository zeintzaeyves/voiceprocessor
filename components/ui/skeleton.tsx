import { cn } from "@/lib/cn";

/** A shimmering placeholder. Decorative; pair with an aria-busy region. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-md bg-[linear-gradient(90deg,var(--color-sunken)_25%,#fafaf8_50%,var(--color-sunken)_75%)] bg-[length:200%_100%] [animation:shimmer_1.4s_linear_infinite]",
        className,
      )}
    />
  );
}
