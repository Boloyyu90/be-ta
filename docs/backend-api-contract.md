# Backend API Contract - Prestige Academy CPNS Exam System

> **Generated from actual backend code** (Boloyyu90/be-ta)
> **Last Updated:** January 2026
> **API Version:** v1
> **Audit Note:** Updated to reflect actual implementation including Transactions module

---

## Table of Contents

1. [Global Conventions](#1-global-conventions)
2. [Authentication](#2-authentication)
3. [API Endpoints](#3-api-endpoints)
   - [Auth Module](#31-auth-module)
   - [Users Module](#32-users-module)
   - [Questions Module](#33-questions-module)
   - [Exams Module](#34-exams-module)
   - [Exam Sessions Module](#35-exam-sessions-module)
   - [Proctoring Module](#36-proctoring-module)
   - [Transactions Module](#37-transactions-module)
4. [Shared Schemas & DTOs](#4-shared-schemas--dtos)
5. [Frontend Integration Notes](#5-frontend-integration-notes)
6. [Exam Retake Business Rules](#6-exam-retake-business-rules)
7. [Transaction Business Rules](#7-transaction-business-rules)

---

## 1. Global Conventions

### 1.1 Base URL

```
http://localhost:3001/api/v1
```

> ⚠️ **Note:** Backend runs on port **3001**, NOT 3000!

### 1.2 Authentication Scheme

- **Type:** Bearer Token (JWT)
- **Header:** `Authorization: Bearer <access_token>`
- **Access Token Expiry:** Configurable via environment
- **Refresh Token Expiry:** Configurable via environment

### 1.3 Standard Response Format

All responses follow this structure:

```typescript
// Success Response
{
  success: true,
  data: T,                    // The actual payload
  message?: string,           // Human-readable message
  timestamp: string           // ISO 8601 datetime
}

// Error Response
{
  success: false,
  message: string,            // Error description
  errorCode?: string,         // Machine-readable code (e.g., "AUTH_001")
  errors?: Array<{            // Validation errors
    field: string,
    message: string
  }>,
  context?: Record<string, any>,  // Debug info (dev only)
  timestamp: string
}
```

### 1.4 HTTP Status Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| 200  | OK - Request succeeded               |
| 201  | Created - Resource created           |
| 204  | No Content - Success with no body    |
| 400  | Bad Request - Validation error       |
| 401  | Unauthorized - Invalid/missing token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource doesn't exist   |
| 409  | Conflict - Resource already exists   |
| 500  | Internal Server Error                |
| 502  | Bad Gateway - Payment gateway error  |

### 1.5 Pagination Format

All paginated endpoints return:

```typescript
{
  data: T[],
  pagination: {
    page: number,       // Current page (1-indexed)
    limit: number,      // Items per page
    total: number,      // Total items count
    totalPages: number, // Total pages
    hasNext: boolean,   // Has next page
    hasPrev: boolean    // Has previous page
  }
}
```

**Query Parameters:**

- `page` - Page number (default: 1, min: 1)
- `limit` - Items per page (default: 10, max: 100)

### 1.6 Date Format

All dates are **ISO 8601** strings:

```
"2025-01-15T10:30:00.000Z"
```

### 1.7 Enums

```typescript
// User Roles (Prisma: UserRole)
type UserRole = "ADMIN" | "PARTICIPANT";

// Exam Session Status (Prisma: ExamStatus)
type ExamStatus = "IN_PROGRESS" | "FINISHED" | "CANCELLED" | "TIMEOUT";

// Question Types (Prisma: QuestionType)
type QuestionType = "TIU" | "TKP" | "TWK";

// Token Types (Prisma: TokenType)
type TokenType = "ACCESS" | "REFRESH" | "RESET_PASSWORD" | "VERIFY_EMAIL";

// Proctoring Event Types (Prisma: ProctoringEventType)
type ProctoringEventType =
  | "FACE_DETECTED"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES"
  | "LOOKING_AWAY";

// Transaction Status (Prisma: TransactionStatus)
type TransactionStatus =
  | "PENDING" // Waiting for payment (Snap token generated)
  | "PAID" // Payment successful (settlement received)
  | "EXPIRED" // Payment window expired (24 hours default)
  | "CANCELLED" // Cancelled by user or system
  | "FAILED" // Payment failed (denied, error)
  | "REFUNDED"; // Refunded (future use)

// Answer Options
type AnswerOption = "A" | "B" | "C" | "D" | "E" | null;

// Severity Levels
type Severity = "LOW" | "MEDIUM" | "HIGH";
```

### 1.8 Rate Limits

| Endpoint Group        | Limit        | Window     |
| --------------------- | ------------ | ---------- |
| Global                | 100 requests | 15 minutes |
| Auth (login/register) | 5 requests   | 15 minutes |
| Token Refresh         | 10 requests  | 15 minutes |
| Proctoring            | 30 requests  | 1 minute   |
| Transactions          | 10 requests  | 15 minutes |
| Webhook               | 100 requests | 1 minute   |

### 1.9 MVP Scope Definition

This API contract documents the **implemented and tested** backend functionality.
The following features are explicitly **OUT OF SCOPE** for MVP:

#### Not Implemented (Backend)

- Email verification flow (field exists but not enforced)
- Password reset functionality
- Exam time window enforcement at API level

#### Frontend Responsibility

- Time window display/blocking (startTime/endTime validation)
- Offline answer queuing (graceful degradation)
- Progressive violation warnings UI

#### Planned Post-MVP

- WebSocket for real-time proctoring updates
- Batch answer submission endpoint
- Exam analytics/reporting endpoints

---

## 2. Authentication

### 2.1 Token Flow

1. **Login/Register** → Returns `{ accessToken, refreshToken }`
2. **API Calls** → Send `Authorization: Bearer <accessToken>`
3. **401 Response** → Call `/auth/refresh` with `refreshToken`
4. **New Tokens** → Store and retry original request
5. **Logout** → Call `/auth/logout` to invalidate `refreshToken`

### 2.2 Role-Based Access

| Route Pattern                   | Required Role    |
| ------------------------------- | ---------------- |
| `/api/v1/auth/*`                | Public (no auth) |
| `/api/v1/questions/cpns-config` | Public (no auth) |
| `/api/v1/transactions/webhook`  | Public (no auth) |
| `/api/v1/me/*`                  | Authenticated    |
| `/api/v1/exams/*`               | Authenticated    |
| `/api/v1/exam-sessions/*`       | Authenticated    |
| `/api/v1/results/*`             | Authenticated    |
| `/api/v1/proctoring/*`          | Authenticated    |
| `/api/v1/transactions/*`        | Authenticated    |
| `/api/v1/admin/*`               | ADMIN only       |

---

## 3. API Endpoints

### 3.1 Auth Module

#### POST `/auth/register`

**Access:** Public

**Request Body:**

```typescript
{
  email: string,      // Valid email, lowercase, trimmed
  password: string,   // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
  name: string        // 2-100 characters
}
```

**Response (201):**

```typescript
{
  success: true,
  data: {
    user: {
      id: number,
      email: string,
      name: string,
      role: 'PARTICIPANT',  // Default for new users
      isEmailVerified: boolean,
      createdAt: string,
      updatedAt: string
    },
    tokens: {
      accessToken: string,
      refreshToken: string
    }
  },
  message: "Registration successful",
  timestamp: string
}
```

**Errors:**

- `409` - Email already exists (`AUTH_EMAIL_EXISTS`)

---

#### POST `/auth/login`

**Access:** Public

**Request Body:**

```typescript
{
  email: string,
  password: string
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    user: User,
    tokens: TokensData
  },
  message: "Login successful",
  timestamp: string
}
```

**Errors:**

- `401` - Invalid credentials (`AUTH_INVALID_CREDENTIALS`)

---

#### POST `/auth/refresh`

**Access:** Public

**Request Body:**

```typescript
{
  refreshToken: string;
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    tokens: {
      accessToken: string,
      refreshToken: string
    }
  },
  message: "Token refreshed successfully",
  timestamp: string
}
```

**Errors:**

- `401` - Invalid/expired refresh token (`AUTH_INVALID_TOKEN`)

---

#### POST `/auth/logout`

**Access:** Public

**Request Body:**

```typescript
{
  refreshToken: string;
}
```

**Response (200):**

```typescript
{
  success: true,
  data: { success: true },
  message: "Logout successful",
  timestamp: string
}
```

---

### 3.2 Users Module

#### GET `/me`

**Access:** Authenticated

**Response (200):**

```typescript
{
  success: true,
  data: {
    user: User
  },
  message: "User profile retrieved successfully",
  timestamp: string
}
```

---

#### PATCH `/me`

**Access:** Authenticated

**Request Body:**

```typescript
{
  name?: string,           // 2-100 characters
  currentPassword?: string, // Required if changing password
  newPassword?: string     // Min 8 chars, complexity requirements
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    user: User
  },
  message: "Profile updated successfully",
  timestamp: string
}
```

---

#### GET `/me/stats`

**Access:** Authenticated

**Response (200):**

```typescript
{
  success: true,
  data: {
    completedExams: number,      // Count of FINISHED exams
    averageScore: number | null, // Average totalScore, null if none
    totalTimeMinutes: number,    // Total time on FINISHED exams
    activeExams: number          // Count of IN_PROGRESS exams
  },
  message: "User statistics retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/users`

**Access:** Admin only

**Query Parameters:**

- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10, max: 100)
- `role` - Filter by role (ADMIN | PARTICIPANT)
- `search` - Search by name or email

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: User[],
    pagination: Pagination
  },
  message: "Users retrieved successfully",
  timestamp: string
}
```

---

#### POST `/admin/users`

**Access:** Admin only

**Request Body:**

```typescript
{
  email: string,
  password: string,
  name: string,
  role?: UserRole  // Default: PARTICIPANT
}
```

**Response (201):**

```typescript
{
  success: true,
  data: { user: User },
  message: "User created successfully",
  timestamp: string
}
```

---

#### GET `/admin/users/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: { user: User },
  message: "User retrieved successfully",
  timestamp: string
}
```

---

#### PATCH `/admin/users/:id`

**Access:** Admin only

**Request Body:**

```typescript
{
  name?: string,
  email?: string,
  role?: UserRole,
  password?: string
}
```

**Response (200):**

```typescript
{
  success: true,
  data: { user: User },
  message: "User updated successfully",
  timestamp: string
}
```

---

#### DELETE `/admin/users/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: { success: true },
  message: "User deleted successfully",
  timestamp: string
}
```

---

### 3.3 Questions Module

#### GET `/questions/cpns-config`

**Access:** Public

**Response (200):**

```typescript
{
  success: true,
  data: {
    passingGrades: {
      TWK: 65,
      TIU: 80,
      TKP: 166
    },
    totalPassingScore: 311,
    categories: [
      { type: "TWK", name: "Tes Wawasan Kebangsaan", passingGrade: 65 },
      { type: "TIU", name: "Tes Intelegensi Umum", passingGrade: 80 },
      { type: "TKP", name: "Tes Karakteristik Pribadi", passingGrade: 166 }
    ]
  },
  message: "CPNS configuration retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/questions`

**Access:** Admin only

**Query Parameters:**

- `page`, `limit` - Pagination
- `questionType` - Filter by TIU | TKP | TWK
- `search` - Search in content

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: Question[],
    pagination: Pagination
  },
  message: "Questions retrieved successfully",
  timestamp: string
}
```

---

#### POST `/admin/questions`

**Access:** Admin only

**Request Body:**

```typescript
{
  content: string,
  options: {
    A: string,
    B: string,
    C: string,
    D: string,
    E: string
  },
  correctAnswer: "A" | "B" | "C" | "D" | "E",
  questionType: "TIU" | "TKP" | "TWK",
  defaultScore?: number  // Default: 1
}
```

**Response (201):**

```typescript
{
  success: true,
  data: { question: Question },
  message: "Question created successfully",
  timestamp: string
}
```

---

#### GET `/admin/questions/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: { question: Question },
  message: "Question retrieved successfully",
  timestamp: string
}
```

---

#### PATCH `/admin/questions/:id`

**Access:** Admin only

**Request Body:** (all optional)

```typescript
{
  content?: string,
  options?: QuestionOptions,
  correctAnswer?: AnswerOption,
  questionType?: QuestionType,
  defaultScore?: number
}
```

**Response (200):**

```typescript
{
  success: true,
  data: { question: Question },
  message: "Question updated successfully",
  timestamp: string
}
```

---

#### DELETE `/admin/questions/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: { success: true },
  message: "Question deleted successfully",
  timestamp: string
}
```

---

### 3.4 Exams Module

#### GET `/exams`

**Access:** Authenticated

**Query Parameters:**

- `page`, `limit` - Pagination
- `search` - Search in title/description
- `sortBy` - Sort field (title | createdAt | durationMinutes)
- `sortOrder` - asc | desc

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: ExamWithCount[],  // Includes _count.examQuestions
    pagination: Pagination
  },
  message: "Exams retrieved successfully",
  timestamp: string
}
```

---

#### GET `/exams/:id`

**Access:** Authenticated

**Response (200):**

```typescript
{
  success: true,
  data: {
    exam: Exam,
    questionCount: number,
    userAttempts: UserExam[],  // User's attempts on this exam
    firstAttempt?: ExamAttemptInfo | null,
    latestAttempt?: ExamAttemptInfo | null
  },
  message: "Exam retrieved successfully",
  timestamp: string
}
```

---

#### POST `/exams/:id/start`

**Access:** Authenticated

**Response (200/201):**

```typescript
{
  success: true,
  data: {
    userExam: {
      id: number,
      examId: number,
      userId: number,
      attemptNumber: number,
      status: ExamStatus,
      startedAt: string,
      submittedAt: string | null,
      totalScore: number | null,
      remainingTimeMs: number
    },
    questions: ExamQuestion[],  // Questions without correctAnswer
    answers: Answer[]           // Existing answers (for resume)
  },
  message: "Exam started successfully" | "Exam session resumed",
  timestamp: string
}
```

**Errors:**

- `400` - Exam has no questions (`EXAM_NO_QUESTIONS`)
- `400` - Exam duration not set (`EXAM_NO_DURATION`)
- `400` - Retakes disabled (`EXAM_SESSION_RETAKE_DISABLED`)
- `400` - Max attempts reached (`EXAM_SESSION_MAX_ATTEMPTS`)
- `402` - Payment required for paid exam (`PAYMENT_REQUIRED`)

---

#### GET `/admin/exams`

**Access:** Admin only

**Query Parameters:**

- `page`, `limit` - Pagination
- `search` - Search in title
- `createdBy` - Filter by creator ID
- `sortBy`, `sortOrder` - Sorting

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: ExamWithCount[],
    pagination: Pagination
  },
  message: "Exams retrieved successfully",
  timestamp: string
}
```

---

#### POST `/admin/exams`

**Access:** Admin only

**Request Body:**

```typescript
{
  title: string,
  description?: string,
  durationMinutes: number,      // Min: 1
  passingScore?: number,        // Default: 0
  allowRetake?: boolean,        // Default: false
  maxAttempts?: number | null,  // Default: null (unlimited when retakes enabled)
  price?: number | null,        // Default: null (free exam)
  startTime?: string,           // ISO datetime
  endTime?: string              // ISO datetime
}
```

**Response (201):**

```typescript
{
  success: true,
  data: { exam: Exam },
  message: "Exam created successfully",
  timestamp: string
}
```

---

#### GET `/admin/exams/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: { exam: Exam },
  message: "Exam retrieved successfully",
  timestamp: string
}
```

---

#### PATCH `/admin/exams/:id`

**Access:** Admin only

**Request Body:** (all optional)

```typescript
{
  title?: string,
  description?: string,
  durationMinutes?: number,
  passingScore?: number,
  allowRetake?: boolean,
  maxAttempts?: number | null,
  price?: number | null,
  startTime?: string,
  endTime?: string
}
```

**Response (200):**

```typescript
{
  success: true,
  data: { exam: Exam },
  message: "Exam updated successfully",
  timestamp: string
}
```

---

#### DELETE `/admin/exams/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: { success: true },
  message: "Exam deleted successfully",
  timestamp: string
}
```

---

#### GET `/admin/exams/:id/questions`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: {
    questions: ExamQuestionWithAnswer[]  // Includes correctAnswer
  },
  message: "Exam questions retrieved successfully",
  timestamp: string
}
```

---

#### POST `/admin/exams/:id/questions`

**Access:** Admin only

**Request Body:**

```typescript
{
  questionIds: number[]  // Array of question bank IDs to attach
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    attached: number,
    alreadyAttached: number
  },
  message: "Questions attached successfully",
  timestamp: string
}
```

---

#### DELETE `/admin/exams/:id/questions`

**Access:** Admin only

**Request Body:**

```typescript
{
  questionIds: number[]  // Array of question bank IDs to detach
}
```

**Response (200):**

```typescript
{
  success: true,
  data: { detached: number },
  message: "Questions detached successfully",
  timestamp: string
}
```

---

### 3.5 Exam Sessions Module

#### GET `/exam-sessions`

**Access:** Authenticated

**Query Parameters:**

- `page`, `limit` - Pagination
- `status` - Filter by ExamStatus

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: UserExam[],
    pagination: Pagination
  },
  message: "Exam sessions retrieved successfully",
  timestamp: string
}
```

---

#### GET `/exam-sessions/:id`

**Access:** Authenticated (own session only)

**Response (200):**

```typescript
{
  success: true,
  data: {
    userExam: UserExam,
    remainingTimeMs: number
  },
  message: "Exam session retrieved successfully",
  timestamp: string
}
```

---

#### GET `/exam-sessions/:id/questions`

**Access:** Authenticated (own session only, IN_PROGRESS status)

**Response (200):**

```typescript
{
  success: true,
  data: {
    questions: ExamQuestion[],  // Without correctAnswer
    total: number
  },
  message: "Questions retrieved successfully",
  timestamp: string
}
```

---

#### POST `/exam-sessions/:id/answers`

**Access:** Authenticated (own session only, IN_PROGRESS status)

**Request Body:**

```typescript
{
  examQuestionId: number,           // ⚠️ NOT questionId!
  selectedOption: "A" | "B" | "C" | "D" | "E" | null
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    answer: {
      id: number,
      examQuestionId: number,
      selectedOption: string | null,
      answeredAt: string
    }
  },
  message: "Answer saved successfully",
  timestamp: string
}
```

**Errors:**

- `400` - Invalid examQuestionId (`EXAM_SESSION_INVALID_QUESTION`)
- `400` - Session timeout (`EXAM_SESSION_TIMEOUT`)
- `400` - Already submitted (`EXAM_SESSION_ALREADY_SUBMITTED`)

---

#### GET `/exam-sessions/:id/answers`

**Access:** Authenticated (own session only, FINISHED status)

**Response (200):**

```typescript
{
  success: true,
  data: {
    answers: AnswerWithReview[],  // Includes isCorrect, question with correctAnswer
    total: number
  },
  message: "Answers retrieved successfully",
  timestamp: string
}
```

---

#### POST `/exam-sessions/:id/submit`

**Access:** Authenticated (own session only, IN_PROGRESS status)

**Response (200):**

```typescript
{
  success: true,
  data: {
    userExam: {
      id: number,
      status: "FINISHED",
      submittedAt: string,
      totalScore: number
    },
    scoresByType: ScoreByType[]
  },
  message: "Exam submitted successfully",
  timestamp: string
}
```

---

#### GET `/results`

**Access:** Authenticated

**Query Parameters:**

- `page`, `limit` - Pagination

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: ExamResult[],
    pagination: Pagination
  },
  message: "Results retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/exam-sessions`

