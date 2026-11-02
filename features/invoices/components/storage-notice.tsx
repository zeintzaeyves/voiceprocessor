import type { RepositoryHealth } from "../repository";

/** Tells the user when saved data was set aside or could not be read. */
export function StorageNotice({ health }: { health: RepositoryHealth | null }) {
  if (!health || (!health.corrupted && health.quarantinedCount === 0)) {
    return null;
  }

  const count = health.quarantinedCount;
  const message = health.corrupted
    ? "Saved data in this browser could not be read. A backup copy has been kept, and the list below is empty."
    : `${count} saved record${count === 1 ? " was" : "s were"} unreadable and set aside rather than deleted.`;

  return (
    <div
      role="status"
      className="mb-6 rounded-md border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning"
    >
      {message}
    </div>
  );
}
