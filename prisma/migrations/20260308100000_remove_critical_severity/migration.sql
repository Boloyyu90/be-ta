-- Remove unused CRITICAL value from ProctoringSeverity enum
-- CRITICAL was never used by determineSeverity() in proctoring.service.ts
-- and frontend Severity type only has LOW | MEDIUM | HIGH

-- Step 1: Create new enum type without CRITICAL
CREATE TYPE "ProctoringSeverity_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- Step 2: Alter column to use new type (cast via text)
ALTER TABLE "proctoring_events"
  ALTER COLUMN "severity" TYPE "ProctoringSeverity_new"
  USING ("severity"::text::"ProctoringSeverity_new");

-- Step 3: Drop old type and rename new
DROP TYPE "ProctoringSeverity";
ALTER TYPE "ProctoringSeverity_new" RENAME TO "ProctoringSeverity";
