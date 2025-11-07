-- AlterTable
ALTER TABLE "exams" ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "exams_updated_at_idx" ON "exams"("updated_at");

-- CreateIndex
CREATE INDEX "question_bank_updated_at_idx" ON "question_bank"("updated_at");
