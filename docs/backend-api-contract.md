# Backend API Contract - Prestige Academy CPNS Exam System

> **Generated from actual backend code** (Boloyyu90/be-ta)
> **Last Updated:** December 2025
> **API Version:** v1

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
4. [Shared Schemas & DTOs](#4-shared-schemas--dtos)
5. [Frontend Integration Notes](#5-frontend-integration-notes)

---

## 1. Global Conventions

### 1.1 Base URL

```
http://localhost:3000/api/v1
```

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

| Code | Meaning |
|------|---------|
| 200 | OK - Request succeeded |
| 201 | Created - Resource created |
| 204 | No Content - Success with no body |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Invalid/missing token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 500 | Internal Server Error |

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
type UserRole = 'ADMIN' | 'PARTICIPANT';

// Exam Session Status (Prisma: ExamStatus)
type ExamStatus = 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | 'TIMEOUT';

// Question Types (Prisma: QuestionType)
type QuestionType = 'TIU' | 'TKP' | 'TWK';

// Token Types (Prisma: TokenType)
type TokenType = 'ACCESS' | 'REFRESH';

// Proctoring Event Types (Prisma: ProctoringEventType)
type ProctoringEventType = 
  | 'FACE_DETECTED' 
  | 'NO_FACE_DETECTED' 
  | 'MULTIPLE_FACES' 
  | 'LOOKING_AWAY';

// Answer Options
type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E' | null;

// Severity Levels
type Severity = 'LOW' | 'MEDIUM' | 'HIGH';
```

### 1.8 Rate Limits

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Global | 100 requests | 15 minutes |
| Auth (login/register) | 5 requests | 15 minutes |
| Token Refresh | 10 requests | 15 minutes |
| Proctoring | 30 requests | 1 minute |

---

## 2. Authentication

### 2.1 Token Flow

1. **Login/Register** → Returns `{ accessToken, refreshToken }`
2. **API Calls** → Send `Authorization: Bearer <accessToken>`
3. **401 Response** → Call `/auth/refresh` with `refreshToken`
4. **New Tokens** → Store and retry original request
5. **Logout** → Call `/auth/logout` to invalidate `refreshToken`

### 2.2 Role-Based Access

| Route Pattern | Required Role |
|---------------|---------------|
| `/api/v1/auth/*` | Public (no auth) |
| `/api/v1/me/*` | Authenticated |
| `/api/v1/exams/*` | Authenticated |
| `/api/v1/exam-sessions/*` | Authenticated |
| `/api/v1/results/*` | Authenticated |
| `/api/v1/proctoring/*` | Authenticated |
| `/api/v1/admin/*` | ADMIN only |

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
  refreshToken: string
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
  refreshToken: string
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
  message: "Profile retrieved successfully",
  timestamp: string
}
```

---

#### PATCH `/me`
**Access:** Authenticated

**Request Body:**
```typescript
{
  name?: string,      // 2-100 characters
  password?: string   // Min 8 chars, 1 uppercase, 1 lowercase, 1 number
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

#### POST `/admin/users`
**Access:** ADMIN only

**Request Body:**
```typescript
{
  email: string,
  password: string,
  name: string,
  role?: 'ADMIN' | 'PARTICIPANT'  // Default: PARTICIPANT
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    user: User
  },
  message: "User created successfully",
  timestamp: string
}
```

---

#### GET `/admin/users`
**Access:** ADMIN only

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page (max: 100) |
| role | UserRole | - | Filter by role |
| search | string | - | Search in name/email |
| sortBy | string | 'createdAt' | Sort field |
| sortOrder | 'asc'/'desc' | 'desc' | Sort direction |

**Response (200):**
```typescript
{
  success: true,
  data: {
    data: User[],
    pagination: PaginationMeta
  },
  message: "Users retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/users/:id`
**Access:** ADMIN only

**Response (200):**
```typescript
{
  success: true,
  data: {
    user: {
      ...User,
      _count: {
        createdExams: number,
        userExams: number
      }
    }
  },
  message: "User retrieved successfully",
  timestamp: string
}
```

---

#### PATCH `/admin/users/:id`
**Access:** ADMIN only

**Request Body:**
```typescript
{
  email?: string,
  password?: string,
  name?: string,
  role?: UserRole,
  isEmailVerified?: boolean
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    user: User
  },
  message: "User updated successfully",
  timestamp: string
}
```

---

#### DELETE `/admin/users/:id`
**Access:** ADMIN only

**Response (200):**
```typescript
{
  success: true,
  data: {
    success: true,
    message: string
  },
  message: "User deleted successfully",
  timestamp: string
}
```

**Errors:**
- `409` - User has exam attempts (`USER_HAS_EXAM_ATTEMPTS`)
- `409` - User has created exams (`USER_HAS_CREATED_EXAMS`)

---

### 3.3 Questions Module

#### POST `/admin/questions`
**Access:** ADMIN only

**Request Body:**
```typescript
{
  content: string,           // 10-5000 characters (can include HTML/images)
  options: {
    A: string,
    B: string,
    C: string,
    D: string,
    E: string
  },
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E',
  questionType: 'TIU' | 'TKP' | 'TWK',
  defaultScore?: number      // 1-100, default: 5
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    question: Question
  },
  message: "Question created successfully",
  timestamp: string
}
```

---

#### GET `/admin/questions`
**Access:** ADMIN only

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| type | QuestionType | - | Filter by question type |
| search | string | - | Search in content |
| sortBy | string | 'createdAt' | Sort field |
| sortOrder | 'asc'/'desc' | 'desc' | Sort direction |

**Response (200):**
```typescript
{
  success: true,
  data: {
    data: Question[],
    pagination: PaginationMeta
  },
  message: "Questions retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/questions/:id`
**Access:** ADMIN only

**Response (200):**
```typescript
{
  success: true,
  data: {
    question: Question
  },
  message: "Question retrieved successfully",
  timestamp: string
}
```

---

#### PATCH `/admin/questions/:id`
**Access:** ADMIN only

**Request Body:**
```typescript
{
  content?: string,
  options?: Partial<QuestionOptions>,
  correctAnswer?: 'A' | 'B' | 'C' | 'D' | 'E',
  questionType?: QuestionType,
  defaultScore?: number
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    question: Question
  },
  message: "Question updated successfully",
  timestamp: string
}
```

---

#### DELETE `/admin/questions/:id`
**Access:** ADMIN only

**Response (200):**
```typescript
{
  success: true,
  data: {
    success: true,
    message: string
  },
  message: "Question deleted successfully",
  timestamp: string
}
```

---

### 3.4 Exams Module

#### POST `/admin/exams`
**Access:** ADMIN only

**Request Body:**
```typescript
{
  title: string,                    // 3-200 characters
  description?: string | null,      // Max 2000 characters
  startTime?: string | null,        // ISO datetime
  endTime?: string | null,          // ISO datetime (must be after startTime)
  durationMinutes?: number,         // 1-300 minutes
  passingScore?: number,            // Min 0
  allowRetake?: boolean,            // Default: false - Whether users can retake this exam
  maxAttempts?: number | null       // Max number of attempts allowed (null = unlimited if retakes enabled)
}
```

**Response (201):**
```typescript
{
  success: true,
  data: {
    exam: Exam
  },
  message: "Exam created successfully",
  timestamp: string
}
```

**Business Rules:**
- `allowRetake` defaults to `false` - users get only one attempt
- `maxAttempts` is only enforced when `allowRetake` is `true`
- If `allowRetake` is `true` and `maxAttempts` is `null`, unlimited retakes are allowed

---

#### GET `/admin/exams`
**Access:** ADMIN only (shows ALL exams including drafts)

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| search | string | - | Search in title |
| sortBy | string | 'createdAt' | Sort field |
| sortOrder | 'asc'/'desc' | 'desc' | Sort direction |
| createdBy | number | - | Filter by creator ID |

**Response (200):**
```typescript
{
  success: true,
  data: {
    data: ExamWithCount[],
    pagination: PaginationMeta
  },
  message: "Exams retrieved successfully",
  timestamp: string
}
```

---

#### GET `/exams`
**Access:** Authenticated (shows only available exams with questions)

Same query parameters and response format as admin, but filtered to show only exams that:
- Have at least 1 question attached
- Are within valid time window (if startTime/endTime set)

---

#### GET `/admin/exams/:id`
**Access:** ADMIN only

**Response (200):**
```typescript
{
  success: true,
  data: {
    exam: {
      id: number,
      title: string,
      description: string | null,
      startTime: string | null,
      endTime: string | null,
      durationMinutes: number,
      passingScore: number,
      allowRetake: boolean,         // Whether retakes are enabled
      maxAttempts: number | null,   // Maximum attempts (null = unlimited)
      createdBy: number,
      createdAt: string,
      updatedAt: string,
      creator: {
        id: number,
        name: string,
        email: string
      },
      _count: {
        examQuestions: number,
        userExams: number
      }
    }
  },
  message: "Exam retrieved successfully",
  timestamp: string
}
```

---

#### GET `/exams/:id`
**Access:** Authenticated

Same as admin but without `creator` details and `userExams` count.

---

#### PATCH `/admin/exams/:id`
**Access:** ADMIN only (creator only)

**Request Body:**
```typescript
{
  title?: string,
  description?: string | null,
  startTime?: string | null,
  endTime?: string | null,
  durationMinutes?: number,
  passingScore?: number,
  allowRetake?: boolean,          // Enable/disable retakes
  maxAttempts?: number | null     // Set max attempts limit
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    exam: Exam
  },
  message: "Exam updated successfully",
  timestamp: string
}
```

**Business Rules:**
- Changing `allowRetake` to `false` does not affect existing attempts
- Reducing `maxAttempts` does not retroactively invalidate existing attempts

---

#### DELETE `/admin/exams/:id`
**Access:** ADMIN only (creator only)

**Response (200):**
```typescript
{
  success: true,
  data: {
    success: true
  },
  message: "Exam deleted successfully",
  timestamp: string
}
```

**Errors:**
- `409` - Exam has participant attempts

---

#### POST `/admin/exams/:id/questions`
**Access:** ADMIN only

Attach questions to exam.

**Request Body:**
```typescript
{
  questionIds: number[]    // 1-200 question IDs
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    attached: number,     // Number of questions attached
    total: number         // Total questions now on exam
  },
  message: "Questions attached successfully",
  timestamp: string
}
```

---

#### DELETE `/admin/exams/:id/questions`
**Access:** ADMIN only

Detach questions from exam.

**Request Body:**
```typescript
{
  questionIds: number[]
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    detached: number,
    total: number
  },
  message: "Questions detached successfully",
  timestamp: string
}
```

---

#### GET `/admin/exams/:id/questions`
**Access:** ADMIN only

Get exam questions with correct answers.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| type | QuestionType | Filter by question type |

**Response (200):**
```typescript
{
  success: true,
  data: {
    questions: Array<{
      id: number,              // ExamQuestion ID
      orderNumber: number,
      question: Question       // Full question with correctAnswer
    }>,
    total: number
  },
  message: "Exam questions retrieved successfully",
  timestamp: string
}
```

---

### 3.5 Exam Sessions Module

#### POST `/exams/:id/start`
**Access:** Authenticated

Start an exam session, resume an existing IN_PROGRESS session, or start a new retake attempt.

**Response (200):**
```typescript
{
  success: true,
  data: {
    userExam: {
      id: number,
      examId: number,
      examTitle: string,
      durationMinutes: number,
      startedAt: string,
      submittedAt: string | null,
      status: ExamStatus,
      remainingTimeMs: number,
      totalQuestions: number,
      answeredQuestions: number,
      attemptNumber: number       // Which attempt this is (1 = first, 2 = second, etc.)
    },
    questions: Array<{
      id: number,              // Question bank ID
      examQuestionId: number,  // ExamQuestion ID (use this for answers!)
      content: string,
      options: QuestionOptions,
      questionType: QuestionType,
      orderNumber: number
      // NOTE: No correctAnswer - hidden from participants
    }>,
    answers: Array<{
      examQuestionId: number,
      selectedOption: AnswerOption,
      answeredAt: string | null
    }>
  },
  message: "Exam started successfully",
  timestamp: string
}
```

**Behavior:**
1. If user has an IN_PROGRESS session → Resume that session
2. If user has completed attempts and retakes disabled → Error
3. If user has completed attempts and max attempts reached → Error
4. Otherwise → Create new attempt with incremented `attemptNumber`

**Errors:**
- `404` - Exam not found
- `409` - Exam already submitted (when retakes disabled) (`EXAM_SESSION_ALREADY_STARTED`)
- `400` - Exam has no questions (`EXAM_NO_QUESTIONS`)
- `400` - Exam duration not set (`EXAM_NO_DURATION`)
- `400` - Retakes not allowed for this exam (`EXAM_SESSION_RETAKE_DISABLED`)
- `400` - Maximum attempts reached (`EXAM_SESSION_MAX_ATTEMPTS`)

---

#### GET `/exam-sessions`
**Access:** Authenticated

Get current user's exam sessions (all attempts).

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| page | number | 1 |
| limit | number | 10 |

**Response (200):**
```typescript
{
  success: true,
  data: {
    data: Array<{
      id: number,
      exam: {
        id: number,
        title: string,
        description: string | null,
        allowRetake: boolean,       // Whether exam allows retakes
        maxAttempts: number | null  // Max attempts for this exam
      },
      status: ExamStatus,
      startedAt: string,
      submittedAt: string | null,
      totalScore: number | null,
      remainingTimeMs: number | null,
      durationMinutes: number,
      answeredQuestions: number,
      totalQuestions: number,
      attemptNumber: number         // Which attempt this is
    }>,
    pagination: PaginationMeta
  },
  message: "User exams retrieved successfully",
  timestamp: string
}
```

**Note:** Results are ordered by `startedAt` descending, showing most recent attempts first. The composite index on `[userId, examId, status]` ensures efficient queries.

---

#### GET `/exam-sessions/:id`
**Access:** Session owner only

**Response (200):**
```typescript
{
  success: true,
  data: {
    ...UserExamDetail,
    attemptNumber: number          // Which attempt this session represents
  },
  message: "Exam session retrieved successfully",
  timestamp: string
}
```

---

#### GET `/exam-sessions/:id/questions`
**Access:** Session owner only (active exam only)

**Response (200):**
```typescript
{
  success: true,
  data: {
    questions: ParticipantQuestion[],
    total: number
  },
  message: "Exam questions retrieved successfully",
  timestamp: string
}
```

---

#### POST `/exam-sessions/:id/answers`
**Access:** Session owner only

Submit/update a single answer (auto-save).

**Request Body:**
```typescript
{
  examQuestionId: number,              // ExamQuestion ID, NOT question ID!
  selectedOption: 'A' | 'B' | 'C' | 'D' | 'E' | null
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    answer: {
      examQuestionId: number,
      selectedOption: AnswerOption,
      answeredAt: string
    },
    progress: {
      answered: number,
      total: number,
      percentage: number
    }
  },
  message: "Answer submitted successfully",
  timestamp: string
}
```

**Errors:**
- `400` - Exam already submitted (`EXAM_SESSION_ALREADY_SUBMITTED`)
- `400` - Exam timeout (`EXAM_SESSION_TIMEOUT`)
- `400` - Invalid examQuestionId for this exam (`EXAM_SESSION_INVALID_QUESTION`)

---

#### POST `/exam-sessions/:id/submit`
**Access:** Session owner only

Finalize and submit the exam.

**Response (200):**
```typescript
{
  success: true,
  data: {
    message: string,
    result: {
      id: number,
      examId: number,
      examTitle: string,
      userId: number,
      startedAt: string,
      submittedAt: string,
      totalScore: number,
      status: ExamStatus,
      duration: number | null,        // Seconds taken
      answeredQuestions: number,
      totalQuestions: number,
      attemptNumber: number,          // Which attempt this was
      scoresByType: Array<{
        type: QuestionType,
        score: number,
        maxScore: number,
        correctAnswers: number,
        totalQuestions: number
      }>
    }
  },
  message: "Exam submitted successfully",
  timestamp: string
}
```

---

#### GET `/exam-sessions/:id/answers`
**Access:** Session owner only (after submission)

Get answers with review (shows correctAnswer after submit).

**Response (200):**
```typescript
{
  success: true,
  data: {
    answers: Array<{
      id: number,
      examQuestionId: number,
      selectedOption: AnswerOption,
      isCorrect: boolean,
      answeredAt: string | null,
      examQuestion: {
        orderNumber: number,
        question: {
          id: number,
          content: string,
          options: QuestionOptions,
          correctAnswer: string,      // Now visible!
          questionType: QuestionType,
          defaultScore: number
        }
      }
    }>,
    total: number
  },
  message: "Exam answers retrieved successfully",
  timestamp: string
}
```

**Errors:**
- `400` - Cannot review before submitting

---

#### GET `/results`
**Access:** Authenticated

Get current user's exam results (all attempts).

**Query Parameters:**
| Param | Type | Default |
|-------|------|---------|
| page | number | 1 |
| limit | number | 10 |

**Response (200):**
```typescript
{
  success: true,
  data: {
    data: Array<{
      ...ExamResult,
      attemptNumber: number       // Which attempt this result is for
    }>,
    pagination: PaginationMeta
  },
  message: "Results retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/exam-sessions`
**Access:** ADMIN only

Get all exam sessions.

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| page | number | Page number |
| limit | number | Items per page |
| examId | number | Filter by exam |
| userId | number | Filter by user |
| status | ExamStatus | Filter by status |

**Response (200):** Same format as participant results, includes `attemptNumber` for each session.

---

#### GET `/admin/results`
**Access:** ADMIN only

Same as `/admin/exam-sessions`.

---

### 3.6 Proctoring Module

#### POST `/proctoring/events`
**Access:** Authenticated

Log a proctoring event manually.

**Request Body:**
```typescript
{
  userExamId: number,
  eventType: ProctoringEventType,
  metadata?: Record<string, any>     // Optional event data
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    event: {
      id: number,
      userExamId: number,
      eventType: ProctoringEventType,
      metadata: Record<string, any> | null,
      timestamp: string,
      severity: Severity
    }
  },
  message: "Proctoring event logged successfully",
  timestamp: string
}
```

---

#### POST `/proctoring/exam-sessions/:userExamId/analyze-face`
**Access:** Session owner only

**⚠️ CRITICAL: This is the ML integration endpoint for thesis demonstration!**

Analyze webcam frame via YOLO face detection.

**Request Body:**
```typescript
{
  imageBase64: string    // Base64 encoded image (min 100 chars)
}
```

**Response (200):**
```typescript
{
  success: true,
  data: {
    analysis: {
      status: 'success' | 'timeout' | 'error',
      violations: string[],         // e.g., ['NO_FACE_DETECTED']
      confidence: number,           // 0-1
      message: string,
      metadata?: {
        processingTimeMs: number,
        error?: string
      }
    },
    eventLogged: boolean,           // True if violation was logged
    eventType: ProctoringEventType | null,
    usedFallback: boolean           // True if mock analyzer was used
  },
  message: "Face analysis completed",
  timestamp: string
}
```

---

#### GET `/proctoring/exam-sessions/:userExamId/events`
**Access:** Session owner only

Get proctoring events for a session.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 10 | Items per page |
| eventType | ProctoringEventType | - | Filter by type |
| startDate | string | - | ISO datetime |
| endDate | string | - | ISO datetime |
| sortOrder | 'asc'/'desc' | 'desc' | Sort direction |

**Response (200):**
```typescript
{
  success: true,
  data: {
    data: ProctoringEvent[],
    pagination: PaginationMeta
  },
  message: "Proctoring events retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/proctoring/events`
**Access:** ADMIN only

Get all proctoring events.

**Query Parameters:** Same as participant + `userExamId` filter.

**Response (200):**
```typescript
{
  success: true,
  data: {
    data: Array<{
      ...ProctoringEvent,
      userExam: {
        id: number,
        userId: number,
        examId: number,
        status: ExamStatus,
        attemptNumber: number,      // Which attempt this event belongs to
        user: { id, name, email },
        exam: { id, title }
      }
    }>,
    pagination: PaginationMeta
  },
  message: "Proctoring events retrieved successfully",
  timestamp: string
}
```

---

#### GET `/admin/proctoring/exam-sessions/:userExamId/events`
**Access:** ADMIN only

Get proctoring events for any session. Same format as participant endpoint.

---

## 4. Shared Schemas & DTOs

### 4.1 Core Entities

```typescript
// User (Public Fields)
interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Question
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
  correctAnswer: string;
  questionType: QuestionType;
  defaultScore: number;
  createdAt: string;
  updatedAt: string;
}

// Exam
interface Exam {
  id: number;
  title: string;
  description: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  passingScore: number;
  allowRetake: boolean;           // Whether users can retake this exam
  maxAttempts: number | null;     // Maximum attempts (null = unlimited when retakes enabled)
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

// ExamWithCount (for lists)
interface ExamWithCount extends Exam {
  _count: {
    examQuestions: number;
  };
}

// UserExam (Exam Session)
interface UserExam {
  id: number;
  userId: number;
  examId: number;
  attemptNumber: number;          // Which attempt this is (1, 2, 3, ...)
  startedAt: string;
  submittedAt: string | null;
  totalScore: number | null;
  status: ExamStatus;
}

// ProctoringEvent
interface ProctoringEvent {
  id: number;
  userExamId: number;
  eventType: ProctoringEventType;
  metadata: Record<string, any> | null;
  timestamp: string;
  severity: Severity;
}
```

### 4.2 Pagination Meta

```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}
```

### 4.3 Authentication Tokens

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

| Correct | Wrong |
|---------|-------|
| `data` | `items`, `users`, `exams` |
| `page` | `currentPage` |
| `limit` | `pageSize`, `perPage` |
| `total` | `totalItems`, `count` |
| `hasNext` | `hasMore` |
| `metadata` | `eventData` (proctoring) |
| `examQuestionId` | `questionId` (for answers) |
| `attemptNumber` | `attempt`, `attemptNo` |
| `allowRetake` | `retakeAllowed`, `canRetake` |
| `maxAttempts` | `attemptsLimit`, `maxRetries` |

### 5.4 Enum Value Mapping

**ExamStatus:** Backend uses `FINISHED`, not `COMPLETED`!

```typescript
// ✅ Correct
type ExamStatus = 'IN_PROGRESS' | 'FINISHED' | 'CANCELLED' | 'TIMEOUT';

// ❌ Wrong
type ExamStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'TIMEOUT';
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
  examQuestionId: 123,  // From startExam response
  selectedOption: 'A'
});

// ❌ Wrong - will fail
await api.post(`/exam-sessions/${sessionId}/answers`, {
  questionId: 123,      // This is the question bank ID!
  selectedOption: 'A'
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
  3000  // 3 seconds
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
  const completedAttempts = sessions.filter(s => 
    s.status !== 'IN_PROGRESS'
  );
  
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
  return sessions.find(s => s.status === 'IN_PROGRESS') || null;
}
```

**Display attempt information:**

```typescript
// Show current attempt number during exam
<div>Attempt {userExam.attemptNumber} of {exam.maxAttempts ?? '∞'}</div>

// Show attempt history in results
{sessions.map(session => (
  <div key={session.id}>
    Attempt #{session.attemptNumber} - Score: {session.totalScore}
  </div>
))}
```

### 5.9 Error Code Reference

| Code | Module | Meaning |
|------|--------|---------|
| `AUTH_EMAIL_EXISTS` | Auth | Email already registered |
| `AUTH_INVALID_CREDENTIALS` | Auth | Wrong email/password |
| `AUTH_INVALID_TOKEN` | Auth | Token expired/invalid |
| `USER_NOT_FOUND` | Users | User ID doesn't exist |
| `EXAM_NOT_FOUND` | Exams | Exam ID doesn't exist |
| `EXAM_NO_QUESTIONS` | Exams | Exam has 0 questions |
| `EXAM_NO_DURATION` | Exams | Duration not set |
| `EXAM_SESSION_NOT_FOUND` | Sessions | Session doesn't exist |
| `EXAM_SESSION_ALREADY_STARTED` | Sessions | Can't restart submitted exam (when retakes disabled) |
| `EXAM_SESSION_TIMEOUT` | Sessions | Time limit exceeded |
| `EXAM_SESSION_ALREADY_SUBMITTED` | Sessions | Already finalized |
| `EXAM_SESSION_INVALID_QUESTION` | Sessions | examQuestionId not in exam |
| `EXAM_SESSION_RETAKE_DISABLED` | Sessions | Exam does not allow retakes |
| `EXAM_SESSION_MAX_ATTEMPTS` | Sessions | Maximum attempts reached for this exam |

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

## Appendix: Complete Route Map

### Public Routes (No Auth)
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
```

### Participant Routes (Authenticated)
```
GET  /api/v1/me
PATCH /api/v1/me
GET  /api/v1/exams
GET  /api/v1/exams/:id
POST /api/v1/exams/:id/start
GET  /api/v1/exam-sessions
GET  /api/v1/exam-sessions/:id
GET  /api/v1/exam-sessions/:id/questions
POST /api/v1/exam-sessions/:id/answers
POST /api/v1/exam-sessions/:id/submit
GET  /api/v1/exam-sessions/:id/answers
GET  /api/v1/results
POST /api/v1/proctoring/events
POST /api/v1/proctoring/exam-sessions/:id/analyze-face
GET  /api/v1/proctoring/exam-sessions/:id/events
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
```

---

**Total Routes:** 50
- Public: 4
- Participant: 15  
- Admin: 31
