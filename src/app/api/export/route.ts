import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guard } from "@/lib/api";

export const runtime = "nodejs";

// Full JSON export of every table (spec §13). Streamed as a download.
export async function GET() {
  const denied = await guard();
  if (denied) return denied;

  const [
    exercises,
    programs,
    programWeeks,
    sessionTemplates,
    templateBlocks,
    templateExercises,
    sessions,
    setLogs,
    measurements,
    walks,
    nutritionEntries,
    nutritionTargets,
    foodShortcuts,
    settings,
  ] = await Promise.all([
    prisma.exercise.findMany(),
    prisma.program.findMany(),
    prisma.programWeek.findMany(),
    prisma.sessionTemplate.findMany(),
    prisma.templateBlock.findMany(),
    prisma.templateExercise.findMany(),
    prisma.session.findMany(),
    prisma.setLog.findMany(),
    prisma.measurement.findMany(),
    prisma.walk.findMany(),
    prisma.nutritionEntry.findMany(),
    prisma.nutritionTarget.findMany(),
    prisma.foodShortcut.findMany(),
    prisma.settings.findMany(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    exercises,
    programs,
    programWeeks,
    sessionTemplates,
    templateBlocks,
    templateExercises,
    sessions,
    setLogs,
    measurements,
    walks,
    nutritionEntries,
    nutritionTargets,
    foodShortcuts,
    settings,
  };

  const body = JSON.stringify(payload, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="training-export-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
