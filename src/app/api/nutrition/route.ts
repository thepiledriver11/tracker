import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";
import { dateOnly, sydneyISODate } from "@/lib/time";

export const runtime = "nodejs";

const Body = z.object({
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).default("snack"),
  label: z.string().min(1).max(120),
  calories: z.number().int().min(0).max(10000),
  proteinG: z.number().int().min(0).max(1000).nullable().optional(),
  carbsG: z.number().int().min(0).max(2000).nullable().optional(),
  fatG: z.number().int().min(0).max(1000).nullable().optional(),
  saveShortcut: z.boolean().optional(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const b = parsed.data;

  const entry = await prisma.nutritionEntry.create({
    data: {
      date: dateOnly(b.iso ?? sydneyISODate()),
      meal: b.meal,
      label: b.label,
      calories: b.calories,
      proteinG: b.proteinG ?? null,
      carbsG: b.carbsG ?? null,
      fatG: b.fatG ?? null,
    },
  });

  if (b.saveShortcut) {
    await prisma.foodShortcut.upsert({
      where: { label: b.label },
      update: { calories: b.calories, proteinG: b.proteinG ?? null, carbsG: b.carbsG ?? null, fatG: b.fatG ?? null },
      create: {
        label: b.label,
        calories: b.calories,
        proteinG: b.proteinG ?? null,
        carbsG: b.carbsG ?? null,
        fatG: b.fatG ?? null,
      },
    });
  } else {
    // Bump useCount if this matches an existing shortcut.
    await prisma.foodShortcut.updateMany({
      where: { label: b.label },
      data: { useCount: { increment: 1 } },
    });
  }

  return NextResponse.json({ ok: true, id: entry.id });
}

const Del = z.object({ id: z.string() });
export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Del.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  await prisma.nutritionEntry.deleteMany({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
