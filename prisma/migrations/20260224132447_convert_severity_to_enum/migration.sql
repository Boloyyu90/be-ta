-- CreateEnum
CREATE TYPE "ProctoringSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable (Safe casting using USING)
ALTER TABLE "proctoring_events" ALTER COLUMN "severity" DROP DEFAULT;
ALTER TABLE "proctoring_events" ALTER COLUMN "severity" TYPE "ProctoringSeverity" USING "severity"::text::"ProctoringSeverity";
ALTER TABLE "proctoring_events" ALTER COLUMN "severity" SET DEFAULT 'LOW';
