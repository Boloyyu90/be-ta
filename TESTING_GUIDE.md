# 🧪 Postman Testing Guide - Tryout & Proctoring System

## 📦 Setup Instructions

### 1. Import Collection & Environment

1. **Import Collection:**
   - Open Postman
   - Click "Import" button
   - Select `Tryout_Proctoring_API.postman_collection.json`
   - Click "Import"

2. **Import Environment:**
   - Click "Import" again
   - Select `Tryout_Environment.postman_environment.json`
   - Click "Import"

3. **Select Environment:**
   - Top-right corner, select "Tryout System - Local"

4. **Configure Base URL:**
   - If your server runs on different port, update `baseUrl` variable
   - Default: `http://localhost:3000`

---

## 🎯 Testing Workflow (Recommended Order)

### Phase 1: Health Check ✅
```
1. Health Check
2. Root Endpoint
```
**Expected:** Server is running and responding

---

### Phase 2: Authentication 🔐

#### Register Users:
```
1. Register Participant
   → Creates participant account
   → Auto-saves accessToken and refreshToken

2. Register Admin  
   → Creates admin account (you need to manually change role in DB)
   → Auto-saves adminAccessToken and adminRefreshToken
```

#### Manually Change User Role to ADMIN:
```sql
-- Connect to your PostgreSQL database
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';
```

#### Login:
```
3. Login Participant
   → Refreshes tokens

4. Login Admin
   → Refreshes admin tokens
```

#### Test Token Refresh:
```
5. Refresh Token
   → Tests token refresh mechanism

6. Logout
   → Invalidates refresh token
```

---

### Phase 3: Question Bank Management 📝

**Role Required:** ADMIN

```
1. [ADMIN] Bulk Create Questions
   → Creates 3 sample questions (TIU, TKP, TWK)
   → Auto-saves bulkQuestionId1 and bulkQuestionId2

2. [ADMIN] Get All Questions
   → View all questions with pagination
   → Try filters: ?type=TIU&search=presiden

3. [ADMIN] Create Question
   → Create single question
   → Auto-saves questionId

4. [ADMIN] Get Question By ID
   → View specific question

5. [ADMIN] Update Question
   → Update question content/score

6. [ADMIN] Delete Question
   → Delete question (only if not used in exam)
```

---

### Phase 4: Exam Management 📋

**Role Required:** ADMIN

```
1. [ADMIN] Create Exam
   → Creates exam with title, description, duration
   → Auto-saves examId

2. [ADMIN] Attach Questions to Exam
   → Attach questions from question bank
   → Uses bulkQuestionId1 and bulkQuestionId2

3. [ADMIN] Get All Exams
   → View all exams with filters

4. [ADMIN] Get Exam By ID
   → View specific exam details

5. [ADMIN] Get Exam Questions
   → View all questions in exam (with correct answers)

6. [ADMIN] Get Exam Stats
   → View participant statistics

7. [ADMIN] Update Exam
   → Update title, duration, etc.

8. [ADMIN] Clone Exam
   → Duplicate exam with all questions
   → Auto-saves clonedExamId

9. [ADMIN] Reorder Questions
   → Change question order

10. [ADMIN] Detach Questions
    → Remove question from exam

11. [ADMIN] Delete Exam
    → Delete exam (only if no participants)
```

**Participant View:**
```
12. Get Available Exams
    → View exams as participant

13. Get Exam Details
    → View exam info (without questions)
```

---

### Phase 5: Taking Exam (Exam Session) ✍️

**Role Required:** PARTICIPANT

```
1. Start Exam
   → Starts exam session
   → Auto-saves userExamId and examQuestionId
   → Returns questions WITHOUT correct answers
   → Returns remaining time

2. Get My Exam Sessions
   → View all my exam sessions (IN_PROGRESS, FINISHED)

3. Get Exam Session Details
   → View specific session info

4. Get Exam Questions
   → Get questions for current session

5. Submit Answer (Auto-save)
   → Submit answer for specific question
   → Can be called multiple times (auto-save)
   → Returns progress (answered/total)

6. Submit Exam
   → Finalize exam submission
   → Calculates total score
   → Status changes to FINISHED
   → Can only be done once

7. Get Exam Answers (Review)
   → Review answers after submission
   → Shows correct answers and user's answers

8. Get My Results Summary
   → View statistics: avg score, pass rate, etc.

9. Get My Results
   → View all my exam results with pagination
```

