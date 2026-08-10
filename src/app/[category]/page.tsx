"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import {
  useTracker,
  goalPct,
  actionPct,
  actionShare,
  fmt,
  type Action,
  type GoalItem,
} from "@/lib/store";
import { Donut, Bar } from "@/components/charts";
import {
  ChevronLeftIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@/components/icons";
import {
  ConfirmSheet,
  Field,
  Sheet,
  SheetActions,
  num,
} from "@/components/ui";

/** Confetti burst when something is achieved; a bigger show for goals. */
function celebrate(big: boolean) {
  const opts = { disableForReducedMotion: true };
  confetti({
    ...opts,
    particleCount: big ? 160 : 80,
    spread: big ? 100 : 70,
    origin: { y: 0.7 },
  });
  if (big) {
    setTimeout(
      () =>
        confetti({
          ...opts,
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
          ...opts,
          particleCount: 100,
          spread: 120,
          angle: 120,
          origin: { x: 1, y: 0.8 },
        }),
      350
    );
  }
}

type ActionForm = {
  title: string;
  unit: string;
  start: string;
  current: string;
  target: string;
  weight: string;
};

const emptyActionForm: ActionForm = {
  title: "",
  unit: "",
  start: "",
  current: "",
  target: "",
  weight: "1",
};

export default function CategoryPage() {
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const {
    state,
    ready,
    renameCategory,
    deleteCategory,
    addGoal,
    renameGoal,
    deleteGoal,
    addAction,
    updateAction,
    deleteAction,
  } = useTracker();

  const [catSheet, setCatSheet] = useState(false);
  const [catLabel, setCatLabel] = useState("");
  const [confirmDeleteCat, setConfirmDeleteCat] = useState(false);

  const [goalSheet, setGoalSheet] = useState<"new" | GoalItem | null>(null);
  const [goalTitle, setGoalTitle] = useState("");
  const [confirmDeleteGoal, setConfirmDeleteGoal] = useState<GoalItem | null>(
    null
  );

  const [actionSheet, setActionSheet] = useState<{
    goal: GoalItem;
    action: Action | null;
  } | null>(null);
  const [f, setF] = useState<ActionForm>(emptyActionForm);

  const category = state.categories.find((c) => c.id === params.category);

  if (ready && !category) {
    return (
      <main className="px-5 pt-6">
        <Link href="/" className="text-sm underline">
          ← Back to dashboard
        </Link>
        <p className="mt-6 text-sm text-faint">This category no longer exists.</p>
      </main>
    );
  }
  if (!category) return null;
  const categoryId = category.id;

  // Category ---------------------------------------------------------------
  const openCatSheet = () => {
    setCatLabel(category.label);
    setCatSheet(true);
  };
  const saveCat = () => {
    if (!catLabel.trim()) return;
    renameCategory(categoryId, catLabel);
    setCatSheet(false);
  };

  // Goals ------------------------------------------------------------------
  const openGoalSheet = (g: "new" | GoalItem) => {
    setGoalTitle(g === "new" ? "" : g.title);
    setGoalSheet(g);
  };
  const saveGoal = () => {
    if (!goalTitle.trim() || goalSheet === null) return;
    if (goalSheet === "new") addGoal(categoryId, goalTitle);
    else renameGoal(categoryId, goalSheet.id, goalTitle);
    setGoalSheet(null);
  };

  // Actions ----------------------------------------------------------------
  const openActionSheet = (goal: GoalItem, action: Action | null) => {
    setF(
      action
        ? {
            title: action.title,
            unit: action.unit ?? "",
            start: action.start !== undefined ? String(action.start) : "",
            current: String(action.current),
            target: String(action.target),
            weight: String(action.weight ?? 1),
          }
        : emptyActionForm
    );
    setActionSheet({ goal, action });
  };

  const saveAction = () => {
    if (!actionSheet || !f.title.trim()) return;
    const { goal, action } = actionSheet;
    const payload = {
      title: f.title.trim(),
      unit: f.unit.trim() || undefined,
      start: f.start === "" ? undefined : num(f.start),
      current: num(f.current),
      target: num(f.target),
      weight: Math.max(0, num(f.weight) || 1),
    };

    // Simulate the result so achievements can be detected before the state
    // round-trip.
    const nextActions = action
      ? goal.actions.map((a) =>
          a.id === action.id ? { ...a, ...payload } : a
        )
      : [...goal.actions, { ...payload, id: "pending" }];
    const goalBefore = goalPct(goal);
    const goalAfter = goalPct({ ...goal, actions: nextActions });
    const actionBefore = action ? actionPct(action) : 0;
    const actionAfter = actionPct({ ...payload, id: "pending" });

    if (action) updateAction(categoryId, goal.id, action.id, payload);
    else addAction(categoryId, goal.id, payload);
    setActionSheet(null);

    if (goalAfter >= 100 && goalBefore < 100) celebrate(true);
    else if (actionAfter >= 100 && actionBefore < 100) celebrate(false);
  };

  return (
    <main>
      <header className="flex items-center gap-2 px-4 pb-2 pt-6">
        <Link href="/" aria-label="Back" className="-ml-1 p-1">
          <ChevronLeftIcon className="h-6 w-6" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold">
          {category.label}
        </h1>
        <button onClick={openCatSheet} aria-label="Rename category" className="p-1">
          <PencilIcon className="h-5 w-5" />
        </button>
        <button
          onClick={() => setConfirmDeleteCat(true)}
          aria-label="Delete category"
          className="p-1"
        >
          <TrashIcon className="h-5 w-5" />
        </button>
      </header>

      <section className="space-y-3 px-5 pt-3">
        {category.goals.map((g) => {
          const pct = goalPct(g);
          return (
            <div key={g.id} className="rounded-2xl border border-line p-4">
              <div className="flex items-start gap-4">
                <Donut pct={pct} size={72} stroke={7} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs uppercase tracking-wide text-faint">
                    Goal
                  </p>
                  <p className="mt-0.5 font-medium leading-snug">{g.title}</p>
                  <div className="mt-1.5 flex gap-3">
                    <button
                      onClick={() => openGoalSheet(g)}
                      className="text-xs underline"
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => setConfirmDeleteGoal(g)}
                      className="text-xs underline"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <h3 className="mt-4 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                Actions
              </h3>
              {g.actions.length === 0 ? (
                <p className="py-4 text-center text-xs text-faint">
                  No actions yet. Actions drive this goal&apos;s percentage.
                </p>
              ) : (
                <ul>
                  {g.actions.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-center gap-2 border-b border-line py-3 last:border-b-0"
                    >
                      <button
                        onClick={() => openActionSheet(g, a)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm">
                            {a.title}
                          </p>
                          <p className="shrink-0 text-xs text-faint">
                            {a.start !== undefined
                              ? `${fmt(a.start)} → `
                              : ""}
                            {fmt(a.current)} / {fmt(a.target)}
                            {a.unit ? ` ${a.unit}` : ""}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Bar pct={actionPct(a)} />
                          <span className="w-9 shrink-0 text-right text-xs font-medium">
                            {Math.round(actionPct(a))}%
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-faint">
                          {Math.round(actionShare(g, a))}% of this goal
                          {a.weight !== 1 ? ` · weight ${fmt(a.weight)}` : ""}
                        </p>
                      </button>
                      <button
                        onClick={() => deleteAction(categoryId, g.id, a.id)}
                        aria-label="Delete action"
                        className="p-1 text-faint active:text-black"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button
                onClick={() => openActionSheet(g, null)}
                className="mt-3 w-full rounded-full border border-line py-2 text-xs active:bg-neutral-50"
              >
                + Add action
              </button>
            </div>
          );
        })}

        {ready && category.goals.length === 0 && (
          <button
            onClick={() => openGoalSheet("new")}
            className="w-full rounded-2xl border border-dashed border-faint p-6 text-center active:bg-neutral-50"
          >
            <p className="font-medium">Add your first {category.label} goal</p>
            <p className="mt-1 text-xs text-faint">
              Then add actions that add up to it
            </p>
          </button>
        )}
      </section>

      <button
        onClick={() => openGoalSheet("new")}
        aria-label="Add goal"
        className="fixed bottom-24 left-1/2 z-20 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full border border-line bg-white shadow-sm active:bg-neutral-50"
      >
        <PlusIcon className="h-6 w-6" />
      </button>

      {/* Category rename */}
      {catSheet && (
        <Sheet title="Rename category" onClose={() => setCatSheet(false)}>
          <Field
            label="Category name"
            value={catLabel}
            onChange={setCatLabel}
            autoFocus
            onEnter={saveCat}
          />
          <SheetActions
            onCancel={() => setCatSheet(false)}
            onConfirm={saveCat}
            disabled={!catLabel.trim()}
          />
        </Sheet>
      )}

      {confirmDeleteCat && (
        <ConfirmSheet
          title={`Delete ${category.label}?`}
          message={`This removes the category and its ${category.goals.length} goal(s). This can't be undone.`}
          confirmLabel="Delete category"
          onCancel={() => setConfirmDeleteCat(false)}
          onConfirm={() => {
            deleteCategory(categoryId);
            setConfirmDeleteCat(false);
            router.push("/");
          }}
        />
      )}

      {/* Goal add / rename */}
      {goalSheet !== null && (
        <Sheet
          title={goalSheet === "new" ? "New goal" : "Rename goal"}
          onClose={() => setGoalSheet(null)}
        >
          <Field
            label="Goal"
            value={goalTitle}
            onChange={setGoalTitle}
            placeholder="e.g. Promoted to Head of Product"
            autoFocus
            onEnter={saveGoal}
          />
          <SheetActions
            onCancel={() => setGoalSheet(null)}
            onConfirm={saveGoal}
            confirmLabel={goalSheet === "new" ? "Add goal" : "Save"}
            disabled={!goalTitle.trim()}
          />
        </Sheet>
      )}

      {confirmDeleteGoal && (
        <ConfirmSheet
          title="Delete goal?"
          message={`"${confirmDeleteGoal.title}" and its ${confirmDeleteGoal.actions.length} action(s) will be removed.`}
          confirmLabel="Delete goal"
          onCancel={() => setConfirmDeleteGoal(null)}
          onConfirm={() => {
            deleteGoal(categoryId, confirmDeleteGoal.id);
            setConfirmDeleteGoal(null);
          }}
        />
      )}

      {/* Action add / edit */}
      {actionSheet && (
        <Sheet
          title={actionSheet.action ? "Edit action" : "New action"}
          onClose={() => setActionSheet(null)}
        >
          <p className="mt-1 text-xs text-faint">
            Toward: {actionSheet.goal.title}
          </p>
          <Field
            label="Action"
            value={f.title}
            onChange={(v) => setF({ ...f, title: v })}
            placeholder="e.g. Ship 3 major features"
            autoFocus={!actionSheet.action}
          />
          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                label="Current metric"
                value={f.current}
                onChange={(v) => setF({ ...f, current: v })}
                placeholder="0"
                numeric
                autoFocus={!!actionSheet.action}
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
          <div className="flex gap-3">
            <div className="flex-1">
              <Field
                label="Start (optional)"
                value={f.start}
                onChange={(v) => setF({ ...f, start: v })}
                placeholder="0"
                numeric
                hint="For metrics that count down or start high"
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
          <Field
            label="Weight"
            value={f.weight}
            onChange={(v) => setF({ ...f, weight: v })}
            placeholder="1"
            numeric
            hint="How much of the goal this action carries, relative to the others. Equal weights split evenly; 50/30/20 gives those shares."
          />
          <SheetActions
            onCancel={() => setActionSheet(null)}
            onConfirm={saveAction}
            confirmLabel={actionSheet.action ? "Save" : "Add action"}
            disabled={!f.title.trim()}
          />
        </Sheet>
      )}
    </main>
  );
}
