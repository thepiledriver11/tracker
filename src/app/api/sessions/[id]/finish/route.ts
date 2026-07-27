import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";
import { epley, num, tonnage } from "@/lib/metrics";
import { sendMessage } from "@/lib/telegram";
import { getSettings } from "@/lib/queries";

export const runtime = "nodejs";

const Body = z.object({
  sessionId: z.string().optional(),
  stepperMin: z.number().int().min(0).max(120).nullable().optional(),
  sessionRpe: z.number().int().min(1).max(10).nullable().optional(),
  bodyweightKg: z.number().min(0).max(400).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await guard();
  if (denied) return denied;
  const { id } = await params;

  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return bad();
  const b = parsed.data;

  const session = await prisma.session.update({
    where: { id },
    data: {
      completedAt: new Date(),
      stepperMin: b.stepperMin ?? undefined,
      sessionRpe: b.sessionRpe ?? undefined,
      bodyweightKg: b.bodyweightKg ?? undefined,
      notes: b.notes ?? undefined,
    },
    include: {
      template: true,
      setLogs: { include: { exercise: true } },
    },
  });

  // Mirror a finish-time bodyweight into the day's Measurement.
  if (b.bodyweightKg != null) {
    await prisma.measurement.upsert({
      where: { date: session.date },
      update: { weightKg: b.bodyweightKg },
      create: { date: session.date, weightKg: b.bodyweightKg },
    });
  }

  const rows = session.setLogs.map((l) => ({
    weightKg: num(l.weightKg),
    reps: l.reps,
    round: l.round,
    dropIndex: l.dropIndex,
  }));
  const volume = Math.round(tonnage(rows));

  // PR check: did any exercise beat its previous best e1RM (before this session)?
  const prs: string[] = [];
  const byExercise = new Map<string, { name: string; best: number }>();
  for (const l of session.setLogs) {
    const e = epley(num(l.weightKg), l.reps);
    const cur = byExercise.get(l.exerciseId);
    if (!cur || e > cur.best)
      byExercise.set(l.exerciseId, { name: l.exercise.name, best: e });
  }
  for (const [exerciseId, { name, best }] of byExercise) {
    const priors = await prisma.setLog.findMany({
      where: { exerciseId, session: { id: { not: id }, completedAt: { not: null } } },
      select: { weightKg: true, reps: true },
    });
    const priorBest = priors.reduce(
      (m, p) => Math.max(m, epley(num(p.weightKg), p.reps)),
      0,
    );
    if (priors.length > 0 && best > priorBest) {
      prs.push(`${name} — new e1RM ${Math.round(best)}kg`);
    }
  }

  // Telegram summary (spec §8: sent from the API route, not cron).
  const settings = await getSettings();
  if (settings.telegramChatId && settings.notifyPr) {
    const dur =
      session.startedAt && session.completedAt
        ? Math.round(
            (session.completedAt.getTime() - session.startedAt.getTime()) /
              60000,
          )
        : null;
    const lines = [
      `✅ <b>${session.template?.name ?? "Session"}</b> done`,
      `${session.setLogs.length} sets · ${volume.toLocaleString()} kg volume${dur ? ` · ${dur} min` : ""}`,
      ...prs.map((p) => `🟠 PR — ${p}`),
    ];
    await sendMessage(settings.telegramChatId, lines.join("\n"));
  }

  return NextResponse.json({ ok: true, volume, prs });
}
