import Link from "next/link";
import { dashboardData } from "@/lib/dashboard";
import { walkTargetFor } from "@/lib/queries";
import {
  TonnageChart,
  E1rmIndexChart,
  BwCalsChart,
  WalkChart,
} from "@/components/charts";

export const dynamic = "force-dynamic";

const STATE_COLOR = [
  "rgba(147,169,191,.18)", // nothing
  "linear-gradient(140deg,var(--jade),var(--jade-2))", // session
  "rgba(67,223,162,.4)", // walk
  "linear-gradient(140deg,var(--jade),var(--jade-2))", // both
];

export default async function DashboardPage() {
  const d = await dashboardData();

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Link href="/today" aria-label="Back" className="text-[var(--muted)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="title text-2xl">Dashboard</h1>
      </div>

      {!d.hasData && (
        <div className="panel mb-4 p-6 text-center text-sm text-[var(--ink-2)]">
          Nothing logged yet. The charts fill in as you complete sessions, walks
          and measurements.
        </div>
      )}

      <Section title="Adherence">
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5 pl-8 text-[8px] font-bold uppercase text-[var(--muted)]">
            {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
              <span key={i} className="w-5 text-center">{day}</span>
            ))}
          </div>
          {d.heatmap.map((wk) => (
            <div key={wk.week} className="flex items-center gap-1.5">
              <span className="w-6 text-[8px] font-bold text-[var(--muted)]">
                W{wk.week}
              </span>
              {wk.days.map((day) => (
                <span
                  key={day.iso}
                  title={day.iso}
                  className="h-5 w-5 rounded-[6px]"
                  style={{ background: STATE_COLOR[day.state] }}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-[9px] font-semibold text-[var(--muted)]">
          <Legend c={STATE_COLOR[1]} label="Session" />
          <Legend c={STATE_COLOR[2]} label="Walk" />
        </div>
      </Section>

      <Section title="Bodyweight vs calories · 7-day avg">
        <BwCalsChart data={d.bwVsCals} />
      </Section>

      <Section title="Weekly tonnage">
        <TonnageChart data={d.tonnageSeries} />
      </Section>

      <Section title="e1RM index · six main lifts">
        <E1rmIndexChart data={d.e1rmIndex} />
      </Section>

      <Section title="Walk minutes per week">
        <WalkChart data={d.walkSeries} target={walkTargetFor("foundation", 1)} />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mb-4 p-5">
      <div className="eyebrow mb-3">{title}</div>
      {children}
    </section>
  );
}

function Legend({ c, label }: { c: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-3 w-3 rounded-[4px]" style={{ background: c }} />
      {label}
    </span>
  );
}
