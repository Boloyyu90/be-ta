/*
  Warnings:

  - You are about to drop the column `timestamp` on the `proctoring_events` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "app"."proctoring_events_timestamp_idx";

-- AlterTable
ALTER TABLE "proctoring_events" DROP COLUMN "timestamp",
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "proctoring_events_created_at_idx" ON "proctoring_events"("created_at");

-- CreateIndex
CREATE INDEX "transactions_order_id_idx" ON "transactions"("order_id");
