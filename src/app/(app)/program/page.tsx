import { getActiveProgram, currentWeekOf } from "@/lib/queries";
import { prisma } from "@/lib/prisma";
import { isoOf, shortDate, sydneyISODate } from "@/lib/time";
import type { RepScheme } from "@/lib/rep-scheme";

export const dynamic = "force-dynamic";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function ProgramPage() {
  const program = await getActiveProgram();
  if (!program) {
    return (
      <div>
        <h1 className="title mb-4 text-2xl">Program</h1>
        <div className="panel p-6 text-center text-sm text-[var(--ink-2)]">
          No active program. Seed one with <code>npm run seed</code>.
        </div>
      </div>
    );
  }

  const today = sydneyISODate();
  const current = currentWeekOf(program.weeks, today);

  const templates = await prisma.sessionTemplate.findMany({
    where: { programId: program.id },
    orderBy: { order: "asc" },
    include: {
      blocks: {
        orderBy: { order: "asc" },
        include: { exercises: { orderBy: { slot: "asc" }, include: { exercise: true } } },
      },
    },
  });

  return (
    <div>
      <h1 className="title text-2xl">{program.name}</h1>
      <p className="mb-4 mt-1 text-xs font-medium text-[var(--muted)]">
        {shortDate(isoOf(program.startDate))}
        {program.endDate ? ` – ${shortDate(isoOf(program.endDate))}` : ""}
      </p>

      <div className="eyebrow mb-2">12 weeks</div>
      <div className="panel mb-6 overflow-hidden">
        {program.weeks.map((w) => {
          const isNow = current?.id === w.id;
          return (
            <div
              key={w.id}
              className="flex items-center gap-3 border-b border-[rgba(147,169,191,.14)] px-4 py-2.5 last:border-0"
              style={isNow ? { background: "var(--jade-wash)" } : undefined}
            >
              <span className="fig w-8 text-xl" style={isNow ? { color: "var(--jade-2)" } : undefined}>
                {w.weekNumber}
              </span>
              <div className="flex-1">
                <div className="text-[11px] font-bold">
                  {shortDate(isoOf(w.startDate))}
                  <span className="ml-2 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ background: "rgba(147,169,191,.2)", color: "var(--ink-2)" }}>
                    {w.block}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] font-medium leading-snug text-[var(--muted)]">
                  {w.focus}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="eyebrow mb-2">Sessions</div>
      {templates.map((t) => (
        <details key={t.id} className="panel mb-3 overflow-hidden">
          <summary className="flex cursor-pointer items-center justify-between px-4 py-3">
            <div>
              <span className="title text-base">{t.name}</span>
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {DAYS[t.dayOfWeek]} · {t.intent}
              </span>
            </div>
            <span className="text-[var(--muted)]">▾</span>
          </summary>
          <div className="px-4 pb-4">
            {t.blocks.map((b) => {
              const scheme = b.exercises[0]?.repScheme as unknown as RepScheme | { type: string };
              const rounds =
                (scheme as RepScheme)?.rounds?.slice(0, b.rounds) ?? [];
              return (
                <div key={b.id} className="mb-3 last:mb-0">
                  <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[var(--jade-2)]">
                    {b.label} · {b.kind} · {b.rounds} rounds
                  </div>
                  {b.exercises.map((e) => (
                    <div key={e.id} className="text-[12px] font-semibold text-[var(--ink)]">
                      {e.exercise.name}
                      {e.exercise.isUnilateral ? (
                        <span className="ml-1 text-[9px] font-bold uppercase text-[var(--muted)]">
                          · per side
                        </span>
                      ) : null}
                    </div>
                  ))}
                  {rounds.length > 0 && (
                    <div className="mt-1 flex gap-2 text-[10px] tabular-nums text-[var(--muted)]">
                      {rounds.map((r) => (
                        <span key={r.round}>
                          R{r.round} {Math.round(r.loadPct * 100)}% · {r.repMin}–{r.repMax}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
