-- Idempotent migration: full user data in DB

ALTER TABLE "WorkoutLog" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "WorkoutLog" ADD COLUMN IF NOT EXISTS "rpe" INTEGER;
ALTER TABLE "WorkoutLog" ADD COLUMN IF NOT EXISTS "rir" INTEGER;

ALTER TABLE "UserProfile" ADD COLUMN IF NOT EXISTS "notificationsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "DailyMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "steps" INTEGER,
    "distanceKm" DOUBLE PRECISION,
    "activeKcal" DOUBLE PRECISION,
    "totalKcal" DOUBLE PRECISION,
    "sleepHours" DOUBLE PRECISION,
    "hrv" DOUBLE PRECISION,
    "restingHr" INTEGER,
    "avgHr" INTEGER,
    "waterMl" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MealLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "WeeklyGoalState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WeeklyGoalState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CustomExercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CustomExercise_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RecoveryLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "sleepHours" DOUBLE PRECISION NOT NULL,
    "hrv" DOUBLE PRECISION,
    "score" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RecoveryLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DailyMetric_userId_date_key" ON "DailyMetric"("userId", "date");
CREATE INDEX IF NOT EXISTS "DailyMetric_userId_date_idx" ON "DailyMetric"("userId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "MealLog_userId_date_mealId_key" ON "MealLog"("userId", "date", "mealId");
CREATE INDEX IF NOT EXISTS "MealLog_userId_date_idx" ON "MealLog"("userId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyGoalState_userId_weekStart_goalId_key" ON "WeeklyGoalState"("userId", "weekStart", "goalId");
CREATE INDEX IF NOT EXISTS "WeeklyGoalState_userId_weekStart_idx" ON "WeeklyGoalState"("userId", "weekStart");
CREATE UNIQUE INDEX IF NOT EXISTS "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
CREATE INDEX IF NOT EXISTS "UserAchievement_userId_idx" ON "UserAchievement"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "CustomExercise_userId_exerciseId_key" ON "CustomExercise"("userId", "exerciseId");
CREATE INDEX IF NOT EXISTS "CustomExercise_userId_position_idx" ON "CustomExercise"("userId", "position");
CREATE UNIQUE INDEX IF NOT EXISTS "RecoveryLog_userId_date_key" ON "RecoveryLog"("userId", "date");
CREATE INDEX IF NOT EXISTS "RecoveryLog_userId_date_idx" ON "RecoveryLog"("userId", "date");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DailyMetric_userId_fkey') THEN
    ALTER TABLE "DailyMetric" ADD CONSTRAINT "DailyMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MealLog_userId_fkey') THEN
    ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WeeklyGoalState_userId_fkey') THEN
    ALTER TABLE "WeeklyGoalState" ADD CONSTRAINT "WeeklyGoalState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAchievement_userId_fkey') THEN
    ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CustomExercise_userId_fkey') THEN
    ALTER TABLE "CustomExercise" ADD CONSTRAINT "CustomExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'RecoveryLog_userId_fkey') THEN
    ALTER TABLE "RecoveryLog" ADD CONSTRAINT "RecoveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
