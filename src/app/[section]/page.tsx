"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import confetti from "canvas-confetti";
import {
  SECTIONS,
  isSectionId,
  useTracker,
  goalPct,
  actionPct,
  fmt,
  type Goal,
  type Action,
} from "@/lib/store";
import { Donut, Bar } from "@/components/charts";
import {
  ChevronLeftIcon,
  PlusIcon,
  XIcon,
} from "@/components/icons";
import HeaderMenu from "@/components/HeaderMenu";

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="sheet-enter w-full max-w-md rounded-t-2xl border border-line bg-white p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  numeric?: boolean;
  autoFocus?: boolean;
}) {
  return (
    <label className="mt-3 block first:mt-4">
      <span className="text-xs text-faint">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        type={numeric ? "number" : "text"}
        inputMode={numeric ? "decimal" : undefined}
        className="mt-1 w-full rounded-xl border border-line px-3 py-2.5 text-sm outline-none placeholder:text-faint focus:border-black"
      />
    </label>
  );
}

const num = (v: string) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Confetti burst when something is achieved; a bigger show for goals. */
function celebrate(big: boolean) {
  const base = { disableForReducedMotion: true };
  confetti({
    ...base,
    particleCount: big ? 160 : 80,
    spread: big ? 100 : 70,
    origin: { y: 0.7 },
  });
  if (big) {
    setTimeout(
      () =>
        confetti({
          ...base,
          particleCount: 100,
          spread: 120,
          angle: 60,
          origin: { x: 0, y: 0.8 },
        }),
      200
    );
    setTimeout(
      () =>
        confetti({
          ...base,
          particleCount: 100,
          spread: 120,
          angle: 120,
          origin: { x: 1, y: 0.8 },
        }),
      350
    );
  }
}

