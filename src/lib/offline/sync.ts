// Drains the offline queue to the server. Safe to call repeatedly (on the
// `online` event, on focus, after each optimistic write). Server writes are
// idempotent on the client UUID, so a retried op can never duplicate.
import { allPending, remove, pendingCount, type QueueOp } from "./queue";

let flushing = false;

/** Notify listeners (the session header pill) that the queue size changed. */
function announce(count: number) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("queue:changed", { detail: count }));
  }
}

async function postOp(op: QueueOp): Promise<boolean> {
  const url = op.kind === "set" ? "/api/sets" : `/api/sessions/${op.payload.sessionId}/finish`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(op.payload),
    });
    // 200/201 = written; 409 = already exists (idempotent replay) — both done.
    return res.ok || res.status === 409;
  } catch {
    return false; // offline / network error — keep it queued
  }
}

export async function flushQueue(): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    const ops = await allPending();
    for (const op of ops) {
      const ok = await postOp(op);
      if (ok) await remove(op.id);
      else break; // stop on first failure; retry later, preserve order
    }
  } finally {
    flushing = false;
    announce(await pendingCount());
  }
}
