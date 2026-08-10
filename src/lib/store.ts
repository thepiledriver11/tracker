"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Action = {
  id: string;
  title: string;
  unit?: string;
  /** Optional starting metric; progress runs start → target. Without it,
   * progress is simply current / target. */
  start?: number;
  current: number;
  target: number;
  /** Relative importance of this action toward its goal (default 1). */
  weight: number;
};

export type GoalItem = {
  id: string;
  title: string;
  actions: Action[];
};

export type Category = {
  id: string;
  label: string;
  /** One of the built-in icon ids; custom categories use a monogram. */
  icon?: string;
  goals: GoalItem[];
};

export type TrackerState = { categories: Category[] };

export const BUILT_IN_ICONS = [
  "career",
  "fitness",
  "nutrition",
  "finance",
  "todo",
] as const;

const DEFAULT_LABELS: Record<string, string> = {
  career: "Career",
  fitness: "Fitness",
  nutrition: "Nutrition",
  finance: "Finance",
  todo: "To do",
};

function defaultState(): TrackerState {
  return {
    categories: Object.entries(DEFAULT_LABELS).map(([id, label]) => ({
      id,
      label,
      icon: id,
      goals: [],
    })),
  };
}

const EMPTY: TrackerState = { categories: [] };
const STORAGE_KEY = "goal-tracker:v3";
const LEGACY_KEY = "goal-tracker:v2";

// --- Normalization & migration ---------------------------------------------

type LegacyGoal = {
  title: string;
  unit?: string;
  start: number;
  current: number;
  target: number;
};
type LegacyAction = {
  id: string;
  title: string;
  unit?: string;
  current: number;
  target: number;
};
type LegacySection = { goal: LegacyGoal | null; actions: LegacyAction[] };

function migrateLegacy(old: Record<string, LegacySection>): TrackerState {
  return {
    categories: Object.entries(DEFAULT_LABELS).map(([id, label]) => {
      const section = old[id];
      const goals: GoalItem[] = [];
      if (section?.goal) {
        const g = section.goal;
        const actions: Action[] = [
          {
            id: crypto.randomUUID(),
            title: "Overall progress",
            unit: g.unit,
            start: g.start,
            current: g.current,
            target: g.target,
            weight: 1,
          },
          ...(section.actions ?? []).map((a) => ({ ...a, weight: 1 })),
        ];
        goals.push({ id: crypto.randomUUID(), title: g.title, actions });
      } else if (section?.actions?.length) {
        goals.push({
          id: crypto.randomUUID(),
          title: `${label} goal`,
          actions: section.actions.map((a) => ({ ...a, weight: 1 })),
        });
      }
      return { id, label, icon: id, goals };
    }),
  };
}

function normalize(parsed: unknown): TrackerState {
  if (!parsed || typeof parsed !== "object") return defaultState();
  const obj = parsed as Record<string, unknown>;
  if (Array.isArray(obj.categories)) {
    return {
      categories: (obj.categories as Category[]).map((c) => ({
        id: String(c.id),
        label: String(c.label ?? "Untitled"),
        icon: c.icon,
        goals: (c.goals ?? []).map((g) => ({
          id: String(g.id),
          title: String(g.title ?? ""),
          actions: (g.actions ?? []).map((a) => ({
            id: String(a.id),
            title: String(a.title ?? ""),
            unit: a.unit,
            start: typeof a.start === "number" ? a.start : undefined,
            current: Number(a.current) || 0,
            target: Number(a.target) || 0,
            weight: Number(a.weight) > 0 ? Number(a.weight) : 1,
          })),
        })),
      })),
    };
  }
  // v2 shape: { career: {goal, actions}, ... }
  if (obj.career || obj.fitness || obj.finance) {
    return migrateLegacy(obj as Record<string, LegacySection>);
  }
  return defaultState();
}

function loadLocal(): TrackerState {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return normalize(JSON.parse(raw));
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    if (legacy) return normalize(JSON.parse(legacy));
    return defaultState();
  } catch {
    return defaultState();
  }
}

