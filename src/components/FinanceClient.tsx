"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FinanceData } from "@/lib/finance";
import { prettyMonth } from "@/lib/finance";
import { Fig, MoneyFig, fmtMoney } from "./ui";

export function FinanceClient({ data }: { data: FinanceData }) {
  return (
    <div>
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="eyebrow">The 2028 home</div>
          <h1 className="title text-2xl">Finance</h1>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            As of
          </div>
          <div className="text-[13px] font-bold">{prettyMonth(data.asOfMonth)}</div>
        </div>
      </div>

      <SavingsHero data={data} />
      <PurchaseCard data={data} />
      <MortgageCard data={data} />
      <MilestonesCard data={data} />
      <Assumptions data={data} />
    </div>
  );
}

/* ---------- savings hero ---------- */

function SavingsHero({ data }: { data: FinanceData }) {
  const router = useRouter();
  const s = data.savings;
  const [value, setValue] = useState(String(s.currentBalance || ""));
  const [busy, setBusy] = useState(false);

  async function update() {
    const n = parseInt(value.replace(/[^\d]/g, ""), 10);
    if (Number.isNaN(n)) return;
    setBusy(true);
    try {
      await fetch("/api/finance/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balance: n }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const planPct = Math.min(100, (s.plannedBalanceNow / s.totalTarget) * 100);

  return (
    <section className="card mb-4 p-6">
      <div className="eyebrow mb-1">Deposit savings</div>
      <div className="flex items-end justify-between">
        <MoneyFig value={s.currentBalance} className="text-5xl" />
        <div className="pb-1 text-right">
          <div className="text-[11px] font-bold text-[var(--muted)]">
            of {fmtMoney(s.totalTarget)}
          </div>
          <div className="fig text-xl" style={{ color: "var(--jade-2)" }}>
            {s.progressPct}
            <span className="unit">%</span>
          </div>
        </div>
      </div>

      {/* progress with a plan marker */}
      <div className="relative mt-4 h-2.5 overflow-visible rounded-full" style={{ background: "rgba(147,169,191,.28)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${s.progressPct}%`, background: "linear-gradient(90deg,var(--jade),var(--jade-2))" }}
        />
        <div
          className="absolute -top-1 h-4 w-0.5 rounded"
          style={{ left: `${planPct}%`, background: "var(--ink-2)" }}
          title="On-plan position"
        />
      </div>
      <div className="mt-2 flex items-center justify-between">
        <VarianceChip ahead={s.ahead} amount={s.variance} months={s.monthsVariance} />
        <div className="text-right text-[11px] font-semibold text-[var(--muted)]">
          {fmtMoney(s.monthlyTarget)}/mo target
        </div>
      </div>

      {/* projection */}
      <div className="mt-3 flex items-center gap-2 rounded-sm px-3 py-2.5" style={{ background: s.onTrack === false ? "rgba(255,176,103,.16)" : "var(--jade-wash)" }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={s.onTrack === false ? "var(--amber)" : "var(--jade-2)"} strokeWidth="2" strokeLinecap="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
        </svg>
        <span className="text-[11.5px] font-semibold" style={{ color: s.onTrack === false ? "#B5701F" : "var(--jade-2)" }}>
          {s.projectedFinishMonth
            ? `Projected finish ${prettyMonth(s.projectedFinishMonth)}`
            : "Enter a balance to project a finish date"}
          {s.onTrack != null && s.projectedFinishMonth
            ? ` · target ${prettyMonth(s.planFinishMonth)}`
            : ""}
        </span>
      </div>

      {/* monthly input */}
      <div className="mt-4">
        <label className="eyebrow">Update this month&apos;s balance</label>
        <div className="mt-1.5 flex gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">$</span>
            <input
              inputMode="numeric"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="w-full rounded-sm py-3 pl-7 pr-3"
              style={{ background: "rgba(255,255,255,.7)", boxShadow: "var(--inner)", fontSize: 16 }}
            />
          </div>
          <button className="pill pill-jade px-5 disabled:opacity-60" onClick={update} disabled={busy}>
            {busy ? "…" : "Update"}
          </button>
        </div>
      </div>
    </section>
  );
}

function VarianceChip({ ahead, amount, months }: { ahead: boolean; amount: number; months: number }) {
  const abs = Math.abs(amount);
  const absM = Math.abs(months);
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
      style={{
        background: ahead ? "var(--jade-wash)" : "rgba(255,176,103,.18)",
        color: ahead ? "var(--jade-2)" : "#B5701F",
      }}
    >
      {ahead ? "▲" : "▼"} {fmtMoney(abs)} {ahead ? "ahead" : "behind"}
      {absM >= 0.1 ? ` · ${absM}mo` : ""}
    </span>
  );
}

/* ---------- purchase summary ---------- */

function PurchaseCard({ data }: { data: FinanceData }) {
  const p = data.purchase;
  return (
    <section className="panel mb-4 p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="eyebrow">Purchase summary</div>
        <div className="text-[11px] font-bold text-[var(--muted)]">
          Target {prettyMonth(p.targetDate)}
        </div>
      </div>

      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
            Target purchase price
          </div>
          <MoneyFig value={p.price} className="text-4xl" />
        </div>
      </div>

      {p.equity == null && (
        <div className="mb-3 rounded-sm px-3 py-2 text-[11px] font-semibold" style={{ background: "rgba(255,176,103,.16)", color: "#B5701F" }}>
          Set your current home value in Assumptions to include equity in the deposit.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Cell label="Deposit available" value={fmtMoney(p.deposit)} sub={p.equity != null ? `${fmtMoney(p.equity)} equity + savings` : "savings only"} accent />
        <Cell label="LVR" value={`${Math.round(p.lvr * 100)}%`} sub={`target ${Math.round(p.targetLvr * 100)}%`} />
        <Cell label="Estimated loan" value={fmtMoney(p.loan)} sub={`at completion ${fmtMoney(p.loanAtTarget, true)}`} />
        <Cell label={`Repayment @ ${Math.round(p.loanRate * 100)}%`} value={`${fmtMoney(p.repayment)}/mo`} sub={`${fmtMoney(p.repaymentAtTarget)}/mo at target`} />
      </div>
    </section>
  );
}

function Cell({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-sm glass p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="fig mt-1 text-2xl" style={accent ? { color: "var(--jade-2)" } : undefined}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[9.5px] font-medium text-[var(--muted)]">{sub}</div>}
    </div>
  );
}

/* ---------- mortgage ---------- */

function MortgageCard({ data }: { data: FinanceData }) {
  const m = data.mortgage;
  return (
    <section className="panel mb-4 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="eyebrow">Current mortgage</div>
        <div className="text-[11px] font-bold text-[var(--muted)]">
          −{fmtMoney(m.monthlyReduction)}/mo
        </div>
      </div>
      <div className="flex items-end justify-between">
        <MoneyFig value={m.remaining} className="text-4xl" />
        <div className="pb-1 text-right text-[11px] font-semibold text-[var(--muted)]">
          from {fmtMoney(m.start)}
        </div>
      </div>
      <div className="track mt-3 !h-2.5">
        <i style={{ width: `${m.progressPct}%` }} />
      </div>
      <div className="mt-1.5 text-[10px] font-semibold text-[var(--muted)]">
        {fmtMoney(m.paid)} paid down · {m.progressPct}%
      </div>
    </section>
  );
}

/* ---------- milestones ---------- */

function MilestonesCard({ data }: { data: FinanceData }) {
  const router = useRouter();
  const i = data.income;
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function toggle(id: string, achieved: boolean) {
    setPendingId(id);
    try {
      await fetch("/api/finance/milestone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, achieved }),
      });
      router.refresh();
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section className="panel mb-4 p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="eyebrow">Household income</div>
        <div className="text-[11px] font-bold text-[var(--muted)]">
          {i.achievedCount}/{i.total} milestones
        </div>
      </div>
      <div className="flex items-end justify-between">
        <MoneyFig value={i.current} className="text-3xl" />
        <div className="pb-1 text-right text-[11px] font-semibold text-[var(--muted)]">
          target {fmtMoney(i.target)}
        </div>
      </div>
      <div className="track mt-3 !h-2.5">
        <i style={{ width: `${i.progressPct}%` }} />
      </div>

      <div className="mt-4 space-y-2">
        {data.milestones.map((m) => (
          <button
            key={m.id}
            onClick={() => toggle(m.id, !m.achieved)}
            disabled={pendingId === m.id}
            className="glass flex w-full items-center gap-3 rounded-sm px-3.5 py-3 text-left"
            style={m.achieved ? { background: "linear-gradient(140deg,rgba(67,223,162,.22),rgba(23,186,132,.08))" } : undefined}
          >
            <span
              className="grid h-6 w-6 flex-none place-items-center rounded-full"
              style={
                m.achieved
                  ? { background: "linear-gradient(140deg,var(--jade),var(--jade-2))" }
                  : { border: "1.5px solid rgba(147,169,191,.5)" }
              }
            >
              {m.achieved ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#062C20" strokeWidth="3.4" strokeLinecap="round">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              ) : null}
            </span>
            <div className="flex-1">
              <div className="text-[12px] font-bold leading-tight">{m.label}</div>
              <div className="text-[10px] font-medium text-[var(--muted)]">
                {m.dueLabel} · {m.detail}
              </div>
            </div>
            <div className="fig text-base" style={m.achieved ? { color: "var(--jade-2)" } : { color: "var(--muted)" }}>
              {fmtMoney(m.combinedIncome, true)}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ---------- assumptions ---------- */

function Assumptions({ data }: { data: FinanceData }) {
  const router = useRouter();
  const c = data.config;
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    homeValue: c.homeValue != null ? String(c.homeValue) : "",
    purchasePrice: String(c.purchasePrice),
    monthlyTarget: String(c.monthlyTarget),
    totalTarget: String(c.totalTarget),
    loanRate: String(Math.round(c.loanRate * 10000) / 100), // percent
    startingSavings: String(c.startingSavings),
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  const numOr = (s: string) => {
    const n = parseInt(s.replace(/[^\d]/g, ""), 10);
    return Number.isNaN(n) ? undefined : n;
  };

  async function save() {
    setBusy(true);
    try {
      await fetch("/api/finance/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeValue: form.homeValue.trim() === "" ? null : numOr(form.homeValue),
          purchasePrice: numOr(form.purchasePrice),
          monthlyTarget: numOr(form.monthlyTarget),
          totalTarget: numOr(form.totalTarget),
          startingSavings: numOr(form.startingSavings),
          loanRate: form.loanRate ? Math.round(parseFloat(form.loanRate) * 100) / 10000 : undefined,
        }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const F = (k: keyof typeof form, label: string, prefix?: string) => (
    <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
      {label}
      <div className="relative mt-1">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">{prefix}</span>}
        <input
          inputMode="numeric"
          value={form[k]}
          onChange={(e) => set(k, e.target.value)}
          className="w-full rounded-sm py-2.5 pr-3"
          style={{ background: "rgba(255,255,255,.7)", boxShadow: "var(--inner)", fontSize: 16, paddingLeft: prefix ? 26 : 12 }}
        />
      </div>
    </label>
  );

  return (
    <details className="panel mb-4 overflow-hidden">
      <summary className="flex cursor-pointer items-center justify-between p-5">
        <span className="eyebrow">Assumptions</span>
        <span className="text-[var(--muted)]">▾</span>
      </summary>
      <div className="px-5 pb-5">
        <div className="grid grid-cols-2 gap-2.5">
          {F("homeValue", "Current home value", "$")}
          {F("purchasePrice", "Purchase price", "$")}
          {F("monthlyTarget", "Monthly target", "$")}
          {F("totalTarget", "Total target", "$")}
          {F("startingSavings", "Starting savings", "$")}
          {F("loanRate", "Loan rate %")}
        </div>
        <button className="pill pill-jade mt-3 w-full disabled:opacity-60" style={{ padding: 12 }} onClick={save} disabled={busy}>
          {busy ? "…" : "Save assumptions"}
        </button>
      </div>
    </details>
  );
}
