-- AlterTable
-- Add retake support columns to exams table
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "allow_retake" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "exams" ADD COLUMN IF NOT EXISTS "max_attempts" INTEGER;

-- AlterTable
-- Add attempt_number column to user_exams table
ALTER TABLE "user_exams" ADD COLUMN IF NOT EXISTS "attempt_number" INTEGER NOT NULL DEFAULT 1;

-- Set attempt_number = 1 for all existing rows (ensuring data integrity)
UPDATE "user_exams" SET "attempt_number" = 1 WHERE "attempt_number" IS NULL OR "attempt_number" = 0;

-- DropIndex
-- Drop the old unique constraint (userId, examId) if it exists
DO $$ BEGIN
    ALTER TABLE "user_exams" DROP CONSTRAINT IF EXISTS "user_exams_user_id_exam_id_key";
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Drop the unique index if it exists (alternative form)
DROP INDEX IF EXISTS "user_exams_user_id_exam_id_key";

-- CreateIndex
-- Create new unique constraint with attemptNumber
CREATE UNIQUE INDEX IF NOT EXISTS "user_exams_user_id_exam_id_attempt_number_key" ON "user_exams"("user_id", "exam_id", "attempt_number");

-- CreateIndex
-- Create composite index for efficient querying of IN_PROGRESS sessions
CREATE INDEX IF NOT EXISTS "user_exams_user_id_exam_id_status_idx" ON "user_exams"("user_id", "exam_id", "status");
