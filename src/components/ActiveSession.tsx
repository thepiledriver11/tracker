"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  SessionForLogging,
  LoaderBlock,
  LoaderExercise,
} from "@/lib/session-loader";
import { Fig } from "./ui";
import { Stepper } from "./Stepper";
import { RestTimer } from "./RestTimer";
import { enqueue, newId, pendingCount } from "@/lib/offline/queue";
import { flushQueue } from "@/lib/offline/sync";

type Side = "both" | "left" | "right";
type Logged = { round: number; side: Side; weightKg: number; reps: number };

function keyOf(exerciseId: string, round: number, side: Side) {
  return `${exerciseId}:${round}:${side}`;
}

export function ActiveSession({ session }: { session: SessionForLogging }) {
  const router = useRouter();
  const [blockIndex, setBlockIndex] = useState(() => firstIncompleteBlock(session));
  const [logged, setLogged] = useState<Map<string, Logged>>(() => {
    const m = new Map<string, Logged>();
    for (const l of session.logged) {
      m.set(keyOf(l.exerciseId, l.round, l.side as Side), {
        round: l.round,
        side: l.side as Side,
        weightKg: l.weightKg,
        reps: l.reps,
      });
    }
    return m;
  });
  const [logger, setLogger] = useState<null | {
    ex: LoaderExercise;
    block: LoaderBlock;
    round: number;
    weight: number;
    reps: number;
    side: Side;
    toFailure: boolean;
  }>(null);
  const [rest, setRest] = useState<number | null>(null);
  const [pending, setPending] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [extra, setExtra] = useState<LoaderBlock[]>([]);

  const allBlocks = useMemo(() => [...session.blocks, ...extra], [session.blocks, extra]);

  // Gym mode: darken this screen only.
  useEffect(() => {
    if (session.gymMode) document.body.setAttribute("data-gym", "on");
    return () => document.body.removeAttribute("data-gym");
  }, [session.gymMode]);

  // Elapsed clock.
  const [elapsed, setElapsed] = useState("0:00");
  const startRef = useRef<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - startRef.current) / 1000);
      setElapsed(`${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const refreshPending = useCallback(async () => {
    setPending(await pendingCount());
  }, []);
  useEffect(() => {
    refreshPending();
    const onChange = (e: Event) =>
      setPending((e as CustomEvent<number>).detail ?? 0);
    window.addEventListener("queue:changed", onChange);
    return () => window.removeEventListener("queue:changed", onChange);
  }, [refreshPending]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  function rungDone(ex: LoaderExercise, round: number): boolean {
    if (ex.isUnilateral) {
      return (
        logged.has(keyOf(ex.exerciseId, round, "left")) &&
        logged.has(keyOf(ex.exerciseId, round, "right"))
      );
    }
    return logged.has(keyOf(ex.exerciseId, round, "both"));
  }

  function openLogger(ex: LoaderExercise, block: LoaderBlock, round: number) {
    const rung = ex.rungs.find((r) => r.round === round);
    const suggested =
      round === 1 && ex.suggestion && ex.suggestion.reason !== "hold"
        ? ex.suggestion.suggestedKg
        : null;
    const lastForRound = ex.lastSets.find((s) => s.round === round);
    const weight =
      suggested ?? rung?.targetLoad ?? lastForRound?.weightKg ?? 20;
    setLogger({
      ex,
      block,
      round,
      weight,
      reps: rung?.repMin ?? 10,
      side: ex.isUnilateral ? "left" : "both",
      toFailure: rung?.toFailure ?? false,
    });
  }

  async function logSet() {
    if (!logger) return;
    const { ex, block, round, weight, reps, side, toFailure } = logger;
    const payload = {
      id: newId(),
      sessionId: session.id,
      templateExerciseId: ex.templateExerciseId,
      exerciseId: ex.exerciseId,
      round,
      dropIndex: 0,
      weightKg: weight,
      reps,
      side,
      rir: null,
      toFailure,
      loggedAt: new Date().toISOString(),
    };
    await enqueue({ id: payload.id, kind: "set", createdAt: Date.now(), payload });
    setLogged((prev) => {
      const m = new Map(prev);
      m.set(keyOf(ex.exerciseId, round, side), { round, side, weightKg: weight, reps });
      return m;
    });
    flushQueue().then(refreshPending);
    setToast("Set logged");

    // Unilateral: after the left side, swap to right and keep logging.
    if (ex.isUnilateral && side === "left") {
      setLogger({ ...logger, side: "right" });
      return;
    }

    // Auto-start rest after the second exercise of a superset pair.
    const isSecondOfPair = block.kind === "superset" && ex.slot === 2;
    setLogger(null);
    if (isSecondOfPair) setRest(session.restSeconds);
  }

  async function finish(data: {
    stepperMin: number | null;
    sessionRpe: number | null;
    bodyweightKg: number | null;
    notes: string | null;
  }) {
    const payload = { sessionId: session.id, ...data };
    await enqueue({ id: newId(), kind: "finish", createdAt: Date.now(), payload });
    await flushQueue();
    router.push("/today");
    router.refresh();
  }

  const block = allBlocks[blockIndex];

  return (
    <div className="gym mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 pb-6 pt-12">
      {/* header */}
      <div className="mb-3 flex items-center justify-between">
        <button
          aria-label="Back"
          onClick={() => router.push("/today")}
          className="grid h-[26px] w-[26px] place-items-center"
          style={{ color: "var(--muted)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="text-center">
          <div className="title text-lg">{session.name}</div>
          <div className="text-[11.5px] font-medium text-[var(--muted)]">
            Block {block ? blockIndex + 1 : "–"} of {allBlocks.length}
          </div>
        </div>
        <Fig className="text-lg" value={elapsed} />
      </div>

      {pending > 0 && (
        <div className="mb-2 self-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ background: "var(--jade-wash)", color: "var(--jade-2)" }}>
          {pending} set{pending > 1 ? "s" : ""} pending sync
        </div>
      )}

      {/* block content */}
      <div className="flex-1">
        {block ? (
          block.kind === "activation" ? (
            <ActivationBlock block={block} />
          ) : (
            block.exercises.map((ex, i) => (
              <ExerciseLadder
                key={ex.templateExerciseId ?? `${ex.exerciseId}-${i}`}
                block={block}
                ex={ex}
                dimmed={block.kind === "superset" && block.exercises.length > 1 && i > 0 && !anyLoggedInBlock(block, logged)}
                rungDone={rungDone}
                onTap={(round) => openLogger(ex, block, round)}
              />
            ))
          )
        ) : null}
      </div>

      {/* block nav */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <button
          className="pill flex-1 disabled:opacity-40"
          disabled={blockIndex === 0}
          onClick={() => setBlockIndex((i) => Math.max(0, i - 1))}
        >
          ← Prev
        </button>
        {blockIndex < allBlocks.length - 1 ? (
          <button className="pill pill-jade flex-1" onClick={() => setBlockIndex((i) => i + 1)}>
            Next block →
          </button>
        ) : (
          <button className="pill pill-jade flex-1" onClick={() => setFinishing(true)}>
            Finish session
          </button>
        )}
      </div>

      <AddExercise onAdd={(b) => setExtra((x) => [...x, b])} />

      {rest !== null && (
        <RestTimer
          seconds={rest}
          onDone={() => setRest(null)}
          onSkip={() => setRest(null)}
        />
      )}

      {logger && (
        <LoggerSheet
          logger={logger}
          onChange={setLogger}
          onLog={logSet}
          onClose={() => setLogger(null)}
        />
      )}

      {finishing && (
        <FinishSheet
          defaultStepper={session.defaultStepperMin ?? 8}
          onCancel={() => setFinishing(false)}
          onFinish={finish}
        />
      )}

      {toast && (
        <div className="fixed inset-x-0 bottom-24 z-50 mx-auto w-fit rounded-full px-4 py-2 text-xs font-semibold" style={{ background: "linear-gradient(140deg,var(--jade),var(--jade-2))", color: "#062C20", boxShadow: "0 10px 20px -8px rgba(23,186,132,.7)" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

function ExerciseLadder({
  block,
  ex,
  dimmed,
  rungDone,
  onTap,
}: {
  block: LoaderBlock;
  ex: LoaderExercise;
  dimmed: boolean;
  rungDone: (ex: LoaderExercise, round: number) => boolean;
  onTap: (round: number) => void;
}) {
  const widths = ["100%", "90%", "80%", "72%"];
  const firstUndone = ex.rungs.find((r) => !rungDone(ex, r.round))?.round;
  return (
    <div className="mb-4" style={{ opacity: dimmed ? 0.6 : 1 }}>
      <div className="mb-2 flex items-baseline justify-between">
        <b className="title text-sm">{ex.name}</b>
        <em className="text-[9px] font-bold uppercase not-italic tracking-widest text-[var(--muted)]">
          {block.label}
          {block.exercises.length > 1 ? ex.slot : ""}
        </em>
      </div>
      {ex.suggestion && ex.suggestion.reason !== "hold" && (
        <div className="mb-2 rounded-sm px-3 py-1.5 text-[11px] font-semibold" style={{ background: "var(--jade-wash)", color: "var(--jade-2)" }}>
          Last {ex.suggestion.last.weightKg}kg × {ex.suggestion.last.reps} · try {ex.suggestion.suggestedKg}kg
        </div>
      )}
      {ex.rungs.map((r, i) => {
        const done = rungDone(ex, r.round);
        const now = !done && r.round === firstUndone;
        return (
          <button
            key={r.round}
            onClick={() => onTap(r.round)}
            className="glass relative mb-2 flex h-[56px] items-center justify-between rounded-sm px-4 active:scale-[.985]"
            style={{
              width: widths[i],
              marginLeft: `calc(100% - ${widths[i]})`,
              transition: "transform .18s ease",
              ...(done
                ? { background: "linear-gradient(140deg,rgba(67,223,162,.24),rgba(23,186,132,.1))" }
                : {}),
              ...(now
                ? { boxShadow: "0 0 0 1.5px var(--jade), 0 14px 26px -14px rgba(23,186,132,.75), var(--inner)" }
                : {}),
            }}
          >
            <span className="w-9 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
              R{r.round}
            </span>
            <Fig
              className="text-xl"
              style={done ? { color: "var(--jade-2)" } : undefined}
              value={r.targetLoad ?? "—"}
              unit="kg"
            />
            <span className="ml-auto text-[10.5px] font-semibold text-[var(--muted)]">
              {r.toFailure ? "to failure" : `${r.repMin}–${r.repMax}`}
            </span>
            <span
              className="ml-3 grid h-5 w-5 flex-none place-items-center rounded-full"
              style={
                done
                  ? { background: "linear-gradient(140deg,var(--jade),var(--jade-2))" }
                  : { border: "1.5px solid rgba(147,169,191,.5)" }
              }
            >
              {done && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#062C20" strokeWidth="3.4" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
          </button>
        );
      })}
      {ex.lastSets.length > 0 && (
        <div className="mt-1 text-center text-[10px] font-semibold text-[var(--muted)]">
          Last · {ex.lastSets.map((s) => `${s.weightKg}×${s.reps}`).join("  ·  ")}
        </div>
      )}
    </div>
  );
}

function ActivationBlock({ block }: { block: LoaderBlock }) {
  return (
    <div className="mb-4">
      <div className="eyebrow mb-2">Activation · untracked</div>
      {block.exercises.map((ex) => (
        <div key={ex.exerciseId} className="glass mb-2 flex items-center justify-between rounded-sm px-4 py-3">
          <b className="title text-sm">{ex.name}</b>
          <span className="text-[11px] font-semibold text-[var(--muted)]">
            {block.rounds} × 20
          </span>
        </div>
      ))}
    </div>
  );
}

function LoggerSheet({
  logger,
  onChange,
  onLog,
  onClose,
}: {
  logger: NonNullable<Parameters<typeof LoggerSheetInner>[0]["logger"]>;
  onChange: (l: typeof logger) => void;
  onLog: () => void;
  onClose: () => void;
}) {
  return <LoggerSheetInner logger={logger} onChange={onChange} onLog={onLog} onClose={onClose} />;
}

function LoggerSheetInner({
  logger,
  onChange,
  onLog,
  onClose,
}: {
  logger: {
    ex: LoaderExercise;
    block: LoaderBlock;
    round: number;
    weight: number;
    reps: number;
    side: Side;
    toFailure: boolean;
  };
  onChange: (l: typeof logger) => void;
  onLog: () => void;
  onClose: () => void;
}) {
  const { ex, round, weight, reps, side, toFailure } = logger;
  const last = ex.lastSets.find((s) => s.round === round);
  return (
    <Sheet onClose={onClose}>
      <div className="mb-1 flex items-baseline justify-between">
        <b className="title text-base">{ex.name}</b>
        <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          Round {round}
        </span>
      </div>
      {ex.isUnilateral && (
        <div className="mb-3 flex gap-2">
          {(["left", "right"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onChange({ ...logger, side: s })}
              className="pill flex-1"
              style={side === s ? { background: "linear-gradient(140deg,var(--jade),var(--jade-2))", color: "#062C20" } : undefined}
            >
              {s === "left" ? "Left" : "Right"}
            </button>
          ))}
        </div>
      )}
      <Stepper
        value={weight}
        onChange={(v) => onChange({ ...logger, weight: v })}
        step={2.5}
        fineStep={1.25}
        unit="kg"
        label={`Round ${round} load`}
      />
      <Stepper
        value={reps}
        onChange={(v) => onChange({ ...logger, reps: v })}
        step={1}
        unit="reps"
        label="Reps"
        size="md"
      />
      {last && (
        <div className="mt-1 text-center text-[10px] font-semibold text-[var(--muted)]">
          Last time · {last.weightKg} kg × {last.reps}
        </div>
      )}
      {round === 3 && (
        <label className="mt-3 flex items-center justify-center gap-2 text-xs font-semibold text-[var(--ink-2)]">
          <input
            type="checkbox"
            checked={toFailure}
            onChange={(e) => onChange({ ...logger, toFailure: e.target.checked })}
          />
          To failure
        </label>
      )}
      <button className="pill pill-jade mt-4 w-full" style={{ padding: 14 }} onClick={onLog}>
        Log set{ex.isUnilateral ? ` · ${side}` : ""}
      </button>
    </Sheet>
  );
}

function FinishSheet({
  defaultStepper,
  onCancel,
  onFinish,
}: {
  defaultStepper: number;
  onCancel: () => void;
  onFinish: (d: {
    stepperMin: number | null;
    sessionRpe: number | null;
    bodyweightKg: number | null;
    notes: string | null;
  }) => void;
}) {
  const [stepper, setStepper] = useState(defaultStepper);
  const [rpe, setRpe] = useState<number | null>(null);
  const [bw, setBw] = useState(0);
  const [notes, setNotes] = useState("");
  return (
    <Sheet onClose={onCancel}>
      <div className="title mb-3 text-base">Finish session</div>
      <Stepper value={stepper} onChange={setStepper} step={1} unit="min" label="Stepper minutes" size="md" />
      <div className="mb-1 mt-3 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
        Session RPE
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            onClick={() => setRpe(n)}
            className="pill h-9 w-9 !p-0"
            style={rpe === n ? { background: "linear-gradient(140deg,var(--jade),var(--jade-2))", color: "#062C20" } : undefined}
          >
            {n}
          </button>
        ))}
      </div>
      <Stepper value={bw} onChange={setBw} step={0.1} unit="kg" label="Bodyweight (optional)" size="md" />
      <textarea
        placeholder="Note (optional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="mt-3 w-full rounded-sm p-3 text-base"
        style={{ background: "rgba(255,255,255,.6)", boxShadow: "var(--inner)", fontSize: 16 }}
        rows={2}
      />
      <button
        className="pill pill-jade mt-4 w-full"
        style={{ padding: 14 }}
        onClick={() =>
          onFinish({
            stepperMin: stepper || null,
            sessionRpe: rpe,
            bodyweightKg: bw > 0 ? bw : null,
            notes: notes.trim() || null,
          })
        }
      >
        Finish
      </button>
    </Sheet>
  );
}

function AddExercise({ onAdd }: { onAdd: (b: LoaderBlock) => void }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<
    { id: string; name: string; isUnilateral: boolean }[]
  >([]);
  const [q, setQ] = useState("");

  async function load() {
    setOpen(true);
    if (list.length === 0) {
      const res = await fetch("/api/exercises");
      const data = await res.json();
      setList(data.exercises ?? []);
    }
  }
  function pick(e: { id: string; name: string; isUnilateral: boolean }) {
    onAdd({
      id: `adhoc-${e.id}-${Date.now()}`,
      label: "Extra",
      kind: "single",
      rounds: 3,
      exercises: [
        {
          templateExerciseId: null,
          exerciseId: e.id,
          name: e.name,
          isUnilateral: e.isUnilateral,
          slot: 1,
          rungs: [1, 2, 3].map((round) => ({
            round,
            targetLoad: null,
            repMin: 8,
            repMax: 12,
            toFailure: round === 3,
            rir: null,
          })),
          lastSets: [],
          suggestion: null,
        },
      ],
    });
    setOpen(false);
  }
  const filtered = list.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <button className="pill mb-3 w-full" onClick={load}>
        + Add exercise
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)}>
          <input
            autoFocus
            placeholder="Search exercises"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mb-3 w-full rounded-sm p-3"
            style={{ background: "rgba(255,255,255,.6)", boxShadow: "var(--inner)", fontSize: 16 }}
          />
          <div className="max-h-[50vh] overflow-y-auto">
            {filtered.map((e) => (
              <button key={e.id} onClick={() => pick(e)} className="glass mb-2 flex w-full items-center rounded-sm px-4 py-3 text-left text-sm font-semibold">
                {e.name}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}

function Sheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative mx-auto w-full max-w-lg rounded-t-[34px] p-6 pb-8"
        onClick={(e) => e.stopPropagation()}
        style={{
          background:
            "linear-gradient(168deg,rgba(255,255,255,.98),rgba(238,246,252,.94))",
          boxShadow: "0 -24px 44px -22px rgba(28,62,96,.42)",
          maxHeight: "88vh",
          overflowY: "auto",
        }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[rgba(147,169,191,.4)]" />
        {children}
      </div>
    </div>
  );
}

/* ---------- helpers ---------- */

function anyLoggedInBlock(block: LoaderBlock, logged: Map<string, Logged>) {
  for (const ex of block.exercises) {
    for (const r of ex.rungs) {
      if (
        logged.has(keyOf(ex.exerciseId, r.round, "both")) ||
        logged.has(keyOf(ex.exerciseId, r.round, "left")) ||
        logged.has(keyOf(ex.exerciseId, r.round, "right"))
      )
        return true;
    }
  }
  return false;
}

function firstIncompleteBlock(session: SessionForLogging): number {
  return 0;
}
