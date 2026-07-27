import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";

export const runtime = "nodejs";

const hhmm = z.string().regex(/^\d{2}:\d{2}$/);

const Body = z.object({
  morningPingAt: hhmm.optional(),
  eveningNudgeAt: hhmm.optional(),
  weeklyRecapDay: z.number().int().min(1).max(7).optional(),
  gymMode: z.boolean().optional(),
  notifyMorning: z.boolean().optional(),
  notifyNudge: z.boolean().optional(),
  notifyPr: z.boolean().optional(),
  notifyRecap: z.boolean().optional(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );
  const row = await prisma.settings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  return NextResponse.json({ ok: true, settings: row });
}
