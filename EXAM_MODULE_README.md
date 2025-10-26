# 🎯 Exam Module - Integration Guide

## 📋 Overview

Module exam ini mengimplementasikan core functionality untuk admin manage exam dan participant view available exams. Ini adalah foundation untuk exam session flow yang akan dibangun next.

## 🗂️ File Structure

Setelah integrasi, struktur project Anda akan seperti ini:

```
src/
├── config/
│   └── constants.ts          # Updated with exam error messages
├── features/
│   ├── auth/
│   ├── users/
│   └── exams/                 # ⭐ NEW MODULE
│       ├── exams.validation.ts
│       ├── exams.service.ts
│       ├── exams.controller.ts
│       └── exams.route.ts
└── routes/
    └── v1.route.ts            # Updated to mount exam routes
```

## 🔧 Integration Steps

### Step 1: Copy Files to Project

Copy semua files dari `/mnt/user-data/outputs/` ke project Anda:

```bash
# From your project root

# 1. Create exam feature folder
mkdir -p src/features/exams

# 2. Copy exam module files
cp /mnt/user-data/outputs/exams.validation.ts src/features/exams/
cp /mnt/user-data/outputs/exams.service.ts src/features/exams/
cp /mnt/user-data/outputs/exams.controller.ts src/features/exams/
cp /mnt/user-data/outputs/exams.route.ts src/features/exams/

# 3. Update config files
cp /mnt/user-data/outputs/constants.ts src/config/
cp /mnt/user-data/outputs/v1.route.ts src/routes/
```

### Step 2: Verify Imports

Pastikan path imports sudah benar. Jika Anda menggunakan path alias `@/*`, semua imports sudah siap pakai. Jika tidak, adjust import paths sesuai dengan tsconfig Anda.

### Step 3: Test TypeScript Compilation

```bash
pnpm run type-check
```

Jika ada error terkait types, pastikan:
- `@prisma/client` sudah ter-generate (`pnpm prisma generate`)
- Semua dependencies ter-install
- Path alias `@/*` sudah di-configure di `tsconfig.json`

### Step 4: Start Development Server

```bash
pnpm run dev
```

Server should start without errors. Check console for any import/compilation errors.

## 🧪 Testing Guide

### Manual Testing with Thunder Client / Postman

#### A. Setup (One-time)