**Admin View:**
```
10. [ADMIN] Get All Results
    → View all participants' results
    → Filter by examId, userId, status
```

---

### Phase 6: Proctoring 👁️

**Role Required:** PARTICIPANT (for logging), ADMIN (for viewing all)

```
1. Log Proctoring Event (Manual)
   → Manually log violation event
   → Types: NO_FACE_DETECTED, MULTIPLE_FACES, LOOKING_AWAY, FACE_DETECTED

2. Analyze Face (Mock)
   → Submit webcam image (base64) for analysis
   → Mock analyzer returns random violations
   → Auto-creates proctoring event if violation detected
   → Returns: analysis result, eventLogged status

3. Get My Proctoring Events
   → View my own proctoring events for specific exam
   → Filter by eventType

4. [ADMIN] Get All Proctoring Events
   → View all proctoring events across all users
   → Filter by userExamId, eventType, date range
```

---

### Phase 7: Dashboard 📊

**Role Required:** ALL AUTHENTICATED USERS

```
1. Get Dashboard Overview
   → Returns comprehensive data:
      - User profile
      - Upcoming exams
      - Active exam sessions
      - Recent results
      - Summary statistics
```

---

### Phase 8: User Management 👤

**Self-Management (All Users):**
```
1. Get My Profile
   → View own profile

2. Update My Profile
   → Update name, password only
```

**Admin Management:**
```
3. [ADMIN] Create User
   → Create new user (admin or participant)
   → Auto-saves createdUserId

4. [ADMIN] Get All Users
   → View all users with filters
   → ?role=PARTICIPANT&search=test

5. [ADMIN] Get User By ID
   → View specific user

6. [ADMIN] Get User Stats
   → View user exam statistics

7. [ADMIN] Update User
   → Update any user field (email, role, etc.)

8. [ADMIN] Delete User
   → Delete user (with validations)
```

---

## 🧪 Test Assertions Included

Every request includes automatic test assertions:

### Global Tests (All Requests):
```javascript
✅ Response time < 2000ms
✅ Status code validation
✅ Error logging for debugging
```

### Specific Tests (Per Endpoint):
```javascript
✅ Status code validation (200, 201, 400, etc.)
✅ Response structure validation
✅ Data existence checks
✅ Auto-save important IDs to environment
```

---

## 🔄 Chained Testing (Variables)

Variables are automatically saved and used across requests:

| Variable | Saved By | Used By |
|----------|----------|---------|
| `accessToken` | Register/Login | All authenticated requests |
| `adminAccessToken` | Admin Login | All admin requests |
| `userId` | Register | Get User By ID |
| `questionId` | Create Question | Update/Delete Question |
| `bulkQuestionId1` | Bulk Create | Attach Questions |
| `examId` | Create Exam | Start Exam, Get Exam |
| `userExamId` | Start Exam | Submit Answer, Submit Exam |
| `examQuestionId` | Start Exam | Submit Answer |

---

## 📝 Sample Test Scenarios

### Scenario 1: Complete Exam Flow
```
1. Login Participant
2. Get Available Exams
3. Start Exam
4. Submit Answer (multiple times)
5. Analyze Face (simulate proctoring)
6. Submit Exam
7. Get Exam Answers (review)
8. Get My Results
```

### Scenario 2: Admin Creates Exam
```
1. Login Admin
2. Bulk Create Questions (10 questions)
3. Create Exam
4. Attach Questions to Exam
5. Get Exam Questions (verify)
6. Get Exam Stats
```

