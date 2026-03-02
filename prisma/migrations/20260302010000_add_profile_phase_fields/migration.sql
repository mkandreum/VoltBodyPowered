-- AlterTable
ALTER TABLE "UserProfile"
ADD COLUMN "goalDirection" TEXT,
ADD COLUMN "goalTargetKg" DOUBLE PRECISION,
ADD COLUMN "goalTimelineMonths" INTEGER,
ADD COLUMN "trainingDaysPerWeek" INTEGER,
ADD COLUMN "sessionMinutes" INTEGER,
ADD COLUMN "theme" TEXT,
ADD COLUMN "motivationPhrase" TEXT,
ADD COLUMN "motivationPhoto" TEXT,
ADD COLUMN "foodPreferences" JSONB,
ADD COLUMN "weeklySpecialSession" JSONB,
ADD COLUMN "specialDish" JSONB;