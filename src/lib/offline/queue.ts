// The offline write queue. Everything the active-session screen produces is
// written here first (with a client-generated UUID) and synced later. IndexedDB
// via idb-keyval so a dropped network can never lose a logged set.
import { get, set, del, keys } from "idb-keyval";

const PREFIX = "op:";

export type SetOp = {
  id: string; // client UUID — also the server primary key (idempotent)
  kind: "set";
  createdAt: number;
  payload: {
    id: string;
    sessionId: string;
    templateExerciseId: string | null;
    exerciseId: string;
    round: number;
    dropIndex: number;
    weightKg: number;
    reps: number;
    side: "both" | "left" | "right";
    rir: number | null;
    toFailure: boolean;
    loggedAt: string;
  };
};

export type FinishOp = {
  id: string;
  kind: "finish";
  createdAt: number;
  payload: {
    sessionId: string;
    stepperMin: number | null;
    sessionRpe: number | null;
    bodyweightKg: number | null;
    notes: string | null;
  };
};

export type QueueOp = SetOp | FinishOp;

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

export async function enqueue(op: QueueOp): Promise<void> {
  await set(PREFIX + op.id, op);
}

export async function allPending(): Promise<QueueOp[]> {
  const ks = (await keys()) as string[];
  const ops: QueueOp[] = [];
  for (const k of ks) {
    if (typeof k === "string" && k.startsWith(PREFIX)) {
      const op = (await get(k)) as QueueOp | undefined;
      if (op) ops.push(op);
    }
  }
  return ops.sort((a, b) => a.createdAt - b.createdAt);
}

export async function remove(id: string): Promise<void> {
  await del(PREFIX + id);
}

export async function pendingCount(): Promise<number> {
  const ks = (await keys()) as string[];
  return ks.filter((k) => typeof k === "string" && k.startsWith(PREFIX)).length;
}

/** Drop every queued op that targets a given session (used when discarding it). */
export async function clearForSession(sessionId: string): Promise<void> {
  for (const op of await allPending()) {
    const opSessionId =
      op.kind === "set" ? op.payload.sessionId : op.payload.sessionId;
    if (opSessionId === sessionId) await remove(op.id);
  }
}
