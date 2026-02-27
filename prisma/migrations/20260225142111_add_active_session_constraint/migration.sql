-- AlterTable
ALTER TABLE "user_exams" ADD COLUMN     "transaction_id" TEXT,
ALTER COLUMN "started_at" SET DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "user_exams" ADD CONSTRAINT "user_exams_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("order_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: Only 1 IN_PROGRESS session per user per exam (race condition guard)
CREATE UNIQUE INDEX "user_exams_active_session_unique"
ON "user_exams" ("user_id", "exam_id")
WHERE status = 'IN_PROGRESS';
