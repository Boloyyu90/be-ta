# Exam Retake Feature Implementation

## Overview
This document describes the implementation of the exam retake feature, which allows participants to take exams multiple times based on configured settings.

## Database Schema Changes

### New Fields in `exams` Table
- `allow_retake` (Boolean, default: false): Whether the exam allows multiple attempts
- `max_attempts` (Integer, nullable): Maximum number of attempts allowed (null = unlimited if retake is enabled)

### New Fields in `user_exams` Table
- `attempt_number` (Integer, default: 1): The attempt number for this exam session

### Modified Constraints
- **Old**: `@@unique([userId, examId])`
- **New**: `@@unique([userId, examId, attemptNumber])`

### New Indexes
- Composite index: `[userId, examId, status]` - For efficient querying of IN_PROGRESS sessions

## Partial Unique Index (Manual Step Required)

### Why It's Needed
To ensure that only ONE `IN_PROGRESS` session exists per user per exam at any time, while still allowing multiple completed attempts.

### PostgreSQL Implementation
Execute the following SQL command directly on your database:

```sql
CREATE UNIQUE INDEX CONCURRENTLY user_exams_one_in_progress_per_user_exam
ON app.user_exams (user_id, exam_id)
WHERE status = 'IN_PROGRESS';
```

**Note**: Prisma does not currently support partial indexes in the schema definition, so this must be added manually.

### Verification
To verify the index exists:

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_exams'
AND schemaname = 'app';
```

## Business Logic Changes

### `startExam` Function Flow
1. **Validate exam** - Check exam exists, has questions, and has duration set
2. **Check for IN_PROGRESS session** - If exists, resume it (return existing session)
3. **Check previous attempts** - Query for completed attempts (FINISHED, TIMEOUT, CANCELLED)
4. **Validate retake rules**:
   - If previous attempts exist and `allowRetake = false`, throw `EXAM_RETAKE_DISABLED` error
   - If previous attempts exist and `attemptNumber >= maxAttempts`, throw `EXAM_MAX_ATTEMPTS` error
5. **Create new attempt** - Create new UserExam record with incremented attemptNumber

### Error Codes
- `EXAM_SESSION_010` (EXAM_SESSION_RETAKE_DISABLED): Exam does not allow retakes
- `EXAM_SESSION_011` (EXAM_SESSION_MAX_ATTEMPTS): Maximum attempts reached

## API Response Changes

### GET `/api/v1/exams/:id` (Participant View)
Now includes attempts information:

```json
{
  "success": true,
  "message": "Exam retrieved successfully",
  "data": {
    "exam": {
      "id": 1,
      "title": "Sample Exam",
      "allowRetake": true,
      "maxAttempts": 3,
      ...
    },
    "attemptsCount": 2,
    "firstAttempt": {
      "id": 123,
      "attemptNumber": 1,
      "totalScore": 85,
      "status": "FINISHED",
      "startedAt": "2024-01-01T10:00:00Z",
      "submittedAt": "2024-01-01T11:30:00Z"
    },
    "latestAttempt": {
      "id": 124,
      "attemptNumber": 2,
      "totalScore": 92,
      "status": "FINISHED",
      "startedAt": "2024-01-02T10:00:00Z",
      "submittedAt": "2024-01-02T11:25:00Z"
    }
  }
}
```

### POST `/api/v1/exams/:id/start`
- Returns existing IN_PROGRESS session if found (resume behavior)
- Creates new attempt with incremented attemptNumber if allowed
- Throws error if retakes disabled or max attempts reached

## Frontend Integration

### Button Label Logic
Based on the exam state, the UI should display:

1. **"Mulai Ujian"** (Start Exam):
   - When `attemptsCount = 0` (no previous attempts)
   - When exam has IN_PROGRESS session (will resume)

2. **"Lanjutkan Ujian"** (Continue Exam):
   - When there is an IN_PROGRESS session for this exam

3. **"Ulangi Ujian"** (Retake Exam):
   - When `attemptsCount > 0` AND `allowRetake = true`
   - When `attemptsCount < maxAttempts` (if maxAttempts is set)
   - No IN_PROGRESS session exists

4. **Disabled/Hidden**:
   - When `allowRetake = false` AND `attemptsCount > 0`
   - When `maxAttempts` is set AND `attemptsCount >= maxAttempts`

### Displaying Scores
- **"Nilai Pertama"** (First Score): Display `firstAttempt.totalScore`
- **"Nilai Terbaru"** (Latest Score): Display `latestAttempt.totalScore`

## Ranking Logic
For leaderboards and rankings, **always use the first attempt** (`attemptNumber = 1`) to ensure fairness. This prevents users from gaming the system by retaking exams multiple times.

## Migration Steps

1. Apply the migration:
   ```bash
   npx prisma migrate deploy
   ```

2. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

3. Manually add the partial unique index (see above)

4. Restart the application

## Testing Checklist

- [ ] First attempt: User can start an exam with no previous attempts
- [ ] Resume: User can resume an IN_PROGRESS exam
- [ ] Retake allowed: User can start new attempt when `allowRetake = true`
- [ ] Retake disabled: User gets error when `allowRetake = false` and trying to retake
- [ ] Max attempts: User gets error when attempting beyond `maxAttempts`
- [ ] Partial index: Only one IN_PROGRESS session per user per exam
- [ ] Exam detail: Participants see their attempts count and first/latest scores
- [ ] Multiple sessions blocked: Cannot have two IN_PROGRESS sessions for same user/exam

## Rollback Plan

If issues arise, you can rollback the migration:

1. Revert the code changes
2. Create a rollback migration:
   ```sql
   -- Remove new columns
   ALTER TABLE "exams" DROP COLUMN "allow_retake";
   ALTER TABLE "exams" DROP COLUMN "max_attempts";

   -- Drop new constraint and index
   DROP INDEX IF EXISTS "user_exams_user_id_exam_id_attempt_number_key";
   DROP INDEX IF EXISTS "user_exams_user_id_exam_id_status_idx";
   DROP INDEX IF EXISTS user_exams_one_in_progress_per_user_exam;

   -- Restore old constraint (if data allows)
   CREATE UNIQUE INDEX "user_exams_user_id_exam_id_key"
   ON "user_exams"("user_id", "exam_id");

   -- Remove attempt_number column
   ALTER TABLE "user_exams" DROP COLUMN "attempt_number";
   ```
