"use client";

import Link from "next/link";
import { SECTIONS, useGoals } from "@/lib/store";
import { GridIcon, SectionIcon } from "@/components/icons";

export default function HomePage() {
  const { goals, ready } = useGoals();

  const total = goals.length;
  const done = goals.filter((g) => g.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <main>
      <header className="flex items-center justify-between px-5 pb-2 pt-6">
        <h1 className="text-xl font-semibold">Goals</h1>
        <GridIcon className="h-6 w-6 text-black" />
      </header>

      <section className="px-5 pt-3">
        <div className="rounded-2xl border border-line p-5">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-faint">Overall progress</p>
            <p className="text-sm font-medium">
              {ready ? `${done} of ${total} done` : ""}
            </p>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-line">
            <div
              className="h-1.5 rounded-full bg-black transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 px-5 pt-5">
        {SECTIONS.map((s) => {
          const sectionGoals = goals.filter((g) => g.section === s.id);
          const sectionDone = sectionGoals.filter((g) => g.done).length;
          const sectionPct =
            sectionGoals.length > 0
              ? Math.round((sectionDone / sectionGoals.length) * 100)
              : 0;
          return (
            <Link
              key={s.id}
              href={`/${s.id}`}
              className="block rounded-2xl border border-line p-4 active:bg-neutral-50"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line">
                  <SectionIcon section={s.id} className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="font-medium">{s.label}</p>
                  <p className="text-xs text-faint">
                    {sectionGoals.length === 0
                      ? "No goals yet"
                      : `${sectionDone} of ${sectionGoals.length} done`}
                  </p>
                </div>
                <span className="text-sm text-faint">{sectionPct}%</span>
              </div>
              <div className="mt-3 h-1 w-full rounded-full bg-line">
                <div
                  className="h-1 rounded-full bg-black transition-all"
                  style={{ width: `${sectionPct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