1. **Login as Admin** to get access token:

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "Admin123456"
}
```

Copy the `accessToken` from response.

2. **Set Authorization Header** for subsequent requests:
```
Authorization: Bearer <your_access_token>
```

---

#### B. Admin Endpoints Testing

**1. Create Exam**

```http
POST http://localhost:3000/api/v1/admin/exams
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "CPNS Tryout Batch 1",
  "description": "Simulasi tes CPNS dengan 100 soal pilihan ganda",
  "durationMinutes": 90,
  "startTime": "2025-11-01T09:00:00Z",
  "endTime": "2025-11-01T18:00:00Z"
}
```

**Expected Response (201 Created):**
```json
{
  "success": true,
  "message": "Exam created successfully",
  "data": {
    "exam": {
      "id": 1,
      "title": "CPNS Tryout Batch 1",
      "description": "Simulasi tes CPNS dengan 100 soal pilihan ganda",
      "durationMinutes": 90,
      "startTime": "2025-11-01T09:00:00.000Z",
      "endTime": "2025-11-01T18:00:00.000Z",
      "createdBy": 1,
      "createdAt": "2025-10-27T...",
      "creator": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "_count": {
        "examQuestions": 0,
        "userExams": 0
      }
    }
  }
}
```

---

**2. Get All Exams (Admin View)**

```http
GET http://localhost:3000/api/v1/admin/exams?page=1&limit=10&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <admin_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Exams retrieved successfully",
  "data": {
    "data": [
      {
        "id": 1,
        "title": "CPNS Tryout Batch 1",
        "description": "...",
        "durationMinutes": 90,
        "startTime": "...",
        "endTime": "...",
        "createdBy": 1,
        "createdAt": "..."
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

**3. Get Single Exam Details**

```http
GET http://localhost:3000/api/v1/admin/exams/1
Authorization: Bearer <admin_token>
```

---

**4. Update Exam**

```http
PATCH http://localhost:3000/api/v1/admin/exams/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "description": "Updated description with more details",
  "durationMinutes": 120
}
```

---

**5. Attach Questions to Exam**

⚠️ **Note:** Anda perlu punya questions di database dulu. Ini akan kita implement di question module next. Untuk sekarang, skip dulu atau create manual via Prisma Studio.

```http
POST http://localhost:3000/api/v1/admin/exams/1/questions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "questionIds": [1, 2, 3, 4, 5]
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully attached 5 question(s) to exam",
  "data": {
    "message": "Successfully attached 5 question(s) to exam",
    "attached": 5
  }
}
```

---

**6. Get Exam Questions**

```http
GET http://localhost:3000/api/v1/admin/exams/1/questions
Authorization: Bearer <admin_token>
```

---

**7. Detach Questions**

```http
DELETE http://localhost:3000/api/v1/admin/exams/1/questions
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "questionIds": [1, 2]
}
```

---

**8. Delete Exam**

```http
DELETE http://localhost:3000/api/v1/admin/exams/1
Authorization: Bearer <admin_token>
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Exam deleted successfully",
  "data": {
    "message": "Exam deleted successfully"
  }
}
```

**Note:** Delete akan gagal jika exam sudah punya participant attempts (for data preservation).

---

#### C. Participant Endpoints Testing

**1. Login as Participant**

```http
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "email": "participant@example.com",
  "password": "Admin123456"
}
```

Copy the `accessToken`.

---

**2. Get Available Exams (Participant View)**

```http
GET http://localhost:3000/api/v1/exams?page=1&limit=10
Authorization: Bearer <participant_token>
```

**Difference from admin view:**
- Only shows exams that have questions attached
- Optionally filtered by time (not ended yet)
- Cannot see creator details

---

**3. Get Exam Details (Participant View)**

```http
GET http://localhost:3000/api/v1/exams/1
Authorization: Bearer <participant_token>
```

**Note:** Participant sees exam metadata but NOT the questions. Questions will only be fetched when exam session starts.

---

#### D. Error Cases Testing

**1. Unauthorized Access (No Token)**

```http
GET http://localhost:3000/api/v1/admin/exams
```

**Expected Response (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

---

**2. Forbidden Access (Participant tries admin endpoint)**

```http
POST http://localhost:3000/api/v1/admin/exams
Authorization: Bearer <participant_token>
Content-Type: application/json

{
  "title": "Test Exam",
  "durationMinutes": 60
}
```

**Expected Response (403 Forbidden):**
```json
{
  "success": false,
  "message": "Forbidden"
}
```

---

**3. Validation Error (Missing required field)**

```http
POST http://localhost:3000/api/v1/admin/exams
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "title": "AB"
}
```

**Expected Response (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error",
  "errors": [
    {
      "field": "body.title",
      "message": "Title must be at least 3 characters"
    },
    {
      "field": "body.durationMinutes",
      "message": "Duration is required"
    }
  ]
}
```

---

**4. Not Found Error**

```http
GET http://localhost:3000/api/v1/admin/exams/999
Authorization: Bearer <admin_token>
```

**Expected Response (404 Not Found):**
```json
{
  "success": false,
  "message": "Exam not found"
}
```

---

**5. Business Logic Error (Update exam with active sessions)**

```http
PATCH http://localhost:3000/api/v1/admin/exams/1
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "durationMinutes": 60
}
```

**Expected Response (400 Bad Request) - if exam has active sessions:**
```json
{
  "success": false,
  "message": "Cannot update duration while there are active exam sessions"
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Import Errors

**Problem:**
```
Cannot find module '@/config/constants'
```

**Solution:**
- Check `tsconfig.json` has path alias configured:
```json
{
  "compilerOptions": {
    "baseUrl": "./",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```
- Run `pnpm run build` to test TypeScript compilation

---

### Issue 2: Prisma Client Not Generated

**Problem:**
```
Cannot find module '@prisma/client'
```

**Solution:**
```bash
pnpm prisma generate
```

---

### Issue 3: Token Expired

**Problem:**
```
{
  "success": false,
  "message": "Token expired"
}
```

**Solution:**
Login again to get fresh token. Access tokens expire after 30 minutes by default.

---

### Issue 4: Questions Not Found

**Problem:**
When attaching questions:
```
{
  "success": false,
  "message": "Questions not found: 1, 2, 3"
}
```

**Solution:**
You need to create questions first. Either:
1. Wait for question module implementation
2. Create manually via Prisma Studio
3. Create via SQL:

```sql
INSERT INTO question_bank (content, options, correct_answer, question_type, default_score, created_at)
VALUES (
  'Apa ibukota Indonesia?',
  '{"A":"Jakarta","B":"Bandung","C":"Surabaya","D":"Medan","E":"Bali"}',
  'A',
  'TWK',
  5,
  NOW()
);
```

---

## 📊 Database Verification

Check exam data via Prisma Studio:

```bash
pnpm prisma studio
```

Navigate to:
- **exams** table - See all created exams
- **exam_questions** table - See question associations
- **users** table - See creators

---

## 🎯 Next Steps

After exam module is working properly, we'll implement:

1. **Question Module** - CRUD for question bank
2. **Exam Sessions Module** - Start, answer, submit flow with timer
3. **Proctoring Module** - Log proctoring events

---

## 📝 Notes

### Business Rules Implemented

1. **Exam Creation:**
    - Title uniqueness per creator (soft constraint)
    - Duration is required (1-300 minutes)
    - Start/end time optional for scheduling

2. **Exam Update:**
    - Only creator can update
    - Cannot update duration if has active sessions
    - Partial updates supported

3. **Exam Deletion:**
    - Only creator can delete
    - Cannot delete if has participant attempts (data preservation)
    - Cascade deletes exam_questions (but not questions)

4. **Question Attachment:**
    - Validates all questions exist before attaching
    - Auto-assigns order numbers
    - Prevents duplicate attachments
    - Detachment doesn't delete questions from bank

5. **Access Control:**
    - Admin sees all exams
    - Participants only see exams with questions
    - Questions with correct answers only visible to admin

### Future Enhancements

Consider for future iterations:

1. **Exam Templates** - Copy existing exam structure
2. **Question Randomization** - Random order per participant
3. **Exam Publishing** - Draft/Published status
4. **Scheduled Auto-start** - Cron job to open exams
5. **Soft Delete** - Archive instead of hard delete
6. **Exam Categories** - Tag exams by subject
7. **Difficulty Levels** - Easy/Medium/Hard
8. **Time Slots** - Multiple sessions for same exam

---

## 🤝 Contributing

When adding new features to exam module:

1. Update validation schemas in `exams.validation.ts`
2. Add business logic in `exams.service.ts`
3. Create controller in `exams.controller.ts`
4. Mount route in `exams.route.ts`
5. Add constants in `constants.ts`
6. Update this documentation

---

## 📞 Support

If you encounter issues:

1. Check error logs in console
2. Verify token is valid and has correct role
3. Check database state via Prisma Studio
4. Review validation error messages
5. Test with simplified request first

---

**🎉 Congratulations! Exam module is now ready to use.**