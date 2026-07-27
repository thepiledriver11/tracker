// Assembles everything the active-session screen needs: ladder rungs (target
// loads from last working weight × loadPct), last-session reference numbers,
// and the Round-1 progression suggestion — all resolved server-side.
import { prisma } from "./prisma";
import { computeRungs, type RepScheme, type Rung } from "./rep-scheme";
import { lastWorkingWeight, lastSessionSets, num } from "./metrics";
import { suggestRound1, type Round1Suggestion } from "./progression";
import { isoOf } from "./time";

export type LoggedSet = {
  id: string;
  exerciseId: string;
  round: number;
  dropIndex: number;
  weightKg: number;
  reps: number;
  side: string;
  toFailure: boolean;
};

export type LoaderExercise = {
  templateExerciseId: string | null;
  exerciseId: string;
  name: string;
  isUnilateral: boolean;
  slot: number;
  rungs: Rung[];
  lastSets: { round: number; weightKg: number; reps: number; side: string }[];
  suggestion: Round1Suggestion;
};

export type LoaderBlock = {
  id: string;
  label: string;
  kind: string;
  rounds: number;
  exercises: LoaderExercise[];
};

export type SessionForLogging = {
  id: string;
  name: string;
  intent: string;
  restSeconds: number;
  gymMode: boolean;
  completed: boolean;
  defaultStepperMin: number | null;
  blocks: LoaderBlock[];
  logged: LoggedSet[];
};

export async function getSessionForLogging(
  sessionId: string,
): Promise<SessionForLogging | null> {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      setLogs: true,
      template: {
        include: {
          blocks: {
            orderBy: { order: "asc" },
            include: {
              exercises: {
                orderBy: { slot: "asc" },
                include: { exercise: true },
              },
            },
          },
        },
      },
    },
  });
  if (!session) return null;

  const intent = session.template?.intent ?? "heavy";
  const gym = await prisma.settings.findUnique({ where: { id: "singleton" } });

  const blocks: LoaderBlock[] = [];
  for (const block of session.template?.blocks ?? []) {
    const exercises: LoaderExercise[] = [];
    for (const te of block.exercises) {
      const scheme = te.repScheme as unknown as RepScheme | { type: "activation" };
      let rungs: Rung[] = [];
      let suggestion: Round1Suggestion = null;
      let lastSets: LoaderExercise["lastSets"] = [];

      if ((scheme as RepScheme).type === "descending") {
        const base = await lastWorkingWeight(te.exerciseId);
        rungs = computeRungs(
          scheme as RepScheme,
          base?.weightKg ?? null,
        ).slice(0, block.rounds);

        const last = await lastSessionSets(te.exerciseId, sessionId);
        lastSets =
          last?.sets
            .filter((s) => s.dropIndex === 0)
            .map((s) => ({
              round: s.round,
              weightKg: s.weightKg,
              reps: s.reps,
              side: s.side,
            })) ?? [];

        if (intent === "heavy") {
          const r1 = (scheme as RepScheme).rounds[0];
          suggestion = await suggestRound1(te.exerciseId, r1.repMax);
        }
      }

      exercises.push({
        templateExerciseId: te.id,
        exerciseId: te.exerciseId,
        name: te.exercise.name,
        isUnilateral: te.exercise.isUnilateral,
        slot: te.slot,
        rungs,
        lastSets,
        suggestion,
      });
    }
    blocks.push({
      id: block.id,
      label: block.label,
      kind: block.kind,
      rounds: block.rounds,
      exercises,
    });
  }

  return {
    id: session.id,
    name: session.template?.name ?? "Session",
    intent,
    restSeconds: intent === "volume" ? 60 : 90,
    gymMode: gym?.gymMode ?? true,
    completed: !!session.completedAt,
    defaultStepperMin: session.template?.stepperMin ?? null,
    blocks,
    logged: session.setLogs.map((l) => ({
      id: l.id,
      exerciseId: l.exerciseId,
      round: l.round,
      dropIndex: l.dropIndex,
      weightKg: num(l.weightKg),
      reps: l.reps,
      side: l.side,
      toFailure: l.toFailure,
    })),
  };
}
