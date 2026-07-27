import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";
import { dateOnly, sydneyISODate } from "@/lib/time";

export const runtime = "nodejs";

const dec = z.number().min(0).max(400).nullable().optional();

// All fields optional — log whatever was measured. Upsert on the date.
const Body = z.object({
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  weightKg: dec,
  bodyFatPct: dec,
  neckCm: dec,
  chestCm: dec,
  waistCm: dec,
  hipsCm: dec,
  armLeftCm: dec,
  armRightCm: dec,
  thighLeftCm: dec,
  thighRightCm: dec,
  calfCm: dec,
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const { iso, ...fields } = parsed.data;
  const date = dateOnly(iso ?? sydneyISODate());

  // Drop undefined keys so an upsert doesn't clobber existing values with null.
  const data = Object.fromEntries(
    Object.entries(fields).filter(([, v]) => v !== undefined),
  );

  const row = await prisma.measurement.upsert({
    where: { date },
    update: data,
    create: { date, ...data },
  });
  return NextResponse.json({ ok: true, id: row.id });
}
