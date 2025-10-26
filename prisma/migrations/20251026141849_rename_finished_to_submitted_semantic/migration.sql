/*
  Warnings:

  - You are about to drop the column `finished_at` on the `user_exams` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user_exams" DROP COLUMN "finished_at",
ADD COLUMN     "submitted_at" TIMESTAMP(3);