**Access:** Admin only

**Query Parameters:**

- `page`, `limit` - Pagination
- `status` - Filter by ExamStatus
- `examId` - Filter by exam
- `userId` - Filter by user

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: UserExamWithDetails[],  // Includes user and exam info
    pagination: Pagination
  },
  message: "Exam sessions retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/exam-sessions/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: {
    userExam: UserExamWithDetails
  },
  message: "Exam session retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/exam-sessions/:id/answers`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: {
    answers: AnswerWithReview[],
    total: number
  },
  message: "Answers retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/results`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: ExamResult[],
    pagination: Pagination
  },
  message: "Results retrieved successfully",
  timestamp: string
}
```

---

### 3.6 Proctoring Module

#### POST `/proctoring/events`

**Access:** Authenticated

**Request Body:**

```typescript
{
  userExamId: number,
  eventType: ProctoringEventType,
  metadata?: Record<string, any>
}
```

**Response (200):**

```typescript
{
  success: true,
  data: { event: ProctoringEvent },
  message: "Event logged successfully",
  timestamp: string
}
```

---

#### POST `/proctoring/exam-sessions/:userExamId/analyze-face`

**Access:** Authenticated (own session only)

> ⚠️ **CRITICAL:** This is the ML integration endpoint for thesis demonstration!

**Rate Limit:** 30 requests/minute

**Request Body:**

```typescript
{
  imageBase64: string; // Base64 encoded image (min 100 chars)
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    analysis: {
      faceDetected: boolean,
      faceCount: number,
      boundingBoxes: BoundingBox[],
      confidence: number
    },
    eventLogged: boolean,
    eventType: ProctoringEventType | null,
    usedFallback: boolean
  },
  message: "Face analysis completed",
  timestamp: string
}
```

---

#### GET `/proctoring/exam-sessions/:userExamId/events`

**Access:** Authenticated (own session only)

**Query Parameters:**

- `page`, `limit` - Pagination
- `eventType` - Filter by event type
- `startDate`, `endDate` - Date range filter
- `sortOrder` - asc | desc

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: ProctoringEvent[],
    pagination: Pagination
  },
  message: "Events retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/proctoring/events`

