"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { SECTIONS, isSectionId, useGoals, type Goal } from "@/lib/store";
import {
  CheckIcon,
  ChevronLeftIcon,
  GridIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "@/components/icons";

function GoalRow({
  goal,
  onToggle,
  onDelete,
}: {
  goal: Goal;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 border-b border-line py-3 last:border-b-0">
      <button
        onClick={onToggle}
        aria-label={goal.done ? "Mark as not done" : "Mark as done"}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          goal.done ? "border-black bg-black text-white" : "border-faint"
        }`}
      >
        {goal.done && <CheckIcon className="h-3.5 w-3.5" />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-sm ${
            goal.done ? "text-faint line-through" : ""
          }`}
        >
          {goal.title}
        </p>
        {goal.note && (
          <p className="truncate text-xs text-faint">{goal.note}</p>
        )}
      </div>
      <button
        onClick={onDelete}
        aria-label="Delete goal"
        className="p-1 text-faint active:text-black"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </li>
  );
}

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const { goals, ready, addGoal, toggleGoal, deleteGoal } = useGoals();
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  if (!isSectionId(params.section)) notFound();
  const sectionId = params.section;
  const section = SECTIONS.find((s) => s.id === sectionId)!;

  const sectionGoals = goals
    .filter((g) => g.section === sectionId)
    .filter(
      (g) =>
        query.trim() === "" ||
        g.title.toLowerCase().includes(query.trim().toLowerCase())
    );
  const active = sectionGoals.filter((g) => !g.done);
  const completed = sectionGoals.filter((g) => g.done);

  const submit = () => {
    if (!title.trim()) return;
    addGoal(sectionId, title, note);
    setTitle("");
    setNote("");
    setAdding(false);
  };

  return (
    <main>
      <header className="flex items-center justify-between px-4 pb-2 pt-6">
        <Link href="/" aria-label="Back" className="-ml-1 p-1">
          <ChevronLeftIcon className="h-6 w-6" />
        </Link>
        <h1 className="text-base font-semibold">{section.label}</h1>
        <GridIcon className="h-6 w-6" />
      </header>

      <div className="px-5 pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-line px-3 py-2.5">
          <SearchIcon className="h-4 w-4 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search goals"
            className="w-full bg-transparent text-sm outline-none placeholder:text-faint"
          />
        </div>
      </div>

      <section className="px-5 pt-5">
        <h2 className="border-b border-line pb-2 text-sm font-semibold">
          Goals
        </h2>
        {!ready ? null : active.length === 0 && completed.length === 0 ? (
          <p className="py-8 text-center text-sm text-faint">
            {query
              ? "No goals match your search."
              : "No goals yet. Tap + to add your first one."}
          </p>
        ) : (
          <ul>
            {active.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                onToggle={() => toggleGoal(g.id)}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </ul>
        )}
      </section>

      {completed.length > 0 && (
        <section className="px-5 pt-5">
          <h2 className="border-b border-line pb-2 text-sm font-semibold text-faint">
            Completed
          </h2>
          <ul>
            {completed.map((g) => (
              <GoalRow
                key={g.id}
                goal={g}
                onToggle={() => toggleGoal(g.id)}
                onDelete={() => deleteGoal(g.id)}
              />
            ))}
          </ul>
        </section>
      )}

      <button
        onClick={() => setAdding(true)}
        aria-label="Add goal"
        className="fixed bottom-24 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white shadow-sm active:bg-neutral-50"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {adding && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/20"
          onClick={() => setAdding(false)}
        >
          <div
            className="w-full max-w-md rounded-t-2xl border border-line bg-white p-5 pb-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-base font-semibold">New {section.label} goal</h2>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Goal title"
              className="mt-4 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-black"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="Note (optional)"
              className="mt-3 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-black"
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setAdding(false)}
                className="flex-1 rounded-full border border-line py-2.5 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!title.trim()}
                className="flex-1 rounded-full bg-black py-2.5 text-sm text-white disabled:opacity-30"
              >
                Add goal
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
