# 🚀 Postman Quick Reference - Tryout System

## 🔑 Common Variables

```
{{baseUrl}}             - http://localhost:3000
{{accessToken}}         - Participant token
{{adminAccessToken}}    - Admin token
{{userId}}              - Current user ID
{{examId}}              - Current exam ID
{{userExamId}}          - Current exam session ID
{{questionId}}          - Question ID
{{examQuestionId}}      - Exam question ID
```

---

## 📌 Quick Commands

### 🏥 Health & Info
```
GET  {{baseUrl}}/health
GET  {{baseUrl}}/
```

---

### 🔐 Authentication

```bash
# Register
POST {{baseUrl}}/api/v1/auth/register
{
  "name": "Test User",
  "email": "test@example.com",
  "password": "Password123"
}

# Login
POST {{baseUrl}}/api/v1/auth/login
{
  "email": "test@example.com",
  "password": "Password123"
}

# Refresh Token
POST {{baseUrl}}/api/v1/auth/refresh
{
  "refreshToken": "{{refreshToken}}"
}

# Logout
POST {{baseUrl}}/api/v1/auth/logout
{
  "refreshToken": "{{refreshToken}}"
}
```

---

### 👤 User Management

```bash
# Get My Profile
GET {{baseUrl}}/api/v1/users/me
Authorization: Bearer {{accessToken}}

# Update My Profile
PATCH {{baseUrl}}/api/v1/users/me
Authorization: Bearer {{accessToken}}
{
  "name": "New Name"
}

# [ADMIN] Get All Users
GET {{baseUrl}}/api/v1/users?page=1&limit=10
Authorization: Bearer {{adminAccessToken}}

# [ADMIN] Create User
POST {{baseUrl}}/api/v1/users
Authorization: Bearer {{adminAccessToken}}
{
  "name": "New User",
  "email": "newuser@test.com",
  "password": "Password123",
  "role": "PARTICIPANT"
}

# [ADMIN] Get User Stats
GET {{baseUrl}}/api/v1/users/{{userId}}/stats
Authorization: Bearer {{adminAccessToken}}
```

---

### 📝 Question Bank

```bash
# [ADMIN] Create Question
POST {{baseUrl}}/api/v1/admin/questions
Authorization: Bearer {{adminAccessToken}}
{
  "content": "Siapa presiden RI pertama?",
  "options": {
    "A": "Soekarno",
    "B": "Hatta",
    "C": "Soeharto",
    "D": "Habibie",
    "E": "Megawati"
  },
  "correctAnswer": "A",
  "questionType": "TWK",
  "defaultScore": 5
}

# [ADMIN] Bulk Create
POST {{baseUrl}}/api/v1/admin/questions/bulk
Authorization: Bearer {{adminAccessToken}}
{
  "questions": [
    { /* question 1 */ },
    { /* question 2 */ }
  ]
}

# [ADMIN] Get All Questions
GET {{baseUrl}}/api/v1/admin/questions?page=1&limit=10&type=TIU
Authorization: Bearer {{adminAccessToken}}

# [ADMIN] Update Question
PATCH {{baseUrl}}/api/v1/admin/questions/{{questionId}}
Authorization: Bearer {{adminAccessToken}}
{
  "content": "Updated content",
  "defaultScore": 10
}

# [ADMIN] Delete Question
DELETE {{baseUrl}}/api/v1/admin/questions/{{questionId}}
Authorization: Bearer {{adminAccessToken}}
```

---

### 📋 Exam Management

