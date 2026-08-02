-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "FinanceConfig" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "savingsStartMonth" TEXT NOT NULL DEFAULT '2026-08',
    "savingsEndMonth" TEXT NOT NULL DEFAULT '2028-08',
    "monthlyTarget" INTEGER NOT NULL DEFAULT 8000,
    "totalTarget" INTEGER NOT NULL DEFAULT 192000,
    "startingSavings" INTEGER NOT NULL DEFAULT 0,
    "mortgageStart" INTEGER NOT NULL DEFAULT 725000,
    "mortgageMonthlyReduction" INTEGER NOT NULL DEFAULT 1126,
    "mortgageStartMonth" TEXT NOT NULL DEFAULT '2026-08',
    "homeValue" INTEGER,
    "purchasePrice" INTEGER NOT NULL DEFAULT 3000000,
    "targetLvr" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
    "loanRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "loanTermYears" INTEGER NOT NULL DEFAULT 30,
    "targetDate" TEXT NOT NULL DEFAULT '2028-04',
    "targetCombinedIncome" INTEGER NOT NULL DEFAULT 405000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavingsSnapshot" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "balance" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavingsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryMilestone" (
    "id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "dueLabel" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "combinedIncome" INTEGER NOT NULL,
    "achieved" BOOLEAN NOT NULL DEFAULT false,
    "achievedAt" TIMESTAMP(3),

    CONSTRAINT "SalaryMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SavingsSnapshot_month_key" ON "SavingsSnapshot"("month");

