import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, Unauthorized } from "@/lib/auth";
import { dateOnly, sydneyISODate } from "@/lib/time";
import { getActiveProgram, currentWeekOf } from "@/lib/queries";

export const runtime = "nodejs";

const Body = z.object({
  templateId: z.string().optional(),
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/** Create (or return the existing) session for a template on a date. */
export async function POST(req: Request) {
  try {
    await requireAuth();
  } catch (e) {
    if (e instanceof Unauthorized)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw e;
  }
  const parsed = Body.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Bad request" }, { status: 400 });

  const iso = parsed.data.iso ?? sydneyISODate();
  const date = dateOnly(iso);

  let templateId = parsed.data.templateId;
  const program = await getActiveProgram();
  const week = program ? currentWeekOf(program.weeks, iso) : null;

  const existing = await prisma.session.findFirst({
    where: { date, ...(templateId ? { templateId } : {}) },
  });
  if (existing) {
    if (!existing.startedAt) {
      await prisma.session.update({
        where: { id: existing.id },
        data: { startedAt: new Date() },
      });
    }
    return NextResponse.json({ id: existing.id });
  }

  const created = await prisma.session.create({
    data: {
      templateId: templateId ?? null,
      programWeekId: week?.id ?? null,
      date,
      startedAt: new Date(),
    },
  });
  return NextResponse.json({ id: created.id });
}
