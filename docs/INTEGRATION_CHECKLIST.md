# Integration Checklist: Backend → Frontend

**Last Updated:** 2026-01-19
**Status:** Ready with Blockers

---

## Pre-Integration Checklist

### Critical (Must Fix Before Integration)

- [ ] **Install `midtrans-client` package**
  ```bash
  cd D:\Kuliah\LAST-BATTLE\project\backend
  pnpm add midtrans-client
  ```

- [ ] **Set Midtrans credentials in `.env`**
  ```env
  MIDTRANS_SERVER_KEY=SB-Mid-server-XXXXXXXX
  MIDTRANS_CLIENT_KEY=SB-Mid-client-XXXXXXXX
  MIDTRANS_IS_PRODUCTION=false
  ```

- [ ] **Run database migration**
  ```bash
  pnpm prisma migrate dev
  ```

### High Priority (Should Fix)

- [ ] **Replace console.log in webhook controller**
  - File: `src/features/transactions/transactions.controller.ts`
  - Lines: 241-258
  - Replace `console.log/error` with `transactionLogger`

### Verification Steps

- [ ] `pnpm run type-check` passes
- [ ] `pnpm run dev` starts without errors
- [ ] POST `/api/v1/transactions` returns 201
- [ ] Webhook signature verification works

---

## Quick API Reference

### Endpoints for Frontend

| Action | Method | Endpoint | Auth |
|--------|--------|----------|------|
| Create Transaction | POST | `/api/v1/transactions` | Yes |
| Check Exam Access | GET | `/api/v1/transactions/exam/:examId/access` | Yes |
| Get Transaction | GET | `/api/v1/transactions/:id` | Yes |
| List Transactions | GET | `/api/v1/transactions` | Yes |
| Cancel Transaction | POST | `/api/v1/transactions/:id/cancel` | Yes |
| Sync Status | POST | `/api/v1/transactions/:id/sync` | Yes |
| Get Client Key | GET | `/api/v1/transactions/config/client-key` | Yes |

### Status Values

| Status | Frontend Action |
|--------|-----------------|
| `PENDING` | Show payment popup / "Complete Payment" |
| `PAID` | Allow exam start |
| `EXPIRED` | Show "Try Again" |
| `CANCELLED` | Show "Try Again" |
| `FAILED` | Show "Try Again" |

### Access Check Response

| `reason` | `hasAccess` | Frontend Action |
|----------|-------------|-----------------|
| `free` | `true` | Start exam directly |
| `paid` | `true` | Start exam directly |
| `pending` | `false` | Show existing payment |
| `not_purchased` | `false` | Create new transaction |

---

## Frontend Integration Steps

```
1. Load Snap.js
   <script src="https://app.sandbox.midtrans.com/snap/snap.js"
           data-client-key="YOUR_CLIENT_KEY"></script>

2. Check access: GET /transactions/exam/:examId/access

3. If not purchased:
   - POST /transactions { examId }
   - Get snapToken from response
   - Store transactionId, orderId

4. Open payment:
   window.snap.pay(snapToken, {
     onSuccess: () => { /* poll status */ },
     onPending: () => { /* show pending UI */ },
     onError: () => { /* show error */ },
     onClose: () => { /* user closed */ }
   })

5. Poll status: GET /transactions/:id (every 5s)

6. Verify before exam: GET /transactions/exam/:examId/access
```

---

## Testing Commands

```bash
# Get auth token
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}' \
  | jq -r '.data.accessToken')

# Create transaction
curl -X POST http://localhost:3001/api/v1/transactions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"examId": 1}'

# Check access
curl http://localhost:3001/api/v1/transactions/exam/1/access \
  -H "Authorization: Bearer $TOKEN"

# List transactions
curl "http://localhost:3001/api/v1/transactions?page=1" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot find module 'midtrans-client'" | Run `pnpm add midtrans-client` |
| "Payment gateway is not configured" | Check `.env` for Midtrans keys |
| 429 Too Many Requests | Rate limited, wait 15 minutes |
| Snap popup blocked | Use `snapRedirectUrl` or enable popups |
| Webhook not updating status | Use `/sync` endpoint to manually check |

---

## Related Documents

- [Full Audit Report](./AUDIT_REPORT_TRANSACTIONS_MIDTRANS.md)
- [Midtrans Snap Docs](https://docs.midtrans.com/docs/snap-integration-guide)
- [Midtrans Sandbox Test](https://docs.midtrans.com/en/technical-reference/sandbox-test)
