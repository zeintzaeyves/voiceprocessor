"use client";

import { useSyncExternalStore } from "react";
import { getLocalDateString } from "../lib/dashboard-utils";

function subscribe(onChange: () => void) {
  // The date only changes at midnight, but a minute is cheap and also
  // catches a laptop waking up on a new day.
  const interval = window.setInterval(onChange, 60_000);
  document.addEventListener("visibilitychange", onChange);

  return () => {
    window.clearInterval(interval);
    document.removeEventListener("visibilitychange", onChange);
  };
}

/**
 * Today's local date as YYYY-MM-DD. Empty on the server and during
 * hydration (so markup matches), then the real date. Re-renders when the
 * day rolls over.
 */
export function useToday(): string {
  return useSyncExternalStore(subscribe, getLocalDateString, () => "");
}
