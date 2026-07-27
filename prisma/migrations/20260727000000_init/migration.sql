-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Exercise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "muscleGroup" TEXT NOT NULL,
    "equipment" TEXT NOT NULL,
    "isUnilateral" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Exercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgramWeek" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "block" TEXT NOT NULL,
    "focus" TEXT,

    CONSTRAINT "ProgramWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTemplate" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "stepperMin" INTEGER NOT NULL,

    CONSTRAINT "SessionTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateBlock" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "rounds" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TemplateBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateExercise" (
    "id" TEXT NOT NULL,
    "blockId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "repScheme" JSONB NOT NULL,
    "notes" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TemplateExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "templateId" TEXT,
    "programWeekId" TEXT,
    "date" DATE NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "bodyweightKg" DECIMAL(5,2),
    "stepperMin" INTEGER,
    "sessionRpe" INTEGER,
    "notes" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "templateExerciseId" TEXT,
    "exerciseId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "dropIndex" INTEGER NOT NULL DEFAULT 0,
    "weightKg" DECIMAL(6,2) NOT NULL,
    "reps" INTEGER NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'both',
    "rir" INTEGER,
    "toFailure" BOOLEAN NOT NULL DEFAULT false,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Measurement" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "weightKg" DECIMAL(5,2),
    "bodyFatPct" DECIMAL(4,1),
    "neckCm" DECIMAL(4,1),
    "chestCm" DECIMAL(4,1),
    "waistCm" DECIMAL(4,1),
    "hipsCm" DECIMAL(4,1),
    "armLeftCm" DECIMAL(4,1),
    "armRightCm" DECIMAL(4,1),
    "thighLeftCm" DECIMAL(4,1),
    "thighRightCm" DECIMAL(4,1),
    "calfCm" DECIMAL(4,1),
    "photoUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "Measurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Walk" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "minutes" INTEGER NOT NULL,
    "distanceKm" DECIMAL(5,2),
    "kind" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Walk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionEntry" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "meal" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER,
    "carbsG" INTEGER,
    "fatG" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NutritionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NutritionTarget" (
    "id" TEXT NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER NOT NULL,
    "carbsG" INTEGER,
    "fatG" INTEGER,

    CONSTRAINT "NutritionTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodShortcut" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "calories" INTEGER NOT NULL,
    "proteinG" INTEGER,
    "carbsG" INTEGER,
    "fatG" INTEGER,
    "useCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "FoodShortcut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "telegramChatId" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "morningPingAt" TEXT NOT NULL DEFAULT '06:00',
    "eveningNudgeAt" TEXT NOT NULL DEFAULT '20:00',
    "weeklyRecapDay" INTEGER NOT NULL DEFAULT 7,
    "gymMode" BOOLEAN NOT NULL DEFAULT true,
    "notifyMorning" BOOLEAN NOT NULL DEFAULT true,
    "notifyNudge" BOOLEAN NOT NULL DEFAULT true,
    "notifyPr" BOOLEAN NOT NULL DEFAULT true,
    "notifyRecap" BOOLEAN NOT NULL DEFAULT true,
    "lastMorningAt" TEXT,
    "lastNudgeAt" TEXT,
    "lastRecapAt" TEXT,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Exercise_name_key" ON "Exercise"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProgramWeek_programId_weekNumber_key" ON "ProgramWeek"("programId", "weekNumber");

-- CreateIndex
CREATE INDEX "Session_date_idx" ON "Session"("date");

-- CreateIndex
CREATE INDEX "SetLog_exerciseId_loggedAt_idx" ON "SetLog"("exerciseId", "loggedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Measurement_date_key" ON "Measurement"("date");

-- CreateIndex
CREATE INDEX "Walk_date_idx" ON "Walk"("date");

-- CreateIndex
CREATE INDEX "NutritionEntry_date_idx" ON "NutritionEntry"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FoodShortcut_label_key" ON "FoodShortcut"("label");

-- AddForeignKey
ALTER TABLE "ProgramWeek" ADD CONSTRAINT "ProgramWeek_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTemplate" ADD CONSTRAINT "SessionTemplate_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateBlock" ADD CONSTRAINT "TemplateBlock_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SessionTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateExercise" ADD CONSTRAINT "TemplateExercise_blockId_fkey" FOREIGN KEY ("blockId") REFERENCES "TemplateBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TemplateExercise" ADD CONSTRAINT "TemplateExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "SessionTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_programWeekId_fkey" FOREIGN KEY ("programWeekId") REFERENCES "ProgramWeek"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetLog" ADD CONSTRAINT "SetLog_templateExerciseId_fkey" FOREIGN KEY ("templateExerciseId") REFERENCES "TemplateExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

