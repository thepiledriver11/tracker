"use client";

import { useCallback, useEffect, useState } from "react";

export type SectionId = "career" | "fitness" | "nutrition" | "finance";

export type Goal = {
  id: string;
  section: SectionId;
  title: string;
  note?: string;
  done: boolean;
  createdAt: number;
};

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "career", label: "Career" },
  { id: "fitness", label: "Fitness" },
  { id: "nutrition", label: "Nutrition" },
  { id: "finance", label: "Finance" },
];

export function isSectionId(value: string): value is SectionId {
  return SECTIONS.some((s) => s.id === value);
}

const STORAGE_KEY = "goal-tracker:v1";

function load(): Goal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Goal[]) : [];
  } catch {
    return [];
  }
}

export function useGoals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setGoals(load());
    setReady(true);
  }, []);

  const persist = useCallback((next: Goal[]) => {
    setGoals(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addGoal = useCallback(
    (section: SectionId, title: string, note?: string) => {
      const goal: Goal = {
        id: crypto.randomUUID(),
        section,
        title: title.trim(),
        note: note?.trim() || undefined,
        done: false,
        createdAt: Date.now(),
      };
      persist([goal, ...load()]);
    },
    [persist]
  );

  const toggleGoal = useCallback(
    (id: string) => {
      persist(load().map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
    },
    [persist]
  );

  const deleteGoal = useCallback(
    (id: string) => {
      persist(load().filter((g) => g.id !== id));
    },
    [persist]
  );

  return { goals, ready, addGoal, toggleGoal, deleteGoal };
}
