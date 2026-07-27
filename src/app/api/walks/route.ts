import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";
import { dateOnly, sydneyISODate } from "@/lib/time";

export const runtime = "nodejs";

const Body = z.object({
  iso: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  minutes: z.number().int().min(1).max(600),
  distanceKm: z.number().min(0).max(200).nullable().optional(),
  kind: z.enum(["weekday", "long"]).default("weekday"),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const b = parsed.data;
  const walk = await prisma.walk.create({
    data: {
      date: dateOnly(b.iso ?? sydneyISODate()),
      minutes: b.minutes,
      distanceKm: b.distanceKm ?? null,
      kind: b.kind,
      notes: b.notes ?? null,
    },
  });
  return NextResponse.json({ ok: true, id: walk.id });
}
