"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { BodyData } from "@/lib/body";
import { Fig, fmt } from "./ui";
import { TrendLine, WeeklyCaloriesChart } from "./charts";

const MEASUREMENT_FIELDS: [keyof MForm, string][] = [
  ["weightKg", "Weight kg"],
  ["bodyFatPct", "Body fat %"],
  ["neckCm", "Neck cm"],
  ["chestCm", "Chest cm"],
  ["waistCm", "Waist cm"],
  ["hipsCm", "Hips cm"],
  ["armLeftCm", "Arm L cm"],
  ["armRightCm", "Arm R cm"],
  ["thighLeftCm", "Thigh L cm"],
  ["thighRightCm", "Thigh R cm"],
  ["calfCm", "Calf cm"],
];

type MForm = Record<
  | "weightKg" | "bodyFatPct" | "neckCm" | "chestCm" | "waistCm" | "hipsCm"
  | "armLeftCm" | "armRightCm" | "thighLeftCm" | "thighRightCm" | "calfCm",
  string
>;

export function BodyClient({ data, initialTab }: { data: BodyData; initialTab: "measurements" | "nutrition" }) {
  const [tab, setTab] = useState(initialTab);
  return (
    <div>
      <h1 className="title mb-3 text-2xl">Body</h1>
      <div className="mb-4 flex gap-2">
        {(["measurements", "nutrition"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="pill flex-1 capitalize"
            style={tab === t ? { background: "linear-gradient(140deg,var(--jade),var(--jade-2))", color: "#062C20" } : undefined}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "measurements" ? <Measurements data={data} /> : <Nutrition data={data} />}
    </div>
  );
}

/* ---------- measurements ---------- */

function Measurements({ data }: { data: BodyData }) {
  const router = useRouter();
  const [form, setForm] = useState<Partial<MForm>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const body: Record<string, number> = {};
    for (const [k, v] of Object.entries(form)) {
      const n = parseFloat(v as string);
      if (!Number.isNaN(n)) body[k] = n;
    }
    try {
      await fetch("/api/measurements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setForm({});
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const bw = data.bwRolling.filter((d) => d.bw != null);
  const waist = data.measurementSeries.filter((d) => d.waistCm != null);
  const arm = data.measurementSeries.filter((d) => d.armLeftCm != null);

  return (
    <div>
      <section className="panel mb-4 p-4">
        <div className="eyebrow mb-3">Log today · all optional</div>
        <div className="grid grid-cols-2 gap-2">
          {MEASUREMENT_FIELDS.map(([key, label]) => (
            <label key={key} className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              {label}
              <input
                inputMode="decimal"
                value={form[key] ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="mt-1 w-full rounded-sm p-2.5"
                style={{ background: "rgba(255,255,255,.65)", boxShadow: "var(--inner)", fontSize: 16 }}
              />
            </label>
          ))}
        </div>
        <button className="pill pill-jade mt-3 w-full disabled:opacity-60" style={{ padding: 13 }} onClick={save} disabled={busy}>
          {busy ? "…" : "Save measurement"}
        </button>
      </section>

      {bw.length > 1 && (
        <Trend title="Bodyweight · 7-day average">
          <TrendLine data={bw as never} dataKey="bw" />
        </Trend>
      )}
      {waist.length > 1 && (
        <Trend title="Waist">
          <TrendLine data={waist as never} dataKey="waistCm" />
        </Trend>
      )}
      {arm.length > 1 && (
        <Trend title="Arm (left)">
          <TrendLine data={arm as never} dataKey="armLeftCm" />
        </Trend>
      )}
      {bw.length <= 1 && waist.length <= 1 && (
        <div className="panel p-6 text-center text-sm text-[var(--ink-2)]">
          Log a few days to see trends.
        </div>
      )}
    </div>
  );
}

function Trend({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="panel mb-3 p-4">
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </section>
  );
}

/* ---------- nutrition ---------- */

function Nutrition({ data }: { data: BodyData }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [cals, setCals] = useState("");
  const [protein, setProtein] = useState("");
  const [busy, setBusy] = useState(false);

  const target = data.target?.calories ?? null;
  const consumed = data.totals.calories;
  const pct = target ? Math.min(100, Math.round((consumed / target) * 100)) : 0;
  const circ = 427;

  async function add(entry: { label: string; calories: number; proteinG?: number | null; saveShortcut?: boolean }) {
    setBusy(true);
    try {
      await fetch("/api/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal: "snack", ...entry }),
      });
      setLabel(""); setCals(""); setProtein("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    await fetch("/api/nutrition", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  return (
    <div>
      <section className="panel mb-4 flex flex-col items-center p-5">
        <div className="relative grid place-items-center py-2">
          <svg width="168" height="168" viewBox="0 0 168 168">
            <circle cx="84" cy="84" r="68" fill="none" stroke="#93A9BF" strokeOpacity=".16" strokeWidth="13" />
            <circle
              cx="84" cy="84" r="68" fill="none" stroke="url(#g)" strokeWidth="13" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ - (circ * pct) / 100}
              transform="rotate(-90 84 84)"
            />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8FD8F0" />
                <stop offset="100%" stopColor="#17BA84" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute text-center">
            <Fig className="text-4xl" value={fmt(consumed)} unit="kcal" />
            <div className="mt-1 text-[9px] font-bold uppercase tracking-widest text-[var(--muted)]">
              {target ? `of ${fmt(target)}` : "no target set"}
            </div>
          </div>
        </div>
        <div className="mt-2 flex w-full justify-around text-center">
          <MacroFig value={data.totals.protein} label="Protein" targetV={data.target?.proteinG ?? null} />
          <MacroFig value={data.totals.carbs} label="Carbs" />
          <MacroFig value={data.totals.fat} label="Fat" />
        </div>
      </section>

      {data.shortcuts.length > 0 && (
        <>
          <div className="eyebrow mb-2">Quick add</div>
          <div className="mb-4 flex flex-wrap gap-2">
            {data.shortcuts.map((s) => (
              <button
                key={s.id}
                disabled={busy}
                onClick={() => add({ label: s.label, calories: s.calories, proteinG: s.proteinG })}
                className="pill"
                style={{ padding: "8px 13px", fontSize: 10.5 }}
              >
                {s.label} · {s.calories}
              </button>
            ))}
          </div>
        </>
      )}

      <section className="panel mb-4 p-4">
        <div className="eyebrow mb-2">Add food</div>
        <input
          placeholder="Label (e.g. chicken bowl)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          className="mb-2 w-full rounded-sm p-2.5"
          style={{ background: "rgba(255,255,255,.65)", boxShadow: "var(--inner)", fontSize: 16 }}
        />
        <div className="mb-2 flex gap-2">
          <input placeholder="kcal" inputMode="numeric" value={cals} onChange={(e) => setCals(e.target.value)} className="w-full rounded-sm p-2.5" style={{ background: "rgba(255,255,255,.65)", boxShadow: "var(--inner)", fontSize: 16 }} />
          <input placeholder="protein g" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} className="w-full rounded-sm p-2.5" style={{ background: "rgba(255,255,255,.65)", boxShadow: "var(--inner)", fontSize: 16 }} />
        </div>
        <button
          className="pill pill-jade w-full disabled:opacity-60"
          style={{ padding: 13 }}
          disabled={busy || !label || !cals}
          onClick={() =>
            add({
              label,
              calories: parseInt(cals, 10) || 0,
              proteinG: protein ? parseInt(protein, 10) : null,
              saveShortcut: true,
            })
          }
        >
          {busy ? "…" : "Add + save as shortcut"}
        </button>
      </section>

      {data.todayEntries.length > 0 && (
        <>
          <div className="eyebrow mb-2">Today</div>
          <div className="panel mb-4 overflow-hidden">
            {data.todayEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between border-b border-[rgba(147,169,191,.14)] px-4 py-2.5 last:border-0">
                <div>
                  <div className="text-[11px] font-bold">{e.label}</div>
                  <div className="text-[10px] font-medium text-[var(--muted)]">
                    {e.calories} kcal{e.proteinG ? ` · ${e.proteinG}g protein` : ""}
                  </div>
                </div>
                <button onClick={() => remove(e.id)} className="text-[var(--muted)]" aria-label="Delete">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="eyebrow mb-2">This week</div>
      <section className="panel p-4">
        <WeeklyCaloriesChart data={data.week} target={target ?? 0} />
        <div className="mt-2 text-center text-[10px] font-semibold text-[var(--muted)]">
          Avg protein {data.avgProtein} g/day
        </div>
      </section>
    </div>
  );
}

function MacroFig({ value, label, targetV }: { value: number; label: string; targetV?: number | null }) {
  return (
    <div>
      <Fig className="text-xl" value={value} unit="g" />
      <div className="mt-1 text-[8.5px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      {targetV ? (
        <div className="track mx-auto mt-1 w-12">
          <i style={{ width: `${Math.min(100, Math.round((value / targetV) * 100))}%` }} />
        </div>
      ) : null}
    </div>
  );
}
