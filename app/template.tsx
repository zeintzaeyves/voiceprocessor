import type { ReactNode } from "react";

/**
 * Unlike a layout, a template remounts on every navigation, which replays
 * this short entrance. Reduced-motion users get none (see globals.css).
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