### Scenario 3: Proctoring Monitoring
```
1. Start Exam (as participant)
2. Analyze Face (send multiple images)
3. Get My Proctoring Events
4. Login Admin
5. [ADMIN] Get All Proctoring Events
```

---

## ⚠️ Important Notes

### 1. **Admin Role Setup**
After registering admin, you MUST manually update role in database:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'admin@test.com';
```

### 2. **Token Management**
- Tokens auto-save to environment variables
- Access token expires in 30 minutes
- Refresh token expires in 30 days
- Use "Refresh Token" request when access token expires

### 3. **Request Dependencies**
Some requests depend on previous requests:
- Must create questions before creating exam
- Must create exam before starting exam
- Must start exam before submitting answers

### 4. **Pagination**
Most list endpoints support pagination:
```
?page=1&limit=10
```

### 5. **Filters**
Many endpoints support query filters:
```
?type=TIU&search=presiden&sortBy=createdAt&sortOrder=desc
```

---

## 🐛 Troubleshooting

### Issue: 401 Unauthorized
**Solution:** 
- Check if you've logged in
- Check if accessToken is set in environment
- Try refreshing token

### Issue: 403 Forbidden
**Solution:**
- Check if you're using correct role (admin vs participant)
- Verify admin role is set in database

### Issue: 404 Not Found
**Solution:**
- Check if resource exists (examId, questionId, etc.)
- Verify ID is saved in environment variables

### Issue: 400 Bad Request
**Solution:**
- Check request body format
- Verify all required fields are present
- Check validation rules (password, email, etc.)

---

## 📊 Collection Statistics

```
Total Requests: 60+
├── Health Check: 2
├── Authentication: 6
├── User Management: 8
├── Question Bank: 6
├── Exam Management: 13
├── Exam Session: 10
├── Proctoring: 4
└── Dashboard: 1
```

---

## 🚀 Running Collection with Newman (CLI)

Install Newman:
```bash
npm install -g newman
```

Run entire collection:
```bash
newman run Tryout_Proctoring_API.postman_collection.json \
  -e Tryout_Environment.postman_environment.json
```

Run specific folder:
```bash
newman run Tryout_Proctoring_API.postman_collection.json \
  --folder "Authentication" \
  -e Tryout_Environment.postman_environment.json
```

Generate HTML report:
```bash
npm install -g newman-reporter-html

newman run Tryout_Proctoring_API.postman_collection.json \
  -e Tryout_Environment.postman_environment.json \
  -r html
```

---

## 📚 Additional Resources

- **API Documentation:** Check codebase for detailed endpoint specs
- **Prisma Schema:** `/prisma/schema.prisma` for data models
- **Error Codes:** `/src/config/constants.ts` for error reference
- **Validation Rules:** Check `*.validation.ts` files in each feature

---

## ✅ Testing Checklist

### Before Testing:
- [ ] Server is running (`pnpm dev`)
- [ ] Database is migrated (`pnpm prisma:migrate`)
- [ ] Environment is imported in Postman
- [ ] Base URL is correct

### Basic Flow:
- [ ] Health check passes
- [ ] Can register participant
- [ ] Can login participant
- [ ] Can create questions (as admin)
- [ ] Can create exam (as admin)
- [ ] Can start exam (as participant)
- [ ] Can submit answers
- [ ] Can submit exam
- [ ] Can view results

### Advanced:
- [ ] Proctoring events are logged
- [ ] Face analysis works
- [ ] Dashboard shows correct data
- [ ] Admin can view all results
- [ ] Token refresh works
- [ ] Error responses are correct

---

## 🎓 Best Practices

1. **Always run Health Check first**
2. **Keep environment variables updated**
3. **Use separate accounts for admin and participant testing**
4. **Save collection after adding custom tests**
5. **Use folders to organize custom requests**
6. **Check console logs for debugging**
7. **Use Postman Monitors for CI/CD testing**

---

**Happy Testing! 🚀**

If you encounter any issues, check:
1. Server logs in terminal
2. Postman console (View → Show Postman Console)
3. Network tab for request/response details