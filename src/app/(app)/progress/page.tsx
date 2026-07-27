import { prisma } from "@/lib/prisma";
import { exerciseSeries, prBoard } from "@/lib/metrics";
import { shortDate } from "@/lib/time";
import { ExercisePicker } from "@/components/ExercisePicker";
import { ExerciseProgressChart } from "@/components/charts";
import { Fig } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ exerciseId?: string }>;
}) {
  const { exerciseId } = await searchParams;
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const series = exerciseId ? await exerciseSeries(exerciseId) : [];
  const board = await prBoard();
  const selected = exercises.find((e) => e.id === exerciseId);

  const latest = series[series.length - 1];
  const first = series.find((s) => s.r1Weight != null);
  const pctSince =
    latest?.r1Weight && first?.r1Weight
      ? Math.round(((latest.r1Weight - first.r1Weight) / first.r1Weight) * 100)
      : null;

  return (
    <div>
      <h1 className="title mb-4 text-2xl">Progress</h1>

      <ExercisePicker exercises={exercises} selectedId={exerciseId} />

      {selected && series.length > 0 ? (
        <>
          <div className="flex items-start justify-between px-1 pb-3">
            <Stat value={latest?.r1Weight ?? "—"} unit="kg" label="Round 1" />
            <Stat value={latest?.e1rm ?? "—"} unit="e1rm" label="Estimated" />
            <Stat
              value={pctSince != null ? `${pctSince > 0 ? "+" : ""}${pctSince}` : "—"}
              unit="%"
              label="Since start"
            />
          </div>
          <section className="panel mb-4 p-4">
            <ExerciseProgressChart
              data={series.map((s) => ({
                date: s.date,
                r1Weight: s.r1Weight,
                e1rm: s.e1rm,
              }))}
            />
          </section>

          <div className="eyebrow mb-2">Every session</div>
          <div className="panel overflow-hidden">
            {series
              .slice()
              .reverse()
              .map((s) => (
                <div
                  key={s.date}
                  className="flex items-center justify-between border-b border-[rgba(147,169,191,.14)] px-4 py-2.5 last:border-0"
                >
                  <div>
                    <div className="text-[11px] font-bold">{shortDate(s.date)}</div>
                    <div className="text-[10px] font-medium tabular-nums text-[var(--muted)]">
                      {s.rounds.map((r) => `${r.weightKg}×${r.reps}`).join("  ·  ")}
                    </div>
                  </div>
                  <Fig className="text-base" value={s.e1rm} unit="e1rm" />
                </div>
              ))}
          </div>
        </>
      ) : selected ? (
        <div className="panel p-6 text-center text-sm text-[var(--ink-2)]">
          No sessions logged for {selected.name} yet.
        </div>
      ) : null}

      <div className="eyebrow mb-2 mt-6">PR board</div>
      {board.length === 0 ? (
        <div className="panel p-6 text-center text-sm text-[var(--ink-2)]">
          Personal records show up here once you start logging.
        </div>
      ) : (
        <div className="panel overflow-hidden">
          {board.map((pr) => (
            <div
              key={pr.exerciseId}
              className="flex items-center justify-between border-b border-[rgba(147,169,191,.14)] px-4 py-2.5 last:border-0"
            >
              <div>
                <div className="text-[11px] font-bold">{pr.name}</div>
                <div className="text-[10px] font-medium text-[var(--muted)]">
                  best {Math.round(pr.bestWeight)}kg · {shortDate(pr.bestE1RMDate)}
                </div>
              </div>
              <Fig className="text-base" value={Math.round(pr.bestE1RM)} unit="e1rm" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  value,
  unit,
  label,
}: {
  value: React.ReactNode;
  unit: string;
  label: string;
}) {
  return (
    <div className="flex-1 text-center">
      <Fig className="text-4xl" value={value} unit={unit} />
      <div className="mt-2 text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
    </div>
  );
}
