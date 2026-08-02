import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";

export const runtime = "nodejs";

const Body = z.object({
  id: z.string(),
  achieved: z.boolean(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const { id, achieved } = parsed.data;
  const row = await prisma.salaryMilestone.update({
    where: { id },
    data: { achieved, achievedAt: achieved ? new Date() : null },
  });
  return NextResponse.json({ ok: true, milestone: row });
}
