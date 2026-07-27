import Link from "next/link";
import { getToday, walkTargetFor } from "@/lib/queries";
import { sydneyDayOfWeek } from "@/lib/time";
import { dateOnly, shortDate } from "@/lib/time";
import { Fig, fmt } from "@/components/ui";
import { StartSessionButton } from "@/components/StartSessionButton";
import { WalkStrip } from "@/components/WalkStrip";
import { LastSessionCard } from "@/components/LastSessionCard";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const t = await getToday();
  const dow = sydneyDayOfWeek(dateOnly(t.iso));
  const eyebrow = shortDate(t.iso);

  const plannedSets = t.template
    ? t.template.blocks
        .filter((b) => b.kind !== "activation")
        .reduce((sum, b) => sum + b.rounds * b.exercises.length, 0)
    : 0;
  const estMin = Math.round(plannedSets * 2 + (t.template?.stepperMin ?? 0));
  const completed = !!t.session?.completedAt;
  const started = !!t.session?.startedAt && !completed;

  const calTarget = t.target?.calories ?? null;
  const calLeft = calTarget != null ? calTarget - t.caloriesConsumed : null;
  const calPct = calTarget
    ? Math.min(100, Math.round((t.caloriesConsumed / calTarget) * 100))
    : 0;
  const walkTarget = walkTargetFor(t.blockTarget, dow);

  return (
    <div>
      {t.template ? (
        <section className="card mb-4 p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="eyebrow">{eyebrow}</div>
              <h1 className="title mt-1.5 text-2xl">{t.template.name}</h1>
              <div className="mt-1 text-xs font-medium text-[var(--muted)]">
                {t.template.intent === "heavy" ? "Heavy" : "Volume"} ·{" "}
                {t.template.blocks.filter((b) => b.kind !== "activation").length}{" "}
                blocks
                {t.week ? ` · week ${t.week.weekNumber} of 12` : ""}
              </div>
            </div>
            <Link
              href="/dashboard"
              aria-label="Dashboard"
              className="grid h-[30px] w-[30px] place-items-center rounded-full"
              style={{
                background: "linear-gradient(140deg,var(--jade),var(--jade-2))",
                boxShadow: "0 8px 16px -6px rgba(23,186,132,.75)",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#062C20" strokeWidth="2.4" strokeLinecap="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="flex items-start justify-between px-0.5 pb-5 pt-4">
            <Stat value={plannedSets} unit="sets" label="Planned" />
            <Stat value={estMin} unit="min" label="Est. time" />
            <Stat value={t.template.stepperMin} unit="min" label="Stepper" />
          </div>

          <StartSessionButton
            templateId={t.template.id}
            existingSessionId={t.session?.id ?? null}
            completed={completed}
          />
          {completed && (
            <div className="mb-2 text-center text-xs font-semibold text-[var(--jade-2)]">
              Logged today · nice work
            </div>
          )}
          {started && (
            <div className="mb-2 text-center text-xs font-semibold text-[var(--muted)]">
              In progress
            </div>
          )}
        </section>
      ) : (
        <section className="card mb-4 p-6">
          <div className="eyebrow">{eyebrow}</div>
          <h1 className="title mt-1.5 text-2xl">Rest day</h1>
          <p className="mt-1 text-xs font-medium text-[var(--muted)]">
            {dow === 7 ? "Long walk" : "Easy day"} · target {walkTarget} min
          </p>
        </section>
      )}

      <div className="eyebrow mb-2.5">Also today</div>

      <WalkStrip
        iso={t.iso}
        minutes={t.walkMinutes}
        target={walkTarget}
        isLong={dow === 7}
      />

      <Link href="/body#nutrition" className="mb-2.5 flex items-center gap-3 rounded-sm glass p-3.5">
        <IconBox>
          <path d="M12 21c4-3 6-6 6-9a6 6 0 10-12 0c0 3 2 6 6 9z" />
        </IconBox>
        <div className="flex-1">
          <div className="text-[11px] font-bold">Calories</div>
          <div className="text-[10px] font-medium text-[var(--muted)]">
            {calTarget
              ? `${fmt(t.caloriesConsumed)} of ${fmt(calTarget)}`
              : `${fmt(t.caloriesConsumed)} logged`}
          </div>
          {calTarget != null && (
            <div className="track w-full">
              <i style={{ width: `${calPct}%` }} />
            </div>
          )}
        </div>
        {calLeft != null && (
          <Fig className="text-xl" value={fmt(Math.max(0, calLeft))} unit="left" />
        )}
      </Link>

      <Link href="/body" className="mb-4 flex items-center gap-3 rounded-sm glass p-3.5">
        <IconBox>
          <path d="M4 18h16M6 18V9m4 9V5m4 13v-7m4 7v-11" />
        </IconBox>
        <div>
          <div className="text-[11px] font-bold">Bodyweight</div>
          <div className="text-[10px] font-medium text-[var(--muted)]">
            {t.bodyweight7d ? `7-day avg ${t.bodyweight7d}` : "Log to start a trend"}
          </div>
        </div>
        <div className="ml-auto">
          {t.bodyweight != null ? (
            <Fig className="text-xl" value={t.bodyweight} unit="kg" />
          ) : (
            <span className="text-lg text-[var(--muted)]">—</span>
          )}
        </div>
      </Link>

      {t.lastSummary && (
        <>
          <div className="eyebrow mb-2.5">Last session</div>
          <LastSessionCard summary={t.lastSummary} />
        </>
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

function IconBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid h-[30px] w-[30px] flex-none place-items-center rounded-[10px]"
      style={{ background: "var(--jade-wash)", color: "var(--jade-2)" }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        {children}
      </svg>
    </div>
  );
}