**Access:** Admin only

**Query Parameters:**

- `page`, `limit` - Pagination
- `eventType` - Filter by event type
- `userExamId` - Filter by session
- `startDate`, `endDate` - Date range filter
- `sortOrder` - asc | desc

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: ProctoringEventWithDetails[],
    pagination: Pagination
  },
  message: "Events retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/proctoring/exam-sessions/:userExamId/events`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: {
    data: ProctoringEvent[],
    pagination: Pagination
  },
  message: "Events retrieved successfully",
  timestamp: string
}
```

---

### 3.7 Transactions Module

#### POST `/transactions/webhook`

**Access:** Public (called by Midtrans servers)

> ⚠️ **CRITICAL:** Do NOT add authentication to this endpoint!

**Rate Limit:** 100 requests/minute

**Request Body:** (Midtrans notification payload)

```typescript
{
  transaction_time: string,
  transaction_status: string,
  transaction_id: string,
  status_message: string,
  status_code: string,
  signature_key: string,
  payment_type: string,
  order_id: string,
  merchant_id: string,
  gross_amount: string,
  fraud_status?: string,
  currency: string,
  va_numbers?: Array<{ va_number: string, bank: string }>,
  issuer?: string,
  acquirer?: string
}
```

**Response (200):**

```typescript
{
  success: true,
  data: {
    transactionId: number,
    status: TransactionStatus
  },
  message: "Webhook processed successfully",
  timestamp: string
}
```

---

#### GET `/transactions/config/client-key`

**Access:** Authenticated

**Response (200):**

```typescript
{
  success: true,
  data: { clientKey: string },
  message: "Client key retrieved successfully",
  timestamp: string
}
```

---

#### GET `/transactions/exam/:examId/access`

**Access:** Authenticated

**Response (200):**

```typescript
{
  success: true,
  data: {
    hasAccess: boolean,
    reason: "free" | "paid" | "pending" | "not_purchased",
    transaction: Transaction | null,
    exam: {
      id: number,
      title: string,
      price: number | null
    }
  },
  message: "User has access to this exam" | "User does not have access to this exam",
  timestamp: string
}
```

---

#### GET `/transactions/order/:orderId`

**Access:** Authenticated (own transactions only)

**Response (200):**

```typescript
{
  success: true,
  data: { transaction: Transaction },
  message: "Transaction retrieved successfully",
  timestamp: string
}
```

---

#### POST `/transactions`

**Access:** Authenticated

**Rate Limit:** 10 requests/15 minutes

**Request Body:**

```typescript
{
  examId: number;
}
```

**Response (201):**

```typescript
{
  success: true,
  data: {
    transaction: Transaction,
    snapToken: string,          // For Midtrans Snap popup
    snapRedirectUrl: string,    // Alternative redirect URL
    clientKey: string           // Midtrans client key
  },
  message: "Transaction created successfully",
  timestamp: string
}
```

**Errors:**

- `400` - Exam is free (`This exam is free and does not require payment`)
- `409` - Already has access (`You already have access to this exam`)
- `502` - Payment gateway error (`Failed to initialize payment`)

---

#### GET `/transactions`

**Access:** Authenticated (own transactions only)

**Query Parameters:**

- `page`, `limit` - Pagination
- `status` - Filter by TransactionStatus
- `examId` - Filter by exam
- `sortOrder` - asc | desc

**Response (200):**

```typescript
{
  success: true,
  data: {
    transactions: Transaction[],
    pagination: Pagination
  },
  message: "Transactions retrieved successfully",
  timestamp: string
}
```

---

#### GET `/transactions/:id`

**Access:** Authenticated (own transactions only)

**Response (200):**

```typescript
{
  success: true,
  data: { transaction: Transaction },
  message: "Transaction retrieved successfully",
  timestamp: string
}
```

---

#### POST `/transactions/:id/cancel`

**Access:** Authenticated (own transactions only, PENDING status only)

**Response (200):**

```typescript
{
  success: true,
  data: { transaction: Transaction },
  message: "Transaction cancelled successfully",
  timestamp: string
}
```

---

#### POST `/transactions/:id/sync`

**Access:** Authenticated (own transactions only)

**Response (200):**

```typescript
{
  success: true,
  data: { transaction: Transaction },
  message: "Transaction status synced successfully",
  timestamp: string
}
```

---

#### GET `/admin/transactions`

**Access:** Admin only

**Query Parameters:**

- `page`, `limit` - Pagination
- `status` - Filter by TransactionStatus
- `examId` - Filter by exam
- `sortOrder` - asc | desc

**Response (200):**

```typescript
{
  success: true,
  data: {
    transactions: TransactionWithDetails[],
    pagination: Pagination
  },
  message: "All transactions retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/transactions/stats`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: {
    total: number,
    byStatus: Record<TransactionStatus, number>,
    totalRevenue: number,
    todayRevenue: number
  },
  message: "Transaction statistics retrieved successfully",
  timestamp: string
}
```

---

#### POST `/admin/transactions/cleanup`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: {
    expiredCount: number
  },
  message: "Cleanup completed: X transactions marked as expired",
  timestamp: string
}
```

