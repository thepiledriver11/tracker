import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";
import { dateOnly, sydneyISODate } from "@/lib/time";

export const runtime = "nodejs";

const Body = z.object({
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  calories: z.number().int().min(500).max(10000),
  proteinG: z.number().int().min(0).max(1000),
  carbsG: z.number().int().min(0).max(2000).nullable().optional(),
  fatG: z.number().int().min(0).max(1000).nullable().optional(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const b = parsed.data;
  const effectiveFrom = dateOnly(b.effectiveFrom ?? sydneyISODate());

  // One target per effective date — upsert.
  const existing = await prisma.nutritionTarget.findFirst({ where: { effectiveFrom } });
  const row = existing
    ? await prisma.nutritionTarget.update({
        where: { id: existing.id },
        data: { calories: b.calories, proteinG: b.proteinG, carbsG: b.carbsG ?? null, fatG: b.fatG ?? null },
      })
    : await prisma.nutritionTarget.create({
        data: {
          effectiveFrom,
          calories: b.calories,
          proteinG: b.proteinG,
          carbsG: b.carbsG ?? null,
          fatG: b.fatG ?? null,
        },
      });
  return NextResponse.json({ ok: true, id: row.id });
}
