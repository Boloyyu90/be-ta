-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_user_id_fkey";

-- DropForeignKey
ALTER TABLE "user_exams" DROP CONSTRAINT "user_exams_exam_id_fkey";

-- DropForeignKey
ALTER TABLE "user_exams" DROP CONSTRAINT "user_exams_user_id_fkey";

-- AddForeignKey
ALTER TABLE "user_exams" ADD CONSTRAINT "user_exams_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_exams" ADD CONSTRAINT "user_exams_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