---

#### GET `/admin/transactions/:id`

**Access:** Admin only

**Response (200):**

```typescript
{
  success: true,
  data: { transaction: TransactionWithDetails },
  message: "Transaction retrieved successfully",
  timestamp: string
}
```

---

## 4. Shared Schemas & DTOs

### 4.1 User

```typescript
interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 4.2 Exam

```typescript
interface Exam {
  id: number;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  passingScore: number;
  allowRetake: boolean;
  maxAttempts: number | null;
  price: number | null; // null = free exam
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface ExamWithCount extends Exam {
  _count: {
    examQuestions: number;
  };
}
```

### 4.3 Question

```typescript
interface Question {
  id: number;
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  questionType: QuestionType;
  defaultScore: number;
  createdAt: string;
  updatedAt: string;
}

// For participant view (no correctAnswer)
interface ExamQuestion {
  id: number; // examQuestionId (use this for answers!)
  orderNumber: number;
  question: Omit<Question, "correctAnswer">;
}
```

### 4.4 UserExam (Session)

```typescript
interface UserExam {
  id: number;
  userId: number;
  examId: number;
  attemptNumber: number;
  status: ExamStatus;
  startedAt: string;
  submittedAt: string | null;
  totalScore: number | null;
}

interface UserExamWithDetails extends UserExam {
  user: { id: number; name: string; email: string };
  exam: { id: number; title: string };
  remainingTimeMs: number;
}
```

### 4.5 Answer

```typescript
interface Answer {
  id: number;
  examQuestionId: number;
  selectedOption: AnswerOption;
  isCorrect: boolean | null;
  answeredAt: string | null;
}

interface AnswerWithReview extends Answer {
  examQuestion: {
    orderNumber: number;
    question: Question; // Includes correctAnswer
  };
}
```

### 4.6 Transaction

```typescript
interface Transaction {
  id: number;
  orderId: string; // Midtrans order ID (TRX-timestamp-random)
  userId: number;
  examId: number;
  amount: number;
  status: TransactionStatus;
  paymentType: string | null; // e.g., "bank_transfer", "gopay"
  snapToken: string | null;
  snapRedirectUrl: string | null;
  paidAt: string | null;
  expiredAt: string | null;
  metadata: any | null;
  createdAt: string;
  updatedAt: string;
  exam: {
    id: number;
    title: string;
    price: number | null;
  };
}

interface TransactionWithDetails extends Transaction {
  user: {
    id: number;
    name: string;
    email: string;
  };
}
```

### 4.7 ProctoringEvent

```typescript
interface ProctoringEvent {
  id: number;
  userExamId: number;
  eventType: ProctoringEventType;
  metadata: Record<string, any> | null;
  createdAt: string;
}

interface ProctoringEventWithDetails extends ProctoringEvent {
  userExam: {
    id: number;
    attemptNumber: number;
    user: { id: number; name: string };
    exam: { id: number; title: string };
  };
}
```

### 4.8 ScoreByType

```typescript
interface ScoreByType {
  type: QuestionType;
  score: number;
  maxScore: number;
  correctAnswers: number;
  totalQuestions: number;
  passingGrade: number;
  isPassing: boolean;
}
```

### 4.9 Pagination

```typescript
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### 4.10 TokensData

```typescript
interface TokensData {
  accessToken: string;
  refreshToken: string;
}
```

---

## 5. Frontend Integration Notes

### 5.1 Response Wrapper Handling

**All responses are wrapped in `ApiResponse<T>`:**

```typescript
// What axios receives:
{
  success: true,
  data: { user: {...} },    // ← This is what you want
  message: "...",
  timestamp: "..."
}

// Frontend api client should extract `data`:
const response = await apiClient.get<UserPayload>('/me');
// response.data contains { user: {...} }
```

### 5.2 List Endpoints Pattern

**All list endpoints return:**

```typescript
{
  data: T[],           // Array of items
  pagination: {...}    // Pagination metadata
}
```

**NOT this:**

```typescript
{
  items: T[],  // ❌ Wrong
  users: T[]   // ❌ Wrong
}
```

### 5.3 Critical Field Names

| Correct          | Wrong                         |
| ---------------- | ----------------------------- |
| `data`           | `items`, `users`, `exams`     |
| `page`           | `currentPage`                 |
| `limit`          | `pageSize`, `perPage`         |
| `total`          | `totalItems`, `count`         |
| `hasNext`        | `hasMore`                     |
| `metadata`       | `eventData` (proctoring)      |
| `examQuestionId` | `questionId` (for answers)    |
| `attemptNumber`  | `attempt`, `attemptNo`        |
| `allowRetake`    | `retakeAllowed`, `canRetake`  |
| `maxAttempts`    | `attemptsLimit`, `maxRetries` |
| `price`          | `cost`, `fee`                 |

### 5.4 Enum Value Mapping

**ExamStatus:** Backend uses `FINISHED`, not `COMPLETED`!

```typescript
// ✅ Correct
type ExamStatus = "IN_PROGRESS" | "FINISHED" | "CANCELLED" | "TIMEOUT";

// ❌ Wrong
type ExamStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "TIMEOUT";
```

### 5.5 Date Handling

Dates come as ISO strings. Parse them on frontend:

```typescript
// Backend sends: "2025-01-15T10:30:00.000Z"
const date = new Date(response.createdAt);
```

### 5.6 Answer Submission

**Use `examQuestionId`, NOT `questionId`!**

```typescript
// ✅ Correct
await api.post(`/exam-sessions/${sessionId}/answers`, {
  examQuestionId: 123, // From startExam response
  selectedOption: "A",
});

// ❌ Wrong - will fail
await api.post(`/exam-sessions/${sessionId}/answers`, {
  questionId: 123, // This is the question bank ID!
  selectedOption: "A",
});
```

### 5.7 Proctoring Integration

**Rate limit:** 30 requests/minute

```typescript
// Debounce face analysis to ~3-5 second intervals
const analyzeFace = useDebouncedCallback(
  async (imageBase64: string) => {
    const result = await proctoringApi.analyzeFace(sessionId, { imageBase64 });
    if (result.eventLogged) {
      // Show warning to user
    }
  },
  3000, // 3 seconds
);
```

### 5.8 Exam Retake Integration

**Check if user can start/retake an exam:**

```typescript
interface ExamSession {
  attemptNumber: number;
  status: ExamStatus;
  // ...other fields
}

interface Exam {
  allowRetake: boolean;
  maxAttempts: number | null;
  // ...other fields
}

function canStartExam(exam: Exam, sessions: ExamSession[]): boolean {
  const completedAttempts = sessions.filter((s) => s.status !== "IN_PROGRESS");

  // First attempt - always allowed
  if (completedAttempts.length === 0) return true;

  // Check if retakes are enabled
  if (!exam.allowRetake) return false;

  // Check max attempts
  if (exam.maxAttempts && completedAttempts.length >= exam.maxAttempts) {
    return false;
  }

  return true;
}

// Check if user has an in-progress session to resume
function hasInProgressSession(sessions: ExamSession[]): ExamSession | null {
  return sessions.find((s) => s.status === "IN_PROGRESS") || null;
}
```

### 5.9 Transaction/Payment Integration

**Midtrans Snap Integration:**

```typescript
// 1. Create transaction
const { snapToken, clientKey } = await transactionsApi.createTransaction({
  examId,
});

// 2. Load Midtrans Snap
const snap = window.snap; // Loaded via script tag
snap.pay(snapToken, {
  onSuccess: (result) => {
    // Payment successful - refresh access
    checkExamAccess(examId);
  },
  onPending: (result) => {
    // Waiting for payment
  },
  onError: (error) => {
    // Payment failed
  },
  onClose: () => {
    // User closed popup without completing
  },
});
```

**Check exam access before starting:**

```typescript
const access = await transactionsApi.checkExamAccess(examId);

if (!access.hasAccess) {
  if (access.reason === "not_purchased") {
    // Show payment flow
  } else if (access.reason === "pending") {
    // Show "payment pending" message
  }
}
```

### 5.10 Error Code Reference

| Code                             | Module       | Meaning                                              |
| -------------------------------- | ------------ | ---------------------------------------------------- |
| `AUTH_EMAIL_EXISTS`              | Auth         | Email already registered                             |
| `AUTH_INVALID_CREDENTIALS`       | Auth         | Wrong email/password                                 |
| `AUTH_INVALID_TOKEN`             | Auth         | Token expired/invalid                                |
| `USER_NOT_FOUND`                 | Users        | User ID doesn't exist                                |
| `EXAM_NOT_FOUND`                 | Exams        | Exam ID doesn't exist                                |
| `EXAM_NO_QUESTIONS`              | Exams        | Exam has 0 questions                                 |
| `EXAM_NO_DURATION`               | Exams        | Duration not set                                     |
| `EXAM_SESSION_NOT_FOUND`         | Sessions     | Session doesn't exist                                |
| `EXAM_SESSION_ALREADY_STARTED`   | Sessions     | Can't restart submitted exam (when retakes disabled) |
| `EXAM_SESSION_TIMEOUT`           | Sessions     | Time limit exceeded                                  |
| `EXAM_SESSION_ALREADY_SUBMITTED` | Sessions     | Already finalized                                    |
| `EXAM_SESSION_INVALID_QUESTION`  | Sessions     | examQuestionId not in exam                           |
| `EXAM_SESSION_RETAKE_DISABLED`   | Sessions     | Exam does not allow retakes                          |
| `EXAM_SESSION_MAX_ATTEMPTS`      | Sessions     | Maximum attempts reached for this exam               |
| `PAYMENT_REQUIRED`               | Transactions | Paid exam requires payment                           |
| `TRANSACTION_NOT_FOUND`          | Transactions | Transaction doesn't exist                            |
| `TRANSACTION_ALREADY_PAID`       | Transactions | Cannot cancel paid transaction                       |

---

## 6. Exam Retake Business Rules

### 6.1 Database Constraints

The system enforces exam retake rules at the database level:

1. **Unique Constraint:** `UserExam` has a unique constraint on `[userId, examId, attemptNumber]`, allowing multiple attempts per user-exam pair with distinct attempt numbers.

2. **Partial Unique Index:** Only one `IN_PROGRESS` session is allowed per user-exam combination, enforced via:

