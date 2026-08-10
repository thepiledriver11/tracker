"use client";

import { useCallback, useEffect, useState } from "react";

export type SectionId = "career" | "fitness" | "nutrition" | "finance";

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
};

function load(): TrackerState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(EMPTY);
    const parsed = JSON.parse(raw) as Partial<TrackerState>;
    const state = structuredClone(EMPTY);
    for (const s of SECTIONS) {
      if (parsed[s.id]) {
        state[s.id] = {
          goal: parsed[s.id]?.goal ?? null,
          actions: parsed[s.id]?.actions ?? [],
        };
      }
    }
    return state;
  } catch {
    return structuredClone(EMPTY);
  }
}

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

export function useTracker() {
  const [state, setState] = useState<TrackerState>(EMPTY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  const persist = useCallback((next: TrackerState) => {
    setState(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const mutate = useCallback(
    (section: SectionId, fn: (data: SectionData) => SectionData) => {
      const current = load();
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
