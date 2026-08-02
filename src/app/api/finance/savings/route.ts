import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";
import { currentMonth } from "@/lib/finance";

export const runtime = "nodejs";

// Upsert the savings balance for a month (defaults to the current month).
const Body = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  balance: z.number().min(0).max(100_000_000),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const month = parsed.data.month ?? currentMonth();
  const balance = Math.round(parsed.data.balance);

  const row = await prisma.savingsSnapshot.upsert({
    where: { month },
    update: { balance },
    create: { month, balance },
  });
  return NextResponse.json({ ok: true, id: row.id });
}

const Del = z.object({ id: z.string() });
export async function DELETE(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Del.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  await prisma.savingsSnapshot.deleteMany({ where: { id: parsed.data.id } });
  return NextResponse.json({ ok: true });
}
