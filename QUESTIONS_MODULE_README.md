# 🎯 Questions Module - Integration Guide

## 📋 Overview

Questions Module mengimplementasikan complete CRUD operations untuk question bank management. Admin dapat create, read, update, dan delete questions yang akan digunakan dalam exams. Module ini juga include bulk operations dan statistics untuk admin dashboard.

## 🗂️ File Structure

```
src/
├── features/
│   ├── auth/
│   ├── users/
│   ├── exams/
│   └── questions/          # ⭐ NEW MODULE
│       ├── questions.validation.ts
│       ├── questions.service.ts
│       ├── questions.controller.ts
│       └── questions.route.ts
└── routes/
    └── v1.route.ts         # Updated to mount questions routes
```

## 🔧 Integration Steps

### Step 1: Copy Files to Project

```bash
# From your project root

# 1. Create questions feature folder
mkdir -p src/features/questions

# 2. Copy questions module files
cp /mnt/user-data/outputs/questions.validation.ts src/features/questions/
cp /mnt/user-data/outputs/questions.service.ts src/features/questions/
cp /mnt/user-data/outputs/questions.controller.ts src/features/questions/
cp /mnt/user-data/outputs/questions.route.ts src/features/questions/

# 3. Update main router
cp /mnt/user-data/outputs/v1.route-updated.ts src/routes/v1.route.ts
```

### Step 2: Verify Installation

```bash
# Type check
pnpm run type-check

# Start dev server
pnpm run dev
```

Server should start without errors.

### Step 3: Test Health Check

```bash
curl http://localhost:3000/health
```

Should return 200 OK.

---

## 🧪 Testing Guide