   ```sql
   CREATE UNIQUE INDEX user_exams_one_in_progress_per_user_exam
   ON user_exams (user_id, exam_id)
   WHERE status = 'IN_PROGRESS';
   ```

3. **Performance Index:** Composite index on `[userId, examId, status]` ensures efficient queries for checking existing sessions.

### 6.2 Retake Flow

```
1. User calls POST /exams/:id/start
   │
   ├─► Check for IN_PROGRESS session
   │   └─► Found? Resume existing session
   │
   ├─► No IN_PROGRESS? Check completed attempts
   │   │
   │   ├─► No completed attempts? Create first attempt (attemptNumber = 1)
   │   │
   │   └─► Has completed attempts?
   │       │
   │       ├─► exam.allowRetake = false?
   │       │   └─► Error: EXAM_SESSION_RETAKE_DISABLED
   │       │
   │       ├─► exam.maxAttempts reached?
   │       │   └─► Error: EXAM_SESSION_MAX_ATTEMPTS
   │       │
   │       └─► Create new attempt (attemptNumber = lastAttempt + 1)
   │
   └─► Return UserExam with questions and answers
```

### 6.3 Attempt Tracking

Each `UserExam` record includes:

- `attemptNumber`: Sequential attempt number (1, 2, 3, ...)
- All attempts are preserved for audit and analytics
- Users can view results from all their attempts

---

## 7. Transaction Business Rules

### 7.1 Exam Access Flow

```
1. User wants to start exam
   │
   ├─► Check exam.price
   │   │
   │   ├─► price = null or 0? (FREE EXAM)
   │   │   └─► Grant immediate access
   │   │
   │   └─► price > 0? (PAID EXAM)
   │       │
   │       └─► Check transactions
   │           │
   │           ├─► Has PAID transaction?
   │           │   └─► Grant access
   │           │
   │           ├─► Has PENDING transaction?
   │           │   └─► Return existing (idempotent)
   │           │
   │           └─► No valid transaction?
   │               └─► Error: PAYMENT_REQUIRED
```

### 7.2 Transaction Lifecycle

```
PENDING ─────────────► PAID (settlement)
    │                    │
    │                    └─► Access granted
    │
    ├─► EXPIRED (24h timeout)
    │
    ├─► CANCELLED (user action)
    │
    └─► FAILED (payment denied)
```

### 7.3 Idempotency

- Creating transaction for same user+exam returns existing PENDING transaction
- Expired transactions are lazily cleaned when accessed
- Multiple EXPIRED/CANCELLED transactions are allowed per user-exam

### 7.4 Webhook Security

- Signature verification using SHA-512
- Constant-time comparison to prevent timing attacks
- Always returns 200 OK to prevent Midtrans retries

---

## Appendix: Complete Route Map

### Public Routes (No Auth)

```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/questions/cpns-config
POST /api/v1/transactions/webhook
```

### Participant Routes (Authenticated)

```
GET   /api/v1/me
PATCH /api/v1/me
GET   /api/v1/me/stats
GET   /api/v1/exams
GET   /api/v1/exams/:id
POST  /api/v1/exams/:id/start
GET   /api/v1/exam-sessions
GET   /api/v1/exam-sessions/:id
GET   /api/v1/exam-sessions/:id/questions
POST  /api/v1/exam-sessions/:id/answers
POST  /api/v1/exam-sessions/:id/submit
GET   /api/v1/exam-sessions/:id/answers
GET   /api/v1/results
POST  /api/v1/proctoring/events
POST  /api/v1/proctoring/exam-sessions/:id/analyze-face
GET   /api/v1/proctoring/exam-sessions/:id/events
GET   /api/v1/transactions/config/client-key
GET   /api/v1/transactions/exam/:examId/access
GET   /api/v1/transactions/order/:orderId
POST  /api/v1/transactions
GET   /api/v1/transactions
GET   /api/v1/transactions/:id
POST  /api/v1/transactions/:id/cancel
POST  /api/v1/transactions/:id/sync
```

### Admin Routes (ADMIN Role)

```
POST   /api/v1/admin/users
GET    /api/v1/admin/users
GET    /api/v1/admin/users/:id
PATCH  /api/v1/admin/users/:id
DELETE /api/v1/admin/users/:id
POST   /api/v1/admin/exams
GET    /api/v1/admin/exams
GET    /api/v1/admin/exams/:id
PATCH  /api/v1/admin/exams/:id
DELETE /api/v1/admin/exams/:id
POST   /api/v1/admin/exams/:id/questions
DELETE /api/v1/admin/exams/:id/questions
GET    /api/v1/admin/exams/:id/questions
POST   /api/v1/admin/questions
GET    /api/v1/admin/questions
GET    /api/v1/admin/questions/:id
PATCH  /api/v1/admin/questions/:id
DELETE /api/v1/admin/questions/:id
GET    /api/v1/admin/exam-sessions
GET    /api/v1/admin/exam-sessions/:id
GET    /api/v1/admin/exam-sessions/:id/answers
GET    /api/v1/admin/results
GET    /api/v1/admin/proctoring/events
GET    /api/v1/admin/proctoring/exam-sessions/:id/events
GET    /api/v1/admin/transactions
GET    /api/v1/admin/transactions/stats
POST   /api/v1/admin/transactions/cleanup
GET    /api/v1/admin/transactions/:id
```

---

**Total Routes:** 58

- Public: 6
- Participant: 24
- Admin: 28
