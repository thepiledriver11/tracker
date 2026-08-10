"use client";

import Link from "next/link";
import {
  SECTIONS,
  useTracker,
  goalPct,
  actionPct,
  fmt,
} from "@/lib/store";
import { Donut, Bar } from "@/components/charts";
import { SectionIcon } from "@/components/icons";

export default function DashboardPage() {
  const { state, ready } = useTracker();

  return (
    <main>
      <header className="px-5 pb-2 pt-6">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </header>

      <section className="space-y-3 px-5 pt-3">
        {SECTIONS.map((s) => {
          const data = state[s.id];
          const goal = data.goal;
          return (
            <Link
              key={s.id}
              href={`/${s.id}`}
              className="block rounded-2xl border border-line p-4 active:bg-neutral-50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-line">
                  <SectionIcon section={s.id} className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.label}</p>
                  {goal ? (
                    <p className="truncate text-xs text-faint">{goal.title}</p>
                  ) : (
                    <p className="text-xs text-faint">No goal set</p>
                  )}
                </div>
                {goal && <Donut pct={goalPct(goal)} size={56} stroke={6} />}
              </div>

              {goal && (
                <div className="mt-3 flex items-baseline justify-between text-xs">
                  <span className="text-faint">
                    Start {fmt(goal.start)}
                    {goal.unit ? ` ${goal.unit}` : ""}
                  </span>
                  <span className="font-semibold">
                    Now {fmt(goal.current)}
                    {goal.unit ? ` ${goal.unit}` : ""}
                  </span>
                  <span className="text-faint">
                    Target {fmt(goal.target)}
                    {goal.unit ? ` ${goal.unit}` : ""}
                  </span>
                </div>
              )}

              {data.actions.length > 0 && (
                <ul className="mt-4 space-y-3 border-t border-line pt-3">
                  {data.actions.map((a) => {
                    const pct = actionPct(a);
                    return (
                      <li key={a.id}>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-xs">
                            {a.title}
                          </p>
                          <p className="shrink-0 text-[11px] text-faint">
                            {fmt(a.current)} / {fmt(a.target)}
                            {a.unit ? ` ${a.unit}` : ""} · {Math.round(pct)}%
                          </p>
                        </div>
                        <Bar pct={pct} className="mt-1.5 !h-1" />
                      </li>
                    );
                  })}
                </ul>
              )}

              {ready && !goal && data.actions.length === 0 && (
                <p className="mt-3 text-xs text-faint">
                  Tap to set a goal and add actions.
                </p>
              )}
            </Link>
          );
        })}
      </section>
    </main>
  );
}