```bash
# [ADMIN] Create Exam
POST {{baseUrl}}/api/v1/exams/admin
Authorization: Bearer {{adminAccessToken}}
{
  "title": "Tryout SKD 2025",
  "description": "Simulasi CPNS",
  "durationMinutes": 90
}

# [ADMIN] Attach Questions
POST {{baseUrl}}/api/v1/exams/admin/{{examId}}/questions
Authorization: Bearer {{adminAccessToken}}
{
  "questionIds": [1, 2, 3, 4, 5]
}

# [ADMIN] Get Exam Questions
GET {{baseUrl}}/api/v1/exams/admin/{{examId}}/questions
Authorization: Bearer {{adminAccessToken}}

# [ADMIN] Reorder Questions
PATCH {{baseUrl}}/api/v1/exams/admin/{{examId}}/questions/reorder
Authorization: Bearer {{adminAccessToken}}
{
  "questionIds": [3, 1, 2, 5, 4]
}

# [ADMIN] Detach Questions
DELETE {{baseUrl}}/api/v1/exams/admin/{{examId}}/questions
Authorization: Bearer {{adminAccessToken}}
{
  "questionIds": [1, 2]
}

# [ADMIN] Clone Exam
POST {{baseUrl}}/api/v1/exams/admin/{{examId}}/clone
Authorization: Bearer {{adminAccessToken}}

# [ADMIN] Get Exam Stats
GET {{baseUrl}}/api/v1/exams/admin/{{examId}}/stats
Authorization: Bearer {{adminAccessToken}}

# [ADMIN] Delete Exam
DELETE {{baseUrl}}/api/v1/exams/admin/{{examId}}
Authorization: Bearer {{adminAccessToken}}

# Get Available Exams (Participant)
GET {{baseUrl}}/api/v1/exams?page=1&limit=10
Authorization: Bearer {{accessToken}}

# Get Exam Details (Participant)
GET {{baseUrl}}/api/v1/exams/{{examId}}
Authorization: Bearer {{accessToken}}
```

---

### ✍️ Exam Session (Taking Exam)

```bash
# Start Exam
POST {{baseUrl}}/api/v1/exams/{{examId}}/start
Authorization: Bearer {{accessToken}}

# Get My Exam Sessions
GET {{baseUrl}}/api/v1/user-exams?page=1&limit=10&status=IN_PROGRESS
Authorization: Bearer {{accessToken}}

# Get Exam Questions (During Exam)
GET {{baseUrl}}/api/v1/user-exams/{{userExamId}}/questions
Authorization: Bearer {{accessToken}}

# Submit Answer (Auto-save)
POST {{baseUrl}}/api/v1/user-exams/{{userExamId}}/answers
Authorization: Bearer {{accessToken}}
{
  "examQuestionId": 123,
  "selectedOption": "A"
}

# Submit Exam (Finalize)
POST {{baseUrl}}/api/v1/user-exams/{{userExamId}}/submit
Authorization: Bearer {{accessToken}}

# Get Exam Answers (Review After Submit)
GET {{baseUrl}}/api/v1/user-exams/{{userExamId}}/answers
Authorization: Bearer {{accessToken}}

# Get My Results Summary
GET {{baseUrl}}/api/v1/results/me/summary
Authorization: Bearer {{accessToken}}

# Get My Results
GET {{baseUrl}}/api/v1/results/me?page=1&limit=10
Authorization: Bearer {{accessToken}}

# [ADMIN] Get All Results
GET {{baseUrl}}/api/v1/admin/results?page=1&examId={{examId}}
Authorization: Bearer {{adminAccessToken}}
```

---

### 👁️ Proctoring

```bash
# Log Manual Event
POST {{baseUrl}}/api/v1/proctoring/events
Authorization: Bearer {{accessToken}}
{
  "userExamId": {{userExamId}},
  "eventType": "LOOKING_AWAY",
  "metadata": {
    "note": "Manual test"
  }
}

# Analyze Face (Send Webcam Image)
POST {{baseUrl}}/api/v1/proctoring/user-exams/{{userExamId}}/analyze-face
Authorization: Bearer {{accessToken}}
{
  "imageBase64": "data:image/jpeg;base64,/9j/4AAQ..."
}

# Get My Proctoring Events
GET {{baseUrl}}/api/v1/proctoring/user-exams/{{userExamId}}/events?page=1
Authorization: Bearer {{accessToken}}

# [ADMIN] Get All Proctoring Events
GET {{baseUrl}}/api/v1/admin/proctoring/events?page=1&limit=20
Authorization: Bearer {{adminAccessToken}}
```

**Proctoring Event Types:**
- `FACE_DETECTED` - Normal (LOW severity)
- `NO_FACE_DETECTED` - High risk (HIGH severity)
- `MULTIPLE_FACES` - High risk (HIGH severity)
- `LOOKING_AWAY` - Medium risk (MEDIUM severity)

---

### 📊 Dashboard

