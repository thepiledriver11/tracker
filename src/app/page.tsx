"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useTracker,
  goalPct,
  actionPct,
  actionShare,
  categoryPct,
  fmt,
} from "@/lib/store";
import { Donut, Bar } from "@/components/charts";
import { CategoryIcon, PlusIcon } from "@/components/icons";
import { Sheet, Field, SheetActions } from "@/components/ui";

export default function DashboardPage() {
  const { state, ready, addCategory } = useTracker();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");

  const save = () => {
    if (!label.trim()) return;
    addCategory(label);
    setLabel("");
    setAdding(false);
  };

  return (
    <main>
      <header className="px-5 pb-2 pt-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </header>

      <section className="space-y-3 px-5 pt-3">
        {state.categories.map((c) => (
          <Link
            key={c.id}
            href={`/${c.id}`}
            className="block rounded-2xl border border-line p-4 active:bg-neutral-50"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line">
                <CategoryIcon
                  icon={c.icon}
                  label={c.label}
                  className="h-5 w-5"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.label}</p>
                <p className="text-xs text-faint">
                  {c.goals.length === 0
                    ? "No goals yet"
                    : `${c.goals.length} goal${
                        c.goals.length > 1 ? "s" : ""
                      }`}
                </p>
              </div>
              {c.goals.length > 0 && (
                <Donut pct={categoryPct(c)} size={56} stroke={6} />
              )}
            </div>

            {c.goals.map((g) => (
              <div key={g.id} className="mt-4 border-t border-line pt-3">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium">
                    {g.title}
                  </p>
                  <p className="shrink-0 text-xs font-semibold">
                    {Math.round(goalPct(g))}%
                  </p>
                </div>
                <Bar pct={goalPct(g)} className="mt-1.5" />
                {g.actions.length === 0 ? (
                  <p className="mt-2 text-[11px] text-faint">
                    No actions yet — add some to drive this goal.
                  </p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {g.actions.map((a) => (
                      <li key={a.id}>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-[11px] text-faint">
                            {a.title}
                          </p>
                          <p className="shrink-0 text-[11px] text-faint">
                            {fmt(a.current)} / {fmt(a.target)}
                            {a.unit ? ` ${a.unit}` : ""} ·{" "}
                            {Math.round(actionShare(g, a))}% weight
                          </p>
                        </div>
                        <Bar pct={actionPct(a)} className="mt-1 !h-1" />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            {ready && c.goals.length === 0 && (
              <p className="mt-3 text-xs text-faint">
                Tap to add your first goal.
              </p>
            )}
          </Link>
        ))}

        {ready && state.categories.length === 0 && (
          <p className="py-10 text-center text-sm text-faint">
            No categories yet. Tap + to create one.
          </p>
        )}
      </section>

      <button
        onClick={() => setAdding(true)}
        aria-label="Add category"
        className="fixed bottom-24 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white shadow-sm active:bg-neutral-50"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {adding && (
        <Sheet title="New category" onClose={() => setAdding(false)}>
          <Field
            label="Category name"
            value={label}
            onChange={setLabel}
            placeholder="e.g. Learning"
            autoFocus
            onEnter={save}
          />
          <SheetActions
            onCancel={() => setAdding(false)}
            onConfirm={save}
            confirmLabel="Add category"
            disabled={!label.trim()}
          />
        </Sheet>
      )}
    </main>
  );
}
