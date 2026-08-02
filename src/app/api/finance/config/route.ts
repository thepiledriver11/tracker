import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { guard, bad } from "@/lib/api";

export const runtime = "nodejs";

const month = z.string().regex(/^\d{4}-\d{2}$/);
const int = z.number().int().min(0).max(100_000_000);

// Editable assumptions. All optional — only provided fields are updated.
const Body = z.object({
  monthlyTarget: int.optional(),
  totalTarget: int.optional(),
  startingSavings: int.optional(),
  savingsStartMonth: month.optional(),
  savingsEndMonth: month.optional(),
  mortgageStart: int.optional(),
  mortgageMonthlyReduction: int.optional(),
  mortgageStartMonth: month.optional(),
  homeValue: int.nullable().optional(),
  purchasePrice: int.optional(),
  targetLvr: z.number().min(0).max(1).optional(),
  loanRate: z.number().min(0).max(0.5).optional(),
  loanTermYears: z.number().int().min(1).max(40).optional(),
  targetDate: month.optional(),
  targetCombinedIncome: int.optional(),
});

export async function POST(req: Request) {
  const denied = await guard();
  if (denied) return denied;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad();
  const data = Object.fromEntries(
    Object.entries(parsed.data).filter(([, v]) => v !== undefined),
  );
  const row = await prisma.financeConfig.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
  return NextResponse.json({ ok: true, config: row });
}