### Setup: Get Admin Token

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin123456"
}
```

Copy `accessToken` from response for use in subsequent requests.

---

## 📝 API Testing

### 1. Create Question

**Request:**
```http
POST http://localhost:3000/api/v1/admin/questions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "content": "Pancasila sebagai dasar negara Indonesia ditetapkan pada tanggal?",
  "options": {
    "A": "17 Agustus 1945",
    "B": "18 Agustus 1945",
    "C": "1 Juni 1945",
    "D": "22 Juni 1945",
    "E": "1 Oktober 1945"
  },
  "correctAnswer": "B",
  "defaultScore": 5,
  "questionType": "TWK"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Question created successfully",
  "data": {
    "question": {
      "id": 1,
      "content": "Pancasila sebagai dasar negara Indonesia ditetapkan pada tanggal?",
      "options": {
        "A": "17 Agustus 1945",
        "B": "18 Agustus 1945",
        "C": "1 Juni 1945",
        "D": "22 Juni 1945",
        "E": "1 Oktober 1945"
      },
      "correctAnswer": "B",
      "defaultScore": 5,
      "questionType": "TWK",
      "createdAt": "2025-10-27T...",
      "_count": {
        "examQuestions": 0
      }
    }
  }
}
```

---

### 2. Create Multiple Questions (Different Types)

**TIU Question (Tes Intelegensia Umum):**
```json
{
  "content": "Jika 3x + 5 = 20, maka nilai x adalah?",
  "options": {
    "A": "3",
    "B": "5",
    "C": "7",
    "D": "10",
    "E": "15"
  },
  "correctAnswer": "B",
  "defaultScore": 5,
  "questionType": "TIU"
}
```

**TKP Question (Tes Karakteristik Pribadi):**
```json
{
  "content": "Anda diminta lembur untuk menyelesaikan proyek penting, tetapi sudah ada janji dengan keluarga. Apa yang Anda lakukan?",
  "options": {
    "A": "Langsung menolak tanpa memberikan alasan",
    "B": "Menerima lembur dan membatalkan janji dengan keluarga",
    "C": "Mencari solusi kompromi dengan atasan dan keluarga",
    "D": "Mengabaikan permintaan lembur",
    "E": "Menerima lembur tapi tidak datang"
  },
  "correctAnswer": "C",
  "defaultScore": 5,
  "questionType": "TKP"
}
```

---

### 3. Get All Questions

**Request:**
```http
GET http://localhost:3000/api/v1/admin/questions?page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <admin_token>
```

**With Filters:**
```http
GET http://localhost:3000/api/v1/admin/questions?page=1&limit=10&type=TWK&search=Pancasila
Authorization: Bearer <admin_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Questions retrieved successfully",
  "data": {
    "data": [
      {
        "id": 1,
        "content": "Pancasila sebagai dasar negara...",
        "options": { "A": "...", "B": "...", "C": "...", "D": "...", "E": "..." },
        "correctAnswer": "B",
        "defaultScore": 5,
        "questionType": "TWK",
        "createdAt": "2025-10-27T..."
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "totalPages": 1,
      "hasNext": false,
      "hasPrev": false
    }
  }
}
```

---

### 4. Get Single Question

**Request:**
```http
GET http://localhost:3000/api/v1/admin/questions/1
Authorization: Bearer <admin_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Question retrieved successfully",
  "data": {
    "question": {
      "id": 1,
      "content": "...",
      "options": { ... },
      "correctAnswer": "B",
      "defaultScore": 5,
      "questionType": "TWK",
      "createdAt": "...",
      "_count": {
        "examQuestions": 2
      }
    }
  }
}
```

Note: `_count.examQuestions` shows how many exams use this question.

---

### 5. Update Question

**Request:**
```http
PATCH http://localhost:3000/api/v1/admin/questions/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "content": "Pancasila sebagai dasar negara Indonesia ditetapkan pada tanggal berapa?",
  "defaultScore": 10
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Question updated successfully",
  "data": {
    "question": {
      "id": 1,
      "content": "Pancasila sebagai dasar negara Indonesia ditetapkan pada tanggal berapa?",
      "options": { ... },
      "correctAnswer": "B",
      "defaultScore": 10,
      "questionType": "TWK",
      "createdAt": "...",
      "_count": {
        "examQuestions": 2
      }
    }
  }
}
```

---

### 6. Delete Question

**Request:**
```http
DELETE http://localhost:3000/api/v1/admin/questions/1
Authorization: Bearer <admin_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Question deleted successfully",
  "data": {
    "message": "Question deleted successfully"
  }
}
```

**If question is used in exams (400 Bad Request):**
```json
{
  "success": false,
  "message": "Cannot delete question that is used in 2 exam(s). Remove from exams first."
}
```

---

### 7. Bulk Create Questions

**Request:**
```http
POST http://localhost:3000/api/v1/admin/questions/bulk
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "questions": [
    {
      "content": "Ibukota Indonesia adalah?",
      "options": {
        "A": "Jakarta",
        "B": "Bandung",
        "C": "Surabaya",
        "D": "Medan",
        "E": "Bali"
      },
      "correctAnswer": "A",
      "defaultScore": 5,
      "questionType": "TWK"
    },
    {
      "content": "2 + 2 = ?",
      "options": {
        "A": "2",
        "B": "3",
        "C": "4",
        "D": "5",
        "E": "6"
      },
      "correctAnswer": "C",
      "defaultScore": 5,
      "questionType": "TIU"
    }
  ]
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Successfully created 2 question(s)",
  "data": {
    "message": "Successfully created 2 question(s)",
    "created": 2,
    "questions": [
      { "id": 2, "content": "Ibukota Indonesia adalah?", ... },
      { "id": 3, "content": "2 + 2 = ?", ... }
    ]
  }
}
```

---

### 8. Bulk Delete Questions

**Request:**
```http
POST http://localhost:3000/api/v1/admin/questions/bulk-delete
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "questionIds": [2, 3, 4]
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Deleted 2 question(s). Skipped 1 question(s) that are in use.",
  "data": {
    "message": "Deleted 2 question(s). Skipped 1 question(s) that are in use.",
    "deleted": 2,
    "skipped": 1,
    "skippedIds": [4]
  }
}
```

---

### 9. Get Question Statistics

**Request:**
```http
GET http://localhost:3000/api/v1/admin/questions/stats
Authorization: Bearer <admin_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Question statistics retrieved successfully",
  "data": {
    "total": 50,
    "byType": [
      {
        "type": "TIU",
        "count": 20,
        "totalScore": 100,
        "averageScore": 5
      },
      {
        "type": "TKP",
        "count": 15,
        "totalScore": 75,
        "averageScore": 5
      },
      {
        "type": "TWK",
        "count": 15,
        "totalScore": 75,
        "averageScore": 5
      }
    ],
    "mostUsed": [
      {
        "id": 5,
        "content": "Pancasila terdiri dari berapa sila?",
        "questionType": "TWK",
        "usageCount": 10
      },
      {
        "id": 12,
        "content": "Berapakah hasil dari 15 x 3?",
        "questionType": "TIU",
        "usageCount": 8
      }
    ]
  }
}
```

---

## 🚨 Error Cases Testing

### 1. Validation Error - Missing Required Fields

**Request:**
```http
POST http://localhost:3000/api/v1/admin/questions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "content": "Test"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "body.content",
      "message": "Question content must be at least 10 characters"
    },
    {
      "field": "body.options",
      "message": "Required"
    }
  ]
}
```

---

### 2. Validation Error - Invalid Options

**Request:**
```json
{
  "content": "Test question with valid length?",
  "options": {
    "A": "Option A",
    "B": "Option B"
  },
  "correctAnswer": "A",
  "defaultScore": 5,
  "questionType": "TIU"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "body.options.C",
      "message": "Required"
    },
    {
      "field": "body.options.D",
      "message": "Required"
    },
    {
      "field": "body.options.E",
      "message": "Required"
    }
  ]
}
```

---

### 3. Business Logic Error - Correct Answer Not in Options

**Request:**
```json
{
  "content": "Valid question content here?",
  "options": {
    "A": "Option A",
    "B": "Option B",
    "C": "Option C",
    "D": "Option D",
    "E": "Option E"
  },
  "correctAnswer": "F",
  "defaultScore": 5,
  "questionType": "TIU"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Correct answer must be A, B, C, D, or E"
}
```

---

### 4. Business Logic Error - Update Question in Active Exam

**Request:**
```http
PATCH http://localhost:3000/api/v1/admin/questions/5
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "content": "Updated content"
}
```

**Expected Response (400 Bad Request) - if question is in active exam:**
```json
{
  "success": false,
  "message": "Cannot update question that is currently being used in active exams"
}
```

---

### 5. Not Found Error

**Request:**
```http
GET http://localhost:3000/api/v1/admin/questions/9999
Authorization: Bearer <admin_token>
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Question not found"
}
```

---

### 6. Duplicate Content Error

**Request:**
```json
{
  "content": "Pancasila sebagai dasar negara Indonesia ditetapkan pada tanggal?",
  "options": { ... },
  "correctAnswer": "B",
  "defaultScore": 5,
  "questionType": "TWK"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "A question with similar content already exists"
}
```

---

## 🔗 Integration with Exam Module

After creating questions, you can attach them to exams:

```http
POST http://localhost:3000/api/v1/admin/exams/1/questions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "questionIds": [1, 2, 3, 4, 5]
}
```

This will create ExamQuestion records linking questions to exam.

---

## 📊 Database Verification

Check data via Prisma Studio:

```bash
pnpm prisma studio
```

Navigate to:
- **question_bank** table - See all questions
- **exam_questions** table - See which exams use which questions

---

## 🐛 Common Issues & Solutions

### Issue 1: Options Validation Error

**Problem:**
```json
{
  "success": false,
  "message": "Invalid options format. Must have exactly A, B, C, D, E keys"
}
```

**Solution:**
Ensure options object has EXACTLY 5 keys: A, B, C, D, E. No more, no less.

---

### Issue 2: Cannot Delete Question

**Problem:**
```json
{
  "success": false,
  "message": "Cannot delete question that is used in 2 exam(s)."
}
```

**Solution:**
1. Remove question from exams first using detach endpoint
2. Then delete the question

Or use bulk delete which will skip questions in use.

---

### Issue 3: Correct Answer Mismatch

**Problem:**
When updating, correct answer becomes invalid.

**Solution:**
If updating options, make sure correctAnswer still matches one of the new options.

---

## 🎯 Business Rules Summary

### Question Creation:
- ✅ Content must be 10-5000 characters
- ✅ Must have exactly 5 options (A-E)
- ✅ Each option must not be empty
- ✅ Correct answer must be one of A-E
- ✅ Correct answer must exist in options
- ✅ Score must be 1-100
- ✅ Duplicate content check (soft constraint)

### Question Update:
- ✅ Cannot update if in active exam session
- ✅ If updating options, must maintain A-E structure
- ✅ If updating correctAnswer, must exist in options

### Question Deletion:
- ✅ Cannot delete if used in any exam (hard constraint)
- ✅ Must remove from exams first
- ✅ Bulk delete will skip questions in use

### Data Integrity:
- ✅ Questions in question_bank are reusable
- ✅ Deleting question doesn't affect historical exam results
- ✅ ExamQuestion junction table prevents orphaned relationships

---

## 🚀 Next Steps

With questions and exams modules complete, next priorities:

1. **Seed Sample Questions** - Create 50-100 questions for testing
2. **Exam Sessions Module** - Implement start/answer/submit flow
3. **Proctoring Module** - Implement event logging

---

## 📝 Sample Questions for Testing

Create these via bulk create endpoint:

```json
{
  "questions": [
    {
      "content": "Siapakah presiden pertama Indonesia?",
      "options": {
        "A": "Ir. Soekarno",
        "B": "Soeharto",
        "C": "B.J. Habibie",
        "D": "Megawati",
        "E": "Susilo Bambang Yudhoyono"
      },
      "correctAnswer": "A",
      "defaultScore": 5,
      "questionType": "TWK"
    },
    {
      "content": "Berapakah hasil dari 15 + 27?",
      "options": {
        "A": "40",
        "B": "41",
        "C": "42",
        "D": "43",
        "E": "44"
      },
      "correctAnswer": "C",
      "defaultScore": 5,
      "questionType": "TIU"
    }
  ]
}
```

---

## 🎉 Congratulations!

Questions module is now fully functional. You can now:
- ✅ Create and manage questions
- ✅ Filter by type (TIU/TKP/TWK)
- ✅ Bulk operations for efficiency
- ✅ Get statistics for dashboard
- ✅ Attach questions to exams

**Next:** Implement Exam Sessions Module for the participant flow!