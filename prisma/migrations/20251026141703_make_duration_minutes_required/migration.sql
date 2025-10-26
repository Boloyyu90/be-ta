/*
  Warnings:

  - Made the column `duration_minutes` on table `exams` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "exams" ALTER COLUMN "duration_minutes" SET NOT NULL,
ALTER COLUMN "duration_minutes" SET DEFAULT 60;
