// Parses and executes inbound Telegram commands. Returns the reply text.
import { prisma } from "./prisma";
import { dateOnly, sydneyISODate, sydneyDayOfWeek, shortDate, isoOf } from "./time";
import { getToday, currentWeekOf, getActiveProgram, walkTargetFor } from "./queries";
import { num, epley } from "./metrics";

export async function handleCommand(text: string): Promise<string> {
  const trimmed = text.trim();
  const [cmdRaw, ...rest] = trimmed.split(/\s+/);
  const cmd = cmdRaw.toLowerCase().replace(/@.*$/, "");
  const arg = rest.join(" ");

  switch (cmd) {
    case "/start":
    case "/today":
      return todayMessage();
    case "/weight":
      return logWeight(arg);
    case "/cals":
      return logCals(arg);
    case "/walk":
      return logWalk(arg);
    case "/last":
      return lastExercise(arg);
    case "/week":
      return weekMessage();
    default:
      return "Commands: /today /weight 82.4 /cals 650 lunch /walk 45 /last lat pulldown /week";
  }
}

export async function todayMessage(iso = sydneyISODate()): Promise<string> {
  const t = await getToday(iso);
  if (!t.template) {
    const dow = sydneyDayOfWeek(dateOnly(iso));
    return `🛌 <b>Rest day</b>\nWalk target ${walkTargetFor(t.blockTarget, dow)} min.`;
  }
  const firstBlock = t.template.blocks.find((b) => b.kind !== "activation");
  const lines = [
    `🏋️ <b>${t.template.name}</b> · ${t.template.intent}`,
    `${t.template.blocks.filter((b) => b.kind !== "activation").length} blocks · stepper ${t.template.stepperMin} min`,
  ];
  if (firstBlock) {
    const te = await prisma.templateExercise.findFirst({
      where: { blockId: firstBlock.id },
      include: { exercise: true },
    });
    if (te) {
      const last = await prisma.setLog.findFirst({
        where: { exerciseId: te.exerciseId, round: 1, dropIndex: 0 },
        orderBy: { loggedAt: "desc" },
      });
      if (last) {
        lines.push(`First up ${te.exercise.name} — last R1 ${num(last.weightKg)}kg × ${last.reps}`);
      }
    }
  }
  lines.push(t.session?.completedAt ? "✅ Logged today" : "Not logged yet");
  return lines.join("\n");
}

async function logWeight(arg: string): Promise<string> {
  const kg = parseFloat(arg);
  if (Number.isNaN(kg)) return "Usage: /weight 82.4";
  const date = dateOnly(sydneyISODate());
  await prisma.measurement.upsert({
    where: { date },
    update: { weightKg: kg },
    create: { date, weightKg: kg },
  });
  return `Logged bodyweight ${kg} kg for today.`;
}

async function logCals(arg: string): Promise<string> {
  const m = arg.match(/^(\d+)\s*(.*)$/);
  if (!m) return "Usage: /cals 650 chicken and rice";
  const calories = parseInt(m[1], 10);
  const label = m[2].trim() || "quick add";
  await prisma.nutritionEntry.create({
    data: { date: dateOnly(sydneyISODate()), meal: "snack", label, calories },
  });
  return `Added ${calories} kcal — ${label}.`;
}

async function logWalk(arg: string): Promise<string> {
  const minutes = parseInt(arg, 10);
  if (Number.isNaN(minutes)) return "Usage: /walk 45";
  const dow = sydneyDayOfWeek(dateOnly(sydneyISODate()));
  await prisma.walk.create({
    data: {
      date: dateOnly(sydneyISODate()),
      minutes,
      kind: dow === 7 ? "long" : "weekday",
    },
  });
  return `Logged a ${minutes} min walk.`;
}

async function lastExercise(arg: string): Promise<string> {
  if (!arg) return "Usage: /last lat pulldown";
  const exercise = await prisma.exercise.findFirst({
    where: { name: { contains: arg, mode: "insensitive" } },
  });
  if (!exercise) return `No exercise matching “${arg}”.`;
  const sessions = await prisma.session.findMany({
    where: { setLogs: { some: { exerciseId: exercise.id } } },
    orderBy: { date: "desc" },
    take: 3,
    include: {
      setLogs: {
        where: { exerciseId: exercise.id, dropIndex: 0 },
        orderBy: { round: "asc" },
      },
    },
  });
  if (sessions.length === 0) return `No logs for ${exercise.name} yet.`;
  const lines = [`<b>${exercise.name}</b> — last ${sessions.length}`];
  for (const s of sessions) {
    const sets = s.setLogs.map((l) => `${num(l.weightKg)}×${l.reps}`).join(" · ");
    const best = s.setLogs.reduce((m, l) => Math.max(m, epley(num(l.weightKg), l.reps)), 0);
    lines.push(`${shortDate(isoOf(s.date))}: ${sets}  (e1RM ${Math.round(best)})`);
  }
  return lines.join("\n");
}

async function weekMessage(): Promise<string> {
  const program = await getActiveProgram();
  if (!program) return "No active program.";
  const iso = sydneyISODate();
  const week = currentWeekOf(program.weeks, iso);
  if (!week) return "Outside the program dates.";
  const start = week.startDate;
  const end = new Date(start.getTime() + 7 * 86400000);
  const [sessions, walks] = await Promise.all([
    prisma.session.count({ where: { completedAt: { not: null }, date: { gte: start, lt: end } } }),
    prisma.walk.aggregate({ _sum: { minutes: true }, where: { date: { gte: start, lt: end } } }),
  ]);
  return [
    `📅 <b>Week ${week.weekNumber}</b> (${week.block})`,
    `Sessions ${sessions}/6`,
    `Walk minutes ${walks._sum.minutes ?? 0}`,
  ].join("\n");
}
