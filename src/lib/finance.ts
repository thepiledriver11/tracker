// Finance — the 2028 home-purchase tracker. Pure calc helpers plus a single
// getFinanceData() that provisions defaults, reads inputs, and derives every
// figure. Postgres holds the raw inputs; nothing derived is stored.
import { prisma } from "./prisma";
import { sydneyISODate } from "./time";

/* ---------- month math (yyyy-mm) ---------- */

export function monthsBetween(a: string, b: string): number {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function currentMonth(): string {
  return sydneyISODate().slice(0, 7);
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2028-04" -> "Apr 2028". */
export function prettyMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  return `${MONTH_NAMES[m - 1]} ${y}`;
}

/* ---------- finance maths ---------- */

/** Standard amortised monthly repayment. */
export function monthlyRepayment(
  principal: number,
  annualRate: number,
  termYears: number,
): number {
  if (principal <= 0) return 0;
  const r = annualRate / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/* ---------- default milestones (spec-provided) ---------- */

const DEFAULT_MILESTONES = [
  { order: 0, label: "James → Head of Product", dueLabel: "Dec 2026", detail: "Base $210,000", combinedIncome: 210000 },
  { order: 1, label: "James bonus confirmed", dueLabel: "Mar 2027", detail: "Total package $250,000", combinedIncome: 250000 },
  { order: 2, label: "Taylor returns from maternity", dueLabel: "Jan 2028", detail: "Taylor at $120,000", combinedIncome: 370000 },
  { order: 3, label: "Both salaries increased", dueLabel: "Mid 2028", detail: "James $270,000 + Taylor $135,000", combinedIncome: 405000 },
];

async function ensureConfig() {
  return prisma.financeConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

async function ensureMilestones() {
  const count = await prisma.salaryMilestone.count();
  if (count === 0) {
    await prisma.salaryMilestone.createMany({ data: DEFAULT_MILESTONES });
  }
  return prisma.salaryMilestone.findMany({ orderBy: { order: "asc" } });
}

export async function getFinanceData() {
  const [config, milestones, snapshots] = await Promise.all([
    ensureConfig(),
    ensureMilestones(),
    prisma.savingsSnapshot.findMany({ orderBy: { month: "asc" } }),
  ]);

  const now = currentMonth();
  const latest = snapshots[snapshots.length - 1] ?? null;
  const asOfMonth = latest?.month ?? config.savingsStartMonth;
  const currentBalance = latest?.balance ?? config.startingSavings;

  /* savings progress */
  const planMonths = monthsBetween(config.savingsStartMonth, config.savingsEndMonth); // 24
  const elapsed = Math.min(
    Math.max(monthsBetween(config.savingsStartMonth, asOfMonth), 0),
    planMonths,
  );
  const monthsSaving = Math.max(1, elapsed);
  const contributed = currentBalance - config.startingSavings;
  const runRate = contributed / monthsSaving; // actual $/month
  const plannedBalanceNow = config.startingSavings + config.monthlyTarget * elapsed;
  const variance = currentBalance - plannedBalanceNow; // + ahead, − behind
  const remaining = Math.max(0, config.totalTarget - currentBalance);
  const monthsToTarget = runRate > 0 ? Math.ceil(remaining / runRate) : null;
  const projectedFinishMonth =
    remaining === 0
      ? asOfMonth
      : monthsToTarget != null
        ? addMonths(asOfMonth, monthsToTarget)
        : null;
  const savingsProgressPct = Math.min(
    100,
    Math.round((currentBalance / config.totalTarget) * 1000) / 10,
  );
  // Months ahead/behind the plan schedule.
  const monthsVariance =
    config.monthlyTarget > 0 ? variance / config.monthlyTarget : 0;

  /* mortgage */
  const mElapsed = Math.max(0, monthsBetween(config.mortgageStartMonth, now));
  const mortgageRemaining = Math.max(
    0,
    config.mortgageStart - config.mortgageMonthlyReduction * mElapsed,
  );
  const mortgagePaid = config.mortgageStart - mortgageRemaining;
  const mortgageProgressPct =
    Math.round((mortgagePaid / config.mortgageStart) * 1000) / 10;

  /* purchase summary (live) */
  const equity =
    config.homeValue != null ? Math.max(0, config.homeValue - mortgageRemaining) : null;
  const deposit = (equity ?? 0) + currentBalance;
  const loan = Math.max(0, config.purchasePrice - deposit);
  const lvr = config.purchasePrice > 0 ? loan / config.purchasePrice : 0;
  const repayment = monthlyRepayment(loan, config.loanRate, config.loanTermYears);

  // Projected-at-completion: deposit once the full savings target is banked.
  const depositAtTarget = (equity ?? 0) + config.totalTarget;
  const loanAtTarget = Math.max(0, config.purchasePrice - depositAtTarget);

  /* income milestones */
  const achieved = milestones.filter((m) => m.achieved);
  const currentCombined = achieved.reduce(
    (max, m) => Math.max(max, m.combinedIncome),
    0,
  );
  const incomeProgressPct = Math.min(
    100,
    Math.round((currentCombined / config.targetCombinedIncome) * 1000) / 10,
  );

  return {
    config,
    milestones,
    snapshots,
    now,
    asOfMonth,
    savings: {
      currentBalance,
      totalTarget: config.totalTarget,
      monthlyTarget: config.monthlyTarget,
      progressPct: savingsProgressPct,
      remaining,
      runRate: Math.round(runRate),
      plannedBalanceNow,
      variance: Math.round(variance),
      monthsVariance: Math.round(monthsVariance * 10) / 10,
      ahead: variance >= 0,
      projectedFinishMonth,
      planFinishMonth: config.savingsEndMonth,
      onTrack: projectedFinishMonth
        ? monthsBetween(projectedFinishMonth, config.savingsEndMonth) >= 0
        : null,
    },
    mortgage: {
      start: config.mortgageStart,
      remaining: mortgageRemaining,
      paid: mortgagePaid,
      monthlyReduction: config.mortgageMonthlyReduction,
      progressPct: mortgageProgressPct,
    },
    purchase: {
      price: config.purchasePrice,
      equity,
      deposit,
      loan,
      lvr,
      targetLvr: config.targetLvr,
      repayment: Math.round(repayment),
      loanRate: config.loanRate,
      targetDate: config.targetDate,
      depositAtTarget,
      loanAtTarget,
      repaymentAtTarget: Math.round(
        monthlyRepayment(loanAtTarget, config.loanRate, config.loanTermYears),
      ),
    },
    income: {
      current: currentCombined,
      target: config.targetCombinedIncome,
      progressPct: incomeProgressPct,
      achievedCount: achieved.length,
      total: milestones.length,
    },
  };
}

export type FinanceData = Awaited<ReturnType<typeof getFinanceData>>;