function saveLocal(state: TrackerState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// --- Server sync (Railway Postgres via /api/state) -------------------------

async function fetchServerState(): Promise<TrackerState | null> {
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { state: unknown };
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

const UPDATE_EVENT = "tracker:update";

// --- Progress ---------------------------------------------------------------

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function actionPct(a: Action): number {
  const start = a.start ?? 0;
  const span = a.target - start;
  if (span === 0) return a.current === a.target ? 100 : 0;
  return clampPct(((a.current - start) / span) * 100);
}

/** Weighted sum of products: goal % = Σ(weight × action %) ÷ Σ(weight).
 * Weights are normalized, so they don't have to add up to 100. */
export function goalPct(g: GoalItem): number {
  const totalWeight = g.actions.reduce((s, a) => s + (a.weight || 1), 0);
  if (totalWeight === 0) return 0;
  const sum = g.actions.reduce(
    (s, a) => s + (a.weight || 1) * actionPct(a),
    0
  );
  return sum / totalWeight;
}

/** Share of the goal this action carries, as a percentage. */
export function actionShare(g: GoalItem, a: Action): number {
  const totalWeight = g.actions.reduce((s, x) => s + (x.weight || 1), 0);
  if (totalWeight === 0) return 0;
  return ((a.weight || 1) / totalWeight) * 100;
}

export function categoryPct(c: Category): number {
  if (c.goals.length === 0) return 0;
  return c.goals.reduce((s, g) => s + goalPct(g), 0) / c.goals.length;
}

export function fmt(n: number): string {
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// --- Hook --------------------------------------------------------------------

export function useTracker() {
  const [state, setState] = useState<TrackerState>(EMPTY);
  const [ready, setReady] = useState(false);
  const dirty = useRef(false);

  useEffect(() => {
    setState(loadLocal());
    setReady(true);
    let cancelled = false;
    fetchServerState().then((server) => {
      if (server && !cancelled && !dirty.current) {
        setState(server);
        saveLocal(server);
        window.dispatchEvent(new Event(UPDATE_EVENT));
      }
    });
    // Keep every mounted instance of the hook (pages, tab bar) in sync.
    const refresh = () => setState(loadLocal());
    window.addEventListener(UPDATE_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener(UPDATE_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const persist = useCallback((next: TrackerState) => {
    dirty.current = true;
    setState(next);
    saveLocal(next);
    saveServerState(next);
    window.dispatchEvent(new Event(UPDATE_EVENT));
  }, []);

  const mutate = useCallback(
    (fn: (s: TrackerState) => TrackerState) => {
      persist(fn(loadLocal()));
    },
    [persist]
  );

  const mutateCategory = useCallback(
    (categoryId: string, fn: (c: Category) => Category) => {
      mutate((s) => ({
        categories: s.categories.map((c) =>
          c.id === categoryId ? fn(c) : c
        ),
      }));
    },
    [mutate]
  );

  // Categories
  const addCategory = useCallback(
    (label: string) => {
      const id = crypto.randomUUID();
      mutate((s) => ({
        categories: [...s.categories, { id, label: label.trim(), goals: [] }],
      }));
      return id;
    },
    [mutate]
  );

  const renameCategory = useCallback(
    (categoryId: string, label: string) => {
      mutateCategory(categoryId, (c) => ({ ...c, label: label.trim() }));
    },
    [mutateCategory]
  );

  const deleteCategory = useCallback(
    (categoryId: string) => {
      mutate((s) => ({
        categories: s.categories.filter((c) => c.id !== categoryId),
      }));
    },
    [mutate]
  );

  // Goals
  const addGoal = useCallback(
    (categoryId: string, title: string) => {
      mutateCategory(categoryId, (c) => ({
        ...c,
        goals: [
          ...c.goals,
          { id: crypto.randomUUID(), title: title.trim(), actions: [] },
        ],
      }));
    },
    [mutateCategory]
  );

  const renameGoal = useCallback(
    (categoryId: string, goalId: string, title: string) => {
      mutateCategory(categoryId, (c) => ({
        ...c,
        goals: c.goals.map((g) =>
          g.id === goalId ? { ...g, title: title.trim() } : g
        ),
      }));
    },
    [mutateCategory]
  );

  const deleteGoal = useCallback(
    (categoryId: string, goalId: string) => {
      mutateCategory(categoryId, (c) => ({
        ...c,
        goals: c.goals.filter((g) => g.id !== goalId),
      }));
    },
    [mutateCategory]
  );

  // Actions
  const addAction = useCallback(
    (categoryId: string, goalId: string, action: Omit<Action, "id">) => {
      mutateCategory(categoryId, (c) => ({
        ...c,
        goals: c.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                actions: [
                  ...g.actions,
                  { ...action, id: crypto.randomUUID() },
                ],
              }
            : g
        ),
      }));
    },
    [mutateCategory]
  );

  const updateAction = useCallback(
    (
      categoryId: string,
      goalId: string,
      actionId: string,
      patch: Partial<Omit<Action, "id">>
    ) => {
      mutateCategory(categoryId, (c) => ({
        ...c,
        goals: c.goals.map((g) =>
          g.id === goalId
            ? {
                ...g,
                actions: g.actions.map((a) =>
                  a.id === actionId ? { ...a, ...patch } : a
                ),
              }
            : g
        ),
      }));
    },
    [mutateCategory]
  );

  const deleteAction = useCallback(
    (categoryId: string, goalId: string, actionId: string) => {
      mutateCategory(categoryId, (c) => ({
        ...c,
        goals: c.goals.map((g) =>
          g.id === goalId
            ? { ...g, actions: g.actions.filter((a) => a.id !== actionId) }
            : g
        ),
      }));
    },
    [mutateCategory]
  );

  return {
    state,
    ready,
    addCategory,
    renameCategory,
    deleteCategory,
    addGoal,
    renameGoal,
    deleteGoal,
    addAction,
    updateAction,
    deleteAction,
  };
}
