
"use client";

import { useSyncExternalStore } from "react";
import type { Invoice } from "@/features/invoices/types";
import { getInvoices } from "@/features/invoices/storage";

const STORAGE_EVENT = "invoices-updated";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

function getSnapshot() {
  return JSON.stringify(getInvoices());
}

function getServerSnapshot() {
  return "[]";
}

export function useInvoices() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  try {
    return JSON.parse(snapshot) as Invoice[];
  } catch {
    return [];
  }
}
