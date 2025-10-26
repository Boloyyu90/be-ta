/*
  Warnings:

  - The values [FACE_NOT_DETECTED,PHONE_DETECTED] on the enum `ProctoringEventType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `event_time` on the `proctoring_events` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ProctoringEventType_new" AS ENUM ('FACE_DETECTED', 'NO_FACE_DETECTED', 'MULTIPLE_FACES', 'LOOKING_AWAY');
ALTER TABLE "proctoring_events" ALTER COLUMN "event_type" TYPE "ProctoringEventType_new" USING ("event_type"::text::"ProctoringEventType_new");
ALTER TYPE "ProctoringEventType" RENAME TO "ProctoringEventType_old";
ALTER TYPE "ProctoringEventType_new" RENAME TO "ProctoringEventType";
DROP TYPE "public"."ProctoringEventType_old";
COMMIT;

-- DropIndex
DROP INDEX "public"."proctoring_events_event_time_idx";

-- AlterTable
ALTER TABLE "proctoring_events" DROP COLUMN "event_time",
ADD COLUMN     "severity" TEXT NOT NULL DEFAULT 'LOW',
ADD COLUMN     "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "proctoring_events_timestamp_idx" ON "proctoring_events"("timestamp");

-- CreateIndex
CREATE INDEX "proctoring_events_severity_idx" ON "proctoring_events"("severity");