```bash
# Get Dashboard Overview
GET {{baseUrl}}/api/v1/dashboard/overview
Authorization: Bearer {{accessToken}}
```

**Returns:**
- User profile
- Upcoming exams
- Active exam sessions
- Recent results
- Summary statistics (avg score, pass rate, etc.)

---

## 🎯 Common Query Parameters

```
?page=1                 - Page number
?limit=10               - Items per page
?search=keyword         - Search text
?type=TIU               - Filter by question type (TIU/TKP/TWK)
?role=PARTICIPANT       - Filter by user role
?status=IN_PROGRESS     - Filter by exam status
?sortBy=createdAt       - Sort field
?sortOrder=desc         - Sort direction (asc/desc)
?examId=123            - Filter by exam
?userId=456            - Filter by user
?eventType=MULTIPLE_FACES - Filter by proctoring event
?startDate=2025-01-01T00:00:00.000Z - Date range start
?endDate=2025-12-31T23:59:59.999Z   - Date range end
```

---

## 📋 Status Codes Reference

```
200 OK                  - Success
201 Created             - Resource created
204 No Content          - Success, no response body
400 Bad Request         - Invalid input
401 Unauthorized        - Not authenticated
403 Forbidden           - No permission
404 Not Found           - Resource not found
409 Conflict            - Resource already exists
500 Internal Error      - Server error
```

---

## 🔒 Authorization Headers

```
Authorization: Bearer {{accessToken}}           - Participant
Authorization: Bearer {{adminAccessToken}}      - Admin
```

---

## 🧪 Sample Data

### Valid Question Options:
```json
{
  "A": "Option A text",
  "B": "Option B text",
  "C": "Option C text",
  "D": "Option D text",
  "E": "Option E text"
}
```

### Valid Question Types:
- `TIU` - Tes Intelegensia Umum
- `TKP` - Tes Karakteristik Pribadi
- `TWK` - Tes Wawasan Kebangsaan

### Valid User Roles:
- `ADMIN` - Administrator
- `PARTICIPANT` - Exam participant

### Valid Exam Status:
- `IN_PROGRESS` - Exam is ongoing
- `FINISHED` - Exam completed
- `CANCELLED` - Exam cancelled
- `TIMEOUT` - Time limit exceeded

---

## 🐛 Quick Troubleshooting

```bash
# Check server
curl http://localhost:3000/health

# Test authentication
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Password123"}'

# Verify token
curl http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 💡 Pro Tips

1. **Use Collection Runner** for automated testing
2. **Save custom requests** in separate folder
3. **Use Pre-request Scripts** for dynamic data
4. **Check Postman Console** for detailed logs
5. **Use Variables** for reusable data
6. **Export Collection** before major changes
7. **Use Environments** for dev/staging/prod

---

## 📚 SQL Quick Commands

```sql
-- Change user role to admin
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';

-- View all users
SELECT id, name, email, role FROM users;

-- View exam statistics
SELECT 
  e.id, 
  e.title, 
  COUNT(ue.id) as participants 
FROM exams e 
LEFT JOIN user_exams ue ON e.id = ue.exam_id 
GROUP BY e.id;

-- View proctoring violations
SELECT 
  u.name, 
  e.title, 
  pe.event_type, 
  pe.severity,
  COUNT(*) as violation_count
FROM proctoring_events pe
JOIN user_exams ue ON pe.user_exam_id = ue.id
JOIN users u ON ue.user_id = u.id
JOIN exams e ON ue.exam_id = e.id
GROUP BY u.name, e.title, pe.event_type, pe.severity
ORDER BY violation_count DESC;

-- Clear all data (reset database)
TRUNCATE TABLE proctoring_events CASCADE;
TRUNCATE TABLE answers CASCADE;
TRUNCATE TABLE user_exams CASCADE;
TRUNCATE TABLE exam_questions CASCADE;
TRUNCATE TABLE exams CASCADE;
TRUNCATE TABLE question_bank CASCADE;
TRUNCATE TABLE tokens CASCADE;
TRUNCATE TABLE users CASCADE;
```

---

**🎓 Remember:**
- Start with Health Check
- Login before testing protected routes
- Use correct role (admin vs participant)
- Check environment variables
- Read error messages carefully

**Happy Testing! 🚀**