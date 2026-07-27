// Seed the 6-day program exactly as docs/01-build-spec.md §11. Idempotent:
// exercises upsert by name; the program is rebuilt from scratch each run.
import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

const HEAVY = {
  type: "descending",
  rounds: [
    { round: 1, loadPct: 1.0, repMin: 8, repMax: 10, rir: 2, toFailure: false },
    { round: 2, loadPct: 0.85, repMin: 10, repMax: 12, rir: 1, toFailure: false },
    { round: 3, loadPct: 0.72, repMin: 12, repMax: 15, rir: null, toFailure: true },
  ],
} as const;

const VOLUME = {
  type: "descending",
  rounds: [
    { round: 1, loadPct: 1.0, repMin: 12, repMax: 15, rir: 3, toFailure: false },
    { round: 2, loadPct: 0.9, repMin: 15, repMax: 18, rir: 2, toFailure: false },
    { round: 3, loadPct: 0.81, repMin: 18, repMax: 20, rir: 1, toFailure: false },
  ],
} as const;

const ACTIVATION = { type: "activation", sets: 2, reps: 20 } as const;

// name -> [muscleGroup, equipment, isUnilateral]
const EXERCISES: Record<string, [string, string, boolean?]> = {
  "Dumbbell press": ["chest", "dumbbell"],
  "Machine chest press": ["chest", "machine"],
  "Cable fly": ["chest", "cable"],
  "Machine shoulder press": ["delts", "machine"],
  "Dumbbell lateral raise": ["delts", "dumbbell"],
  "Cable triceps pushdown": ["triceps", "cable"],
  "Seated overhead DB extension": ["triceps", "dumbbell"],
  "Lat pulldown": ["back", "cable"],
  "Lat pulldown (wide)": ["back", "cable"],
  "Cable bar biceps curl": ["biceps", "cable"],
  "Machine row (undergrip)": ["back", "machine"],
  "Cable rope straight-arm pulldown": ["back", "cable"],
  "Cable crossover (rear delt)": ["delts", "cable"],
  "Prone incline bench DB curl": ["biceps", "dumbbell"],
  "Banded hip abduction": ["glutes", "band"],
  "Hamstring curl machine": ["hams", "machine"],
  "Bulgarian deadlift (straight leg)": ["hams", "dumbbell", true],
  "Single-leg Smith squat": ["quads", "machine", true],
  "Leg extension": ["quads", "machine"],
  "Calf raise": ["calves", "machine"],
  "Kettlebell lunge": ["quads", "kettlebell", true],
  "Romanian deadlift": ["hams", "barbell"],
};

type BlockDef = {
  label: string;
  kind: "superset" | "single" | "activation";
  rounds: number;
  ex: string[]; // slot order
};

type TemplateDef = {
  name: string;
  intent: "heavy" | "volume";
  dayOfWeek: number;
  stepperMin: number;
  blocks: BlockDef[];
};

const TEMPLATES: TemplateDef[] = [
  {
    name: "Push A",
    intent: "heavy",
    dayOfWeek: 1,
    stepperMin: 8,
    blocks: [
      { label: "A", kind: "superset", rounds: 3, ex: ["Dumbbell press", "Machine chest press"] },
      { label: "B", kind: "superset", rounds: 3, ex: ["Cable fly", "Machine shoulder press"] },
      { label: "C", kind: "superset", rounds: 3, ex: ["Dumbbell lateral raise", "Cable triceps pushdown"] },
      { label: "D", kind: "single", rounds: 3, ex: ["Seated overhead DB extension"] },
    ],
  },
  {
    name: "Pull A",
    intent: "heavy",
    dayOfWeek: 2,
    stepperMin: 8,
    blocks: [
      { label: "A", kind: "superset", rounds: 3, ex: ["Lat pulldown", "Cable bar biceps curl"] },
      { label: "B", kind: "superset", rounds: 3, ex: ["Machine row (undergrip)", "Cable rope straight-arm pulldown"] },
      { label: "C", kind: "superset", rounds: 3, ex: ["Cable crossover (rear delt)", "Prone incline bench DB curl"] },
    ],
  },
  {
    name: "Lower 1",
    intent: "heavy",
    dayOfWeek: 3,
    stepperMin: 6,
    blocks: [
      { label: "Activation", kind: "activation", rounds: 2, ex: ["Banded hip abduction"] },
      { label: "A", kind: "superset", rounds: 3, ex: ["Hamstring curl machine", "Bulgarian deadlift (straight leg)"] },
      { label: "B", kind: "superset", rounds: 3, ex: ["Single-leg Smith squat", "Leg extension"] },
      { label: "C", kind: "single", rounds: 3, ex: ["Calf raise"] },
    ],
  },
  {
    name: "Push B",
    intent: "volume",
    dayOfWeek: 4,
    stepperMin: 8,
    blocks: [
      { label: "A", kind: "superset", rounds: 3, ex: ["Machine chest press", "Cable fly"] },
      { label: "B", kind: "superset", rounds: 3, ex: ["Machine shoulder press", "Dumbbell lateral raise"] },
      { label: "C", kind: "superset", rounds: 2, ex: ["Cable triceps pushdown", "Seated overhead DB extension"] },
    ],
  },
  {
    name: "Pull B",
    intent: "volume",
    dayOfWeek: 5,
    stepperMin: 8,
    blocks: [
      { label: "A", kind: "superset", rounds: 3, ex: ["Lat pulldown (wide)", "Cable rope straight-arm pulldown"] },
      { label: "B", kind: "superset", rounds: 3, ex: ["Machine row (undergrip)", "Cable crossover (rear delt)"] },
      { label: "C", kind: "superset", rounds: 2, ex: ["Cable bar biceps curl", "Prone incline bench DB curl"] },
    ],
  },
  {
    name: "Lower 2",
    intent: "heavy",
    dayOfWeek: 6,
    stepperMin: 6,
    blocks: [
      { label: "Activation", kind: "activation", rounds: 2, ex: ["Banded hip abduction"] },
      { label: "A", kind: "superset", rounds: 3, ex: ["Kettlebell lunge", "Romanian deadlift"] },
      { label: "B", kind: "superset", rounds: 3, ex: ["Hamstring curl machine", "Leg extension"] },
      { label: "C", kind: "single", rounds: 3, ex: ["Calf raise"] },
    ],
  },
];

const WEEKS: [number, string, string, string][] = [
  [1, "2026-08-03", "foundation", "Establish Round 1 loads on heavy days. Go deliberately light on B days."],
  [2, "2026-08-10", "foundation", "First progression pass on heavy days."],
  [3, "2026-08-17", "foundation", "Tighten heavy-day rest to 90 sec."],
  [4, "2026-08-24", "foundation", "Third round back on pair C for both B days."],
  [5, "2026-08-31", "foundation", "Peak — Round 3 to genuine failure, heavy days only."],
  [6, "2026-09-07", "deload", "4 days only. 2 rounds, ~70% load."],
  [7, "2026-09-14", "overload", "Back to 6 days. Heavy loads +2.5% on week 5."],
  [8, "2026-09-21", "overload", "Double-drop on the final pair, heavy days."],
  [9, "2026-09-28", "overload", "Hold the double-drop. Progress Round 1."],
  [10, "2026-10-05", "overload", "4th round on pair A for Push A and Pull A."],
  [11, "2026-10-12", "overload", "Hardest week. Keep B days easy."],
  [12, "2026-10-19", "deload", "4 days, 2 rounds, 70%. Retest against week 1."],
];

function d(iso: string) {
  return new Date(`${iso}T00:00:00.000Z`);
}

async function main() {
  console.log("Seeding exercises…");
  const exIds = new Map<string, string>();
  for (const [name, [muscleGroup, equipment, uni]] of Object.entries(EXERCISES)) {
    const ex = await prisma.exercise.upsert({
      where: { name },
      update: { muscleGroup, equipment, isUnilateral: !!uni },
      create: { name, muscleGroup, equipment, isUnilateral: !!uni },
    });
    exIds.set(name, ex.id);
  }

  const PROGRAM_NAME = "6-Day Hypertrophy — Aug–Oct 2026";
  console.log("Rebuilding program…");
  await prisma.program.deleteMany({ where: { name: PROGRAM_NAME } });
  // Only one active program at a time.
  await prisma.program.updateMany({ data: { isActive: false } });

  const program = await prisma.program.create({
    data: {
      name: PROGRAM_NAME,
      startDate: d("2026-08-03"),
      endDate: d("2026-10-25"),
      isActive: true,
    },
  });

  for (const [weekNumber, start, block, focus] of WEEKS) {
    await prisma.programWeek.create({
      data: {
        programId: program.id,
        weekNumber,
        startDate: d(start),
        block,
        focus,
      },
    });
  }

  for (let t = 0; t < TEMPLATES.length; t++) {
    const tpl = TEMPLATES[t];
    const scheme = (tpl.intent === "volume" ? VOLUME : HEAVY) as unknown as Prisma.InputJsonValue;
    const template = await prisma.sessionTemplate.create({
      data: {
        programId: program.id,
        name: tpl.name,
        intent: tpl.intent,
        dayOfWeek: tpl.dayOfWeek,
        order: t,
        stepperMin: tpl.stepperMin,
      },
    });
    for (let b = 0; b < tpl.blocks.length; b++) {
      const blk = tpl.blocks[b];
      const block = await prisma.templateBlock.create({
        data: {
          templateId: template.id,
          label: blk.label,
          kind: blk.kind,
          rounds: blk.rounds,
          order: b,
        },
      });
      for (let s = 0; s < blk.ex.length; s++) {
        const name = blk.ex[s];
        const repScheme = (blk.kind === "activation"
          ? ACTIVATION
          : scheme) as unknown as Prisma.InputJsonValue;
        await prisma.templateExercise.create({
          data: {
            blockId: block.id,
            exerciseId: exIds.get(name)!,
            slot: s + 1,
            order: s,
            repScheme,
          },
        });
      }
    }
  }

  console.log("Nutrition target + settings…");
  const hasTarget = await prisma.nutritionTarget.findFirst({
    where: { effectiveFrom: d("2026-08-03") },
  });
  if (!hasTarget) {
    // Starting numbers for lean gain; edit in Settings.
    await prisma.nutritionTarget.create({
      data: {
        effectiveFrom: d("2026-08-03"),
        calories: 2500,
        proteinG: 175,
        carbsG: 280,
        fatG: 75,
      },
    });
  }

  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
