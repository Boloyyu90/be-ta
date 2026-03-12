-- Fix typo: REFUNDE -> REFUNDED in TransactionStatus enum
-- The typo was introduced in migration 20260228125214_add_tkp_weighted_scoring
ALTER TYPE "TransactionStatus" RENAME VALUE 'REFUNDE' TO 'REFUNDED';
