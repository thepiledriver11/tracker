"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SectionId =
  | "career"
  | "fitness"
  | "nutrition"
  | "finance"
  | "todo";

export type Goal = {
  title: string;
  unit?: string;
  start: number;
  current: number;
  target: number;
};

export type Action = {
  id: string;
  title: string;
  unit?: string;
  current: number;
  target: number;
};

export type SectionData = {
  goal: Goal | null;
  actions: Action[];
};

export type TrackerState = Record<SectionId, SectionData>;

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "career", label: "Career" },
  { id: "fitness", label: "Fitness" },
  { id: "nutrition", label: "Nutrition" },
  { id: "finance", label: "Finance" },
  { id: "todo", label: "To do" },
];

export function isSectionId(value: string): value is SectionId {
  return SECTIONS.some((s) => s.id === value);
}

const STORAGE_KEY = "goal-tracker:v2";

const EMPTY: TrackerState = {
  career: { goal: null, actions: [] },
  fitness: { goal: null, actions: [] },
  nutrition: { goal: null, actions: [] },
  finance: { goal: null, actions: [] },
  todo: { goal: null, actions: [] },
};

function normalize(parsed: Partial<TrackerState> | null): TrackerState {
  const state = structuredClone(EMPTY);
  if (!parsed) return state;
  for (const s of SECTIONS) {
    if (parsed[s.id]) {
      state[s.id] = {
        goal: parsed[s.id]?.goal ?? null,
        actions: parsed[s.id]?.actions ?? [],
      };
    }
  }
  return state;
}

function loadLocal(): TrackerState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? (JSON.parse(raw) as Partial<TrackerState>) : null);
  } catch {
    return structuredClone(EMPTY);
  }
}

function saveLocal(state: TrackerState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Server sync (Railway Postgres via /api/state) -------------------------
// localStorage is the fast cache; the database is the source of truth. Every
// mutation writes both. Without DATABASE_URL the API is a no-op and the app
// keeps working on localStorage alone.

async function fetchServerState(): Promise<TrackerState | null> {
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { state: Partial<TrackerState> | null };
    return json.state ? normalize(json.state) : null;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveServerState(state: TrackerState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fetch("/api/state", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
    }).catch(() => {});
  }, 400);
}

// --- Progress --------------------------------------------------------------

/** Progress toward the goal from its starting metric, 0–100. Works in both
 * directions (e.g. weight 90 → 80 or savings 10k → 50k). */
export function goalPct(goal: Goal): number {
  const span = goal.target - goal.start;
  if (span === 0) return 100;
  return clampPct(((goal.current - goal.start) / span) * 100);
}

export function actionPct(action: Action): number {
  if (action.target === 0) return action.current === 0 ? 100 : 0;
  return clampPct((action.current / action.target) * 100);
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// --- Hook ------------------------------------------------------------------

export function useTracker() {
  const [state, setState] = useState<TrackerState>(EMPTY);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    setState(loadLocal());
    setReady(true);
    let cancelled = false;
    fetchServerState().then((server) => {
      // Don't clobber edits made while the fetch was in flight.
      if (server && !cancelled && !dirty.current) {
        setState(server);
        saveLocal(server);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: TrackerState) => {
    dirty.current = true;
    setState(next);
    saveLocal(next);
    saveServerState(next);
  }, []);

  const mutate = useCallback(
    (section: SectionId, fn: (data: SectionData) => SectionData) => {
      const current = loadLocal();
      persist({ ...current, [section]: fn(current[section]) });
    },
    [persist]
  );

  const setGoal = useCallback(
    (section: SectionId, goal: Goal) => {
      mutate(section, (d) => ({ ...d, goal }));
    },
    [mutate]
  );

  const clearGoal = useCallback(
    (section: SectionId) => {
      mutate(section, (d) => ({ ...d, goal: null }));
    },
    [mutate]
  );

  const addAction = useCallback(
    (section: SectionId, action: Omit<Action, "id">) => {
      mutate(section, (d) => ({
        ...d,
        actions: [...d.actions, { ...action, id: crypto.randomUUID() }],
      }));
    },
    [mutate]
  );

  const updateAction = useCallback(
    (section: SectionId, id: string, patch: Partial<Omit<Action, "id">>) => {
      mutate(section, (d) => ({
        ...d,
        actions: d.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }));
    },
    [mutate]
  );

  const deleteAction = useCallback(
    (section: SectionId, id: string) => {
      mutate(section, (d) => ({
        ...d,
        actions: d.actions.filter((a) => a.id !== id),
      }));
    },
    [mutate]
  );

  return {
    state,
    ready,
    setGoal,
    clearGoal,
    addAction,
    updateAction,
    deleteAction,
  };
}
