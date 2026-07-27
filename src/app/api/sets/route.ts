import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";

export const runtime = "nodejs";

// The client sends its UUID as `id`; we use it as the primary key so a retried
// offline write is idempotent (unique-violation => already stored => 409).
const Body = z.object({
  id: z.string().min(8),
  sessionId: z.string(),
  templateExerciseId: z.string().nullable().optional(),
  exerciseId: z.string(),
  round: z.number().int().min(1).max(10),
  dropIndex: z.number().int().min(0).max(5).default(0),
  weightKg: z.number().min(0).max(999),
  reps: z.number().int().min(0).max(999),
  side: z.enum(["both", "left", "right"]).default("both"),
  rir: z.number().int().min(0).max(10).nullable().optional(),
  toFailure: z.boolean().default(false),
  loggedAt: z.string().optional(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const b = parsed.data;

  const existing = await prisma.setLog.findUnique({ where: { id: b.id } });
  if (existing) {
    return NextResponse.json({ ok: true, id: b.id, duplicate: true }, { status: 409 });
  }

  try {
    const created = await prisma.setLog.create({
      data: {
        id: b.id,
        sessionId: b.sessionId,
        templateExerciseId: b.templateExerciseId ?? null,
        exerciseId: b.exerciseId,
        round: b.round,
        dropIndex: b.dropIndex,
        weightKg: b.weightKg,
        reps: b.reps,
        side: b.side,
        rir: b.rir ?? null,
        toFailure: b.toFailure,
        loggedAt: b.loggedAt ? new Date(b.loggedAt) : new Date(),
      },
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e: unknown) {
    // Unique violation on the client UUID — a concurrent retry won the race.
    if (typeof e === "object" && e && "code" in e && (e as { code: string }).code === "P2002") {
      return NextResponse.json({ ok: true, id: b.id, duplicate: true }, { status: 409 });
    }
    throw e;
  }
}

const DeleteBody = z.object({ id: z.string() });

export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = DeleteBody.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  await prisma.setLog.deleteMany({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