export default function SectionPage() {
  const params = useParams<{ section: string }>();
  const { state, ready, setGoal, addAction, updateAction, deleteAction } =
    useTracker();

  const [goalSheet, setGoalSheet] = useState(false);
  const [actionSheet, setActionSheet] = useState<"new" | Action | null>(null);
  const [f, setF] = useState({
    title: "",
    unit: "",
    start: "",
    current: "",
    target: "",
  });

  if (!isSectionId(params.section)) notFound();
  const sectionId = params.section;
  const section = SECTIONS.find((s) => s.id === sectionId)!;
  const data = state[sectionId];
  const goal = data.goal;

  const openGoalSheet = () => {
    setF({
      title: goal?.title ?? "",
      unit: goal?.unit ?? "",
      start: goal !== null ? String(goal.start) : "",
      current: goal !== null ? String(goal.current) : "",
      target: goal !== null ? String(goal.target) : "",
    });
    setGoalSheet(true);
  };

  const saveGoal = () => {
    if (!f.title.trim()) return;
    const start = num(f.start);
    const next: Goal = {
      title: f.title.trim(),
      unit: f.unit.trim() || undefined,
      start,
      current: f.current === "" ? start : num(f.current),
      target: num(f.target),
    };
    const before = goal ? goalPct(goal) : 0;
    setGoal(sectionId, next);
    setGoalSheet(false);
    if (goalPct(next) >= 100 && before < 100) celebrate(true);
  };

  const openActionSheet = (a: "new" | Action) => {
    setF({
      title: a === "new" ? "" : a.title,
      unit: a === "new" ? "" : a.unit ?? "",
      start: "",
      current: a === "new" ? "" : String(a.current),
      target: a === "new" ? "" : String(a.target),
    });
    setActionSheet(a);
  };

  const saveAction = () => {
    if (!f.title.trim() || actionSheet === null) return;
    const payload = {
      title: f.title.trim(),
      unit: f.unit.trim() || undefined,
      current: num(f.current),
      target: num(f.target),
    };
    const before =
      actionSheet === "new" ? 0 : actionPct(actionSheet);
    if (actionSheet === "new") addAction(sectionId, payload);
    else updateAction(sectionId, actionSheet.id, payload);
    setActionSheet(null);
    const after = actionPct({ id: "", ...payload });
    if (after >= 100 && before < 100) celebrate(false);
  };

  return (
    <main>
      <header className="flex items-center justify-between px-4 pb-2 pt-6">
        <Link href="/" aria-label="Back" className="-ml-1 p-1">
          <ChevronLeftIcon className="h-6 w-6" />
        </Link>
        <h1 className="text-base font-semibold">{section.label}</h1>
        <HeaderMenu />
      </header>

      {/* Overarching goal */}
      <section className="px-5 pt-3">
        {goal ? (
          <button
            onClick={openGoalSheet}
            className="w-full rounded-2xl border border-line p-5 text-left active:bg-neutral-50"
          >
            <div className="flex items-center gap-4">
              <Donut pct={goalPct(goal)} size={84} stroke={8} />
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-faint">
                  Goal
                </p>
                <p className="mt-0.5 font-medium leading-snug">{goal.title}</p>
                <p className="mt-1 text-xs text-faint">
                  {fmt(goal.start)} → {fmt(goal.target)}
                  {goal.unit ? ` ${goal.unit}` : ""}
                </p>
                <p className="text-sm font-semibold">
                  Now {fmt(goal.current)}
                  {goal.unit ? ` ${goal.unit}` : ""}
                </p>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-faint">
              Tap to update progress
            </p>
          </button>
        ) : (
          <button
            onClick={openGoalSheet}
            className="w-full rounded-2xl border border-dashed border-faint p-6 text-center active:bg-neutral-50"
          >
            <p className="font-medium">Set your {section.label} goal</p>
            <p className="mt-1 text-xs text-faint">
              Starting metric → target metric
            </p>
          </button>
        )}
      </section>

      {/* Actions */}
      <section className="px-5 pt-6">
        <h2 className="border-b border-line pb-2 text-sm font-semibold">
          Actions
        </h2>
        {!ready ? null : data.actions.length === 0 ? (
          <p className="py-8 text-center text-sm text-faint">
            No actions yet. Tap + to add one that moves you toward your goal.
          </p>
        ) : (
          <ul>
            {data.actions.map((a) => {
              const pct = actionPct(a);
              return (
                <li
                  key={a.id}
                  className="flex items-center gap-3 border-b border-line py-3.5 last:border-b-0"
                >
                  <button
                    onClick={() => openActionSheet(a)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="min-w-0 flex-1 truncate text-sm">
                        {a.title}
                      </p>
                      <p className="shrink-0 text-xs text-faint">
                        {fmt(a.current)} / {fmt(a.target)}
                        {a.unit ? ` ${a.unit}` : ""}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Bar pct={pct} />
                      <span className="w-9 shrink-0 text-right text-xs font-medium">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => deleteAction(sectionId, a.id)}
                    aria-label="Delete action"
                    className="p-1 text-faint active:text-black"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button
        onClick={() => openActionSheet("new")}
        aria-label="Add action"
        className="fixed bottom-24 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white shadow-sm active:bg-neutral-50"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {goalSheet && (
        <Sheet
          title={goal ? "Update goal" : `Set ${section.label} goal`}
          onClose={() => setGoalSheet(false)}
        >
          <Field
            label="Goal"
            value={f.title}
            onChange={(v) => setF({ ...f, title: v })}
            placeholder="e.g. Reach 80 kg"
            autoFocus={!goal}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                label="Starting metric"
                value={f.start}
                onChange={(v) => setF({ ...f, start: v })}
                placeholder="0"
                numeric
              />
            </div>
            <div className="flex-1">
              <Field
                label="Target metric"
                value={f.target}
                onChange={(v) => setF({ ...f, target: v })}
                placeholder="100"
                numeric
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                label={goal ? "Current metric" : "Current (optional)"}
                value={f.current}
                onChange={(v) => setF({ ...f, current: v })}
                placeholder="= start"
                numeric
                autoFocus={!!goal}
              />
            </div>
            <div className="flex-1">
              <Field
                label="Unit (optional)"
                value={f.unit}
                onChange={(v) => setF({ ...f, unit: v })}
                placeholder="kg, $, hrs"
              />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setGoalSheet(false)}
              className="flex-1 rounded-full border border-line py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={saveGoal}
              disabled={!f.title.trim()}
              className="flex-1 rounded-full bg-black py-2.5 text-sm text-white disabled:opacity-30"
            >
              Save goal
            </button>
          </div>
        </Sheet>
      )}

      {actionSheet !== null && (
        <Sheet
          title={actionSheet === "new" ? "New action" : "Update action"}
          onClose={() => setActionSheet(null)}
        >
          <Field
            label="Action"
            value={f.title}
            onChange={(v) => setF({ ...f, title: v })}
            placeholder="e.g. Gym sessions per week"
            autoFocus={actionSheet === "new"}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                label="Current metric"
                value={f.current}
                onChange={(v) => setF({ ...f, current: v })}
                placeholder="0"
                numeric
                autoFocus={actionSheet !== "new"}
              />
            </div>
            <div className="flex-1">
              <Field
                label="Target metric"
                value={f.target}
                onChange={(v) => setF({ ...f, target: v })}
                placeholder="10"
                numeric
              />
            </div>
          </div>
          <Field
            label="Unit (optional)"
            value={f.unit}
            onChange={(v) => setF({ ...f, unit: v })}
            placeholder="sessions, $, km"
          />
          <div className="mt-5 flex gap-3">
            <button
              onClick={() => setActionSheet(null)}
              className="flex-1 rounded-full border border-line py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={saveAction}
              disabled={!f.title.trim()}
              className="flex-1 rounded-full bg-black py-2.5 text-sm text-white disabled:opacity-30"
            >
              {actionSheet === "new" ? "Add action" : "Save"}
            </button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
