import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/api";

export const runtime = "nodejs";

export async function GET() {
  const denied = await guard();
  if (denied) return denied;
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      muscleGroup: true,
      equipment: true,
      isUnilateral: true,
    },
  });
  return NextResponse.json({ exercises });
}
