# Laporan Penemuan Fitur Transaksi

**Versi:** 1.0
**Terakhir Diperbarui:** 2026-01-21
**Berdasarkan:** Analisis kode backend aktual

---

## 1. Ringkasan

Fitur Transaksi mengimplementasikan integrasi pembayaran dengan **Midtrans Snap** untuk sistem tryout CPNS. Fitur ini memungkinkan pengguna membeli akses ke ujian berbayar melalui berbagai metode pembayaran yang didukung Midtrans (e-wallet, virtual account, kartu kredit, QRIS, dll.).

### Komponen Utama

| Komponen | File | Fungsi |
|----------|------|--------|
| Service Layer | `transactions.service.ts` | Logika bisnis & integrasi Midtrans |
| Controller | `transactions.controller.ts` | Handler HTTP request |
| Types | `transactions.types.ts` | Definisi tipe TypeScript |
| Validation | `transactions.validation.ts` | Skema Zod untuk validasi input |
| Routes (Participant) | `routes/participant.route.ts` | Endpoint untuk peserta |
| Routes (Admin) | `routes/admin.route.ts` | Endpoint untuk admin |
| Routes (Public) | `routes/public.route.ts` | Endpoint webhook |

### Alur Tingkat Tinggi

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Peserta    │────▶│   Backend    │────▶│   Midtrans   │────▶│   Webhook    │
│   (Frontend) │     │   (API)      │     │   Snap API   │     │   (Backend)  │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
       │                    │                    │                    │
       │ 1. POST /transactions               │                    │
       │───────────────────▶│                    │                    │
       │                    │ 2. createTransaction()                 │
       │                    │───────────────────▶│                    │
       │                    │                    │                    │
       │                    │◀─── snapToken, redirectUrl ────────────│
       │◀─── response ─────│                    │                    │
       │                    │                    │                    │
       │ 3. Tampilkan Snap popup              │                    │
       │───────────────────────────────────────▶│                    │
       │                    │                    │                    │
       │                    │                    │ 4. Payment notification
       │                    │                    │───────────────────▶│
       │                    │                    │                    │
       │                    │◀──── Update status (PAID) ─────────────│
       │                    │                    │                    │
```

---

## 2. Model Data

### Model Transaction (Prisma Schema)

Berdasarkan `prisma/schema.prisma` baris 159-184:

```prisma
model Transaction {
  id              Int               @id @default(autoincrement())
  orderId         String            @unique @map("order_id")
  userId          Int               @map("user_id")
  examId          Int               @map("exam_id")
  amount          Int               // Jumlah dalam Rupiah (IDR)
  status          TransactionStatus @default(PENDING)
  paymentType     String?           @map("payment_type")
  snapToken       String?           @map("snap_token")
  snapRedirectUrl String?           @map("snap_redirect_url")
  paidAt          DateTime?         @map("paid_at")
  expiredAt       DateTime?         @map("expired_at")
  metadata        Json?
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  exam Exam @relation(fields: [examId], references: [id], onDelete: Cascade)

  @@unique([userId, examId, status])
  @@index([userId])
  @@index([examId])
  @@index([status])
  @@index([orderId])
  @@map("transactions")
}
```

### Penjelasan Field

| Field | Tipe | Deskripsi |
|-------|------|-----------|
| `id` | Int | Primary key auto-increment |
| `orderId` | String | ID unik untuk Midtrans (format: `TRX-{timestamp}-{random}`) |
| `userId` | Int | Foreign key ke tabel users |
| `examId` | Int | Foreign key ke tabel exams |
| `amount` | Int | Jumlah pembayaran dalam Rupiah |
| `status` | TransactionStatus | Status transaksi saat ini |
| `paymentType` | String? | Metode pembayaran (diisi oleh webhook, contoh: `bank_transfer`, `gopay`, `qris`) |
| `snapToken` | String? | Token Snap Midtrans untuk popup pembayaran |
| `snapRedirectUrl` | String? | URL redirect alternatif Midtrans |
| `paidAt` | DateTime? | Timestamp pembayaran berhasil |
| `expiredAt` | DateTime? | Batas waktu pembayaran (24 jam dari pembuatan) |
| `metadata` | Json? | Data tambahan dari Midtrans webhook |
| `createdAt` | DateTime | Waktu pembuatan transaksi |
| `updatedAt` | DateTime | Waktu update terakhir |

### Constraint Unik

```prisma
@@unique([userId, examId, status])
```

**Implikasi:** Satu pengguna hanya bisa memiliki satu transaksi dengan status tertentu untuk satu ujian. Ini mencegah duplikasi transaksi PENDING untuk kombinasi user-exam yang sama.

---

## 3. State Machine Status

### Enum TransactionStatus

Berdasarkan `prisma/schema.prisma` baris 222-229:

```typescript
enum TransactionStatus {
  PENDING    // Menunggu pembayaran (Snap token sudah dibuat)
  PAID       // Pembayaran berhasil (settlement diterima)
  EXPIRED    // Waktu pembayaran habis (default 24 jam)
  CANCELLED  // Dibatalkan oleh pengguna atau sistem
  FAILED     // Pembayaran gagal (ditolak, error)
  REFUNDED   // Dikembalikan (untuk penanganan dispute di masa depan)
}
```

### Diagram Transisi Status

```
                                    ┌─────────────┐
                                    │   PENDING   │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    │                      │                      │
                    ▼                      ▼                      ▼
            ┌───────────┐          ┌───────────┐          ┌───────────┐
            │   PAID    │          │  EXPIRED  │          │ CANCELLED │
            └─────┬─────┘          └───────────┘          └───────────┘
                  │
                  │ (Future)
                  ▼
            ┌───────────┐
            │ REFUNDED  │
            └───────────┘

         FAILED dapat terjadi dari PENDING jika pembayaran ditolak
```

### Pemetaan Status Midtrans → Internal

Berdasarkan `transactions.types.ts` baris 182-192:

| Status Midtrans | Status Internal |
|-----------------|-----------------|
| `capture` | PAID |
| `settlement` | PAID |
| `pending` | PENDING |
| `deny` | FAILED |
| `cancel` | CANCELLED |
| `expire` | EXPIRED |
| `failure` | FAILED |
| `refund` | REFUNDED |
| `partial_refund` | REFUNDED |

### Sistem Prioritas Status

Berdasarkan `transactions.service.ts` baris 488-495:

```typescript
const statusPriority: Record<TransactionStatus, number> = {
  PENDING: 1,
  FAILED: 2,
  CANCELLED: 3,
  EXPIRED: 4,
  PAID: 5,
  REFUNDED: 6,
};
```

**Aturan:** Status dengan prioritas lebih tinggi tidak dapat diubah ke status dengan prioritas lebih rendah. Contoh: Transaksi PAID tidak bisa kembali ke PENDING.

---

## 4. Ringkasan Endpoint API

### Endpoint Peserta (Authenticated)

Base path: `/api/v1/transactions`

| Method | Path | Fungsi | Rate Limit |
|--------|------|--------|------------|
| GET | `/config/client-key` | Dapatkan client key Midtrans untuk frontend | - |
| GET | `/exam/:examId/access` | Cek apakah user punya akses ke ujian | - |
| GET | `/order/:orderId` | Dapatkan transaksi berdasarkan order ID | - |
| POST | `/` | Buat transaksi baru | 10 req/15 menit |
| GET | `/` | Daftar transaksi milik user | - |
| GET | `/:id` | Detail transaksi berdasarkan ID | - |
| POST | `/:id/cancel` | Batalkan transaksi pending | - |
| POST | `/:id/sync` | Sinkronisasi status dari Midtrans | - |

### Endpoint Admin (Admin Only)

Base path: `/api/v1/admin/transactions`

| Method | Path | Fungsi |
|--------|------|--------|
| GET | `/` | Daftar semua transaksi dengan filter |
| GET | `/stats` | Statistik transaksi |
| POST | `/cleanup` | Bersihkan transaksi expired |
| GET | `/:id` | Detail transaksi apa saja |

### Endpoint Publik (No Auth)

Base path: `/api/v1/transactions`

| Method | Path | Fungsi | Rate Limit |
|--------|------|--------|------------|
| POST | `/webhook` | Terima notifikasi dari Midtrans | 100 req/menit |

---

## 5. Aturan Bisnis

### 5.1 Pembuatan Transaksi

**File:** `transactions.service.ts` fungsi `createTransaction()` (baris 98-255)

1. **Validasi Konfigurasi Midtrans** (baris 104-107)
   - Jika `serverKey` atau `clientKey` tidak dikonfigurasi, lempar error 500

2. **Validasi Ujian Ada** (baris 109-117)
   - Jika ujian tidak ditemukan, lempar `NotFoundError`

3. **Cek Ujian Gratis** (baris 119-122)
   - Jika `price` null atau 0, lempar `BadRequestError` karena tidak perlu transaksi

4. **Cek Sudah Ada Transaksi PAID** (baris 124-135)
   - Jika sudah ada transaksi PAID untuk user-exam ini, lempar `ConflictError`
   - Pesan: "You already have access to this exam"

5. **Cek Sudah Ada Transaksi PENDING (Idempotent)** (baris 137-155)
   - Jika ada transaksi PENDING yang belum expired, kembalikan transaksi tersebut
   - **Tidak** membuat transaksi baru - ini perilaku idempotent

6. **Generate Order ID** (baris 168)
   - Format: `TRX-{timestamp}-{random8hex}`
   - Contoh: `TRX-1705835400000-A1B2C3D4`

7. **Hitung Waktu Expired** (baris 169)
   - 24 jam dari waktu pembuatan (`TRANSACTION_EXPIRY_HOURS = 24`)

8. **Panggil Midtrans Snap API** (baris 200-208)
   - Kirim data transaksi ke Midtrans
   - Tangkap error dan lempar `AppError` dengan status 502 (Bad Gateway)

### 5.2 Pengecekan Akses Ujian

**File:** `transactions.service.ts` fungsi `checkExamAccess()` (baris 357-431)

```typescript
// Response types
type ExamAccessReason = 'free' | 'paid' | 'pending' | 'not_purchased';

interface ExamAccessResponse {
  hasAccess: boolean;
  reason: ExamAccessReason;
  transaction: TransactionResponse | null;
  exam: { id, title, price };
}
```

**Alur Pengecekan:**

1. Jika ujian tidak ada → `NotFoundError`
2. Jika `price` null atau 0 → `hasAccess: true, reason: 'free'`
3. Jika ada transaksi PAID → `hasAccess: true, reason: 'paid'`
4. Jika ada transaksi PENDING (belum expired) → `hasAccess: false, reason: 'pending'`
5. Jika tidak ada transaksi valid → `hasAccess: false, reason: 'not_purchased'`

### 5.3 Integrasi dengan Exam Session

**File:** `exam-sessions.service.ts` fungsi `startExam()` (baris 238-262)

Sebelum memulai ujian, sistem memanggil `checkExamAccess()`:

```typescript
const accessCheck = await checkExamAccess(userId, examId);
if (!accessCheck.hasAccess) {
  if (accessCheck.reason === 'pending') {
    throw new BusinessLogicError(
      'Payment is pending. Please complete payment to access this exam.',
      'PAYMENT_PENDING',
      { transactionId, snapRedirectUrl }
    );
  }
  throw new BusinessLogicError(
    'Payment required to access this exam.',
    'PAYMENT_REQUIRED',
    { price: accessCheck.exam.price }
  );
}
```

### 5.4 Pembatalan Transaksi

**File:** `transactions.service.ts` fungsi `cancelTransaction()` (baris 541-581)

**Aturan:**
- Hanya transaksi dengan status PENDING yang bisa dibatalkan
- Hanya pemilik transaksi yang bisa membatalkan
- Metadata dicatat: `cancelled_at`, `cancelled_by: 'user'`

### 5.5 Rate Limiting

**File:** `rate-limit.middleware.ts` (baris 87-103, 119-134)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `POST /transactions` | 10 requests | 15 menit |
| `POST /transactions/webhook` | 100 requests | 1 menit |

**Konfigurasi via Environment:**
- `RATE_LIMIT_TRANSACTION_MAX` (default: 10)
- `RATE_LIMIT_TRANSACTION_WINDOW_MS` (default: 900000 = 15 menit)
- `RATE_LIMIT_WEBHOOK_MAX` (default: 100)
- `RATE_LIMIT_WEBHOOK_WINDOW_MS` (default: 60000 = 1 menit)

---

## 6. Titik Integrasi

### 6.1 Relasi Database

```
User (1) ────────▶ (N) Transaction
                           │
Exam (1) ────────▶ (N) Transaction
```

### 6.2 Integrasi dengan Fitur Lain

| Fitur | Titik Integrasi |
|-------|-----------------|
| **Exam Sessions** | Memanggil `checkExamAccess()` sebelum `startExam()` |
| **Exams** | Field `price` pada model Exam menentukan apakah ujian berbayar |

### 6.3 Integrasi Midtrans

**File:** `src/config/midtrans.ts`

```typescript
// Snap Client - untuk membuat transaksi
export const snap = new midtransClient.Snap({...});

// Core API - untuk cek status manual
export const coreApi = new midtransClient.CoreApi({...});
```

**Environment Variables:**
- `MIDTRANS_SERVER_KEY` - Server key (wajib di production)
- `MIDTRANS_CLIENT_KEY` - Client key (wajib di production)
- `MIDTRANS_IS_PRODUCTION` - true/false untuk sandbox vs production

---

## 7. Langkah Keamanan

### 7.1 Verifikasi Signature Webhook

**File:** `transactions.service.ts` fungsi `verifySignature()` (baris 63-89)

```typescript
function verifySignature(notification: MidtransNotification): boolean {
  const payload = orderId + statusCode + grossAmount + serverKey;
  const expectedSignature = crypto
    .createHash('sha512')
    .update(payload)
    .digest('hex');

  // Constant-time comparison untuk cegah timing attacks
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}
```

**Penting:**
- Menggunakan `crypto.timingSafeEqual()` untuk mencegah timing attacks
- Jika signature tidak valid, lempar `UnauthorizedError`
- Webhook tetap return 200 untuk mencegah retry dari Midtrans

### 7.2 Sanitasi Log

**File:** `src/shared/utils/logger.ts` (baris 15-58)

Field sensitif yang di-redact:
- `signature_key`
- `snapToken` / `snap_token`
- `serverKey` / `server_key`
- `clientKey` / `client_key`
- `password`
- `token`
- `authorization`

### 7.3 Validasi Input

**File:** `transactions.validation.ts`

Semua input divalidasi dengan Zod schema:
- `examId` harus integer positif
- `orderId` harus string non-empty
- `status` harus salah satu dari enum TransactionStatus
- Query parameter `page`, `limit` dengan batas wajar

### 7.4 Authorization

| Endpoint | Middleware |
|----------|-----------|
| Participant routes | `authenticate` (JWT valid) |
| Admin routes | `authenticate` + `requireAdmin` |
| Webhook | No auth, tapi signature verification |

---

## 8. Temuan & Catatan

### 8.1 Perilaku Idempotent

**Lokasi:** `transactions.service.ts` baris 137-155

Ketika user mencoba membuat transaksi untuk ujian yang sudah ada transaksi PENDING:
- Sistem **tidak** membuat transaksi baru
- Sistem **mengembalikan** transaksi PENDING yang sudah ada
- Ini mencegah duplikasi dan menghemat kuota API Midtrans

```typescript
if (existingPending) {
  return {
    transaction: existingPending as TransactionResponse,
    snapToken: existingPending.snapToken || '',
    snapRedirectUrl: existingPending.snapRedirectUrl || '',
    clientKey: midtransConfig.getClientKey(),
  };
}
```

### 8.2 Unique Constraint pada Status

**Lokasi:** `prisma/schema.prisma` baris 178

```prisma
@@unique([userId, examId, status])
```

**Implikasi:**
- User bisa punya multiple transaksi untuk satu ujian (PENDING, kemudian EXPIRED, kemudian PENDING baru)
- Tapi hanya satu transaksi dengan status yang sama pada satu waktu
- Ini memungkinkan history transaksi sambil mencegah duplikasi status aktif

### 8.3 Cleanup Transaksi Expired

**Lokasi:** `transactions.service.ts` fungsi `cleanupExpiredTransactions()` (baris 627-672)

- Fungsi ini **harus** dipanggil secara periodik (via cron job atau admin endpoint)
- Mencari transaksi PENDING dengan `expiredAt < now()`
- Mengubah status ke EXPIRED
- Mencatat metadata cleanup

**Catatan:** Tidak ada cron job yang di-setup secara otomatis. Admin harus:
1. Setup cron job eksternal, atau
2. Panggil `POST /api/v1/admin/transactions/cleanup` secara manual/periodik

### 8.4 Error Handling Webhook

**Lokasi:** `transactions.controller.ts` baris 239-264

```typescript
try {
  const transaction = await transactionsService.handleWebhookNotification(notification);
  sendSuccess(res, {...}, 'Webhook processed successfully', 200);
} catch (error) {
  transactionLogger.webhookFailed(orderId, error);
  // Still return 200 to prevent Midtrans from retrying
  sendSuccess(res, { processed: false }, 'Webhook received', 200);
}
```

**Alasan:** Midtrans akan terus retry webhook jika menerima non-2xx response. Dengan selalu return 200, kita mencegah retry yang tidak perlu sambil tetap logging error untuk debugging.

### 8.5 Fitur Refund Belum Diimplementasi

Status `REFUNDED` ada di enum tapi tidak ada endpoint atau fungsi untuk melakukan refund. Ini adalah placeholder untuk pengembangan di masa depan.

### 8.6 Tidak Ada Notifikasi Email

Sistem saat ini tidak mengirim notifikasi email kepada user ketika:
- Transaksi dibuat
- Pembayaran berhasil
- Transaksi expired

Ini bisa menjadi enhancement di masa depan.

### 8.7 Response Format CreateTransaction

**Response yang dikembalikan ke frontend:**

```typescript
{
  transaction: {
    id, orderId, userId, examId, amount, status,
    paymentType, snapToken, snapRedirectUrl,
    paidAt, expiredAt, createdAt, updatedAt,
    exam: { id, title, price }
  },
  snapToken: string,       // Untuk Snap.js popup
  snapRedirectUrl: string, // Alternatif redirect
  clientKey: string        // Untuk inisialisasi Snap.js
}
```

### 8.8 Data yang Dikirim ke Midtrans

**Lokasi:** `transactions.service.ts` baris 172-193

```typescript
const snapParameter = {
  transaction_details: {
    order_id: orderId,
    gross_amount: exam.price,
  },
  customer_details: {
    first_name: user.name,
    email: user.email,
  },
  item_details: [{
    id: `EXAM-${exam.id}`,
    price: exam.price,
    quantity: 1,
    name: exam.title.substring(0, 50), // Midtrans limit 50 char
  }],
  expiry: {
    unit: 'hour',
    duration: 24,
  },
};
```

---

## Lampiran A: Kode Error

| Error Code | HTTP Status | Pesan | Kondisi |
|------------|-------------|-------|---------|
| - | 500 | "Payment gateway is not configured" | Midtrans tidak dikonfigurasi |
| - | 404 | "Exam not found" | Ujian tidak ditemukan |
| - | 400 | "This exam is free and does not require payment" | Ujian gratis |
| - | 409 | "You already have access to this exam" | Sudah ada transaksi PAID |
| - | 404 | "User not found" | User tidak ditemukan |
| - | 502 | "Failed to initialize payment. Please try again later." | Midtrans API error |
| - | 502 | "Payment gateway returned invalid response." | Midtrans response invalid |
| - | 404 | "Transaction not found" | Transaksi tidak ditemukan |
| - | 403 | "Unauthorized" | Bukan pemilik transaksi |
| - | 400 | "Only pending transactions can be cancelled" | Cancel non-PENDING |
| - | 401 | "Invalid signature" | Webhook signature invalid |
| PAYMENT_PENDING | 400 | "Payment is pending. Please complete payment to access this exam." | Coba mulai ujian dengan transaksi pending |
| PAYMENT_REQUIRED | 400 | "Payment required to access this exam." | Coba mulai ujian tanpa transaksi |
| RATE_LIMIT_EXCEEDED | 429 | "Too many requests, please try again later" | Rate limit tercapai |

---

## Lampiran B: Alur Sequence Lengkap

### B.1 Alur Pembuatan Transaksi

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│ Frontend│          │ Backend │          │   DB    │          │Midtrans │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │ POST /transactions │                    │                    │
     │ { examId: 1 }      │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ findUnique(exam)   │                    │
     │                    │───────────────────▶│                    │
     │                    │◀───── exam ────────│                    │
     │                    │                    │                    │
     │                    │ findFirst(PAID tx) │                    │
     │                    │───────────────────▶│                    │
     │                    │◀───── null ────────│                    │
     │                    │                    │                    │
     │                    │ findFirst(PENDING) │                    │
     │                    │───────────────────▶│                    │
     │                    │◀───── null ────────│                    │
     │                    │                    │                    │
     │                    │ findUnique(user)   │                    │
     │                    │───────────────────▶│                    │
     │                    │◀───── user ────────│                    │
     │                    │                    │                    │
     │                    │                    │ snap.createTx()   │
     │                    │───────────────────────────────────────▶│
     │                    │◀────── { token, redirect_url } ────────│
     │                    │                    │                    │
     │                    │ create(transaction)│                    │
     │                    │───────────────────▶│                    │
     │                    │◀───── tx ─────────│                    │
     │                    │                    │                    │
     │◀── { transaction,  │                    │                    │
     │      snapToken,    │                    │                    │
     │      clientKey }   │                    │                    │
     │                    │                    │                    │
```

### B.2 Alur Webhook Pembayaran

```
┌─────────┐          ┌─────────┐          ┌─────────┐
│Midtrans │          │ Backend │          │   DB    │
└────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │
     │ POST /webhook      │                    │
     │ { order_id,        │                    │
     │   transaction_     │                    │
     │   status,          │                    │
     │   signature_key }  │                    │
     │───────────────────▶│                    │
     │                    │                    │
     │                    │ verifySignature()  │
     │                    │──────────┐         │
     │                    │◀─────────┘         │
     │                    │                    │
     │                    │ findUnique(orderId)│
     │                    │───────────────────▶│
     │                    │◀───── tx ─────────│
     │                    │                    │
     │                    │ Check idempotency  │
     │                    │ Check status       │
     │                    │ priority           │
     │                    │──────────┐         │
     │                    │◀─────────┘         │
     │                    │                    │
     │                    │ update(tx, PAID)   │
     │                    │───────────────────▶│
     │                    │◀───── updated ────│
     │                    │                    │
     │◀── 200 OK ─────────│                    │
     │                    │                    │
```

---

## Lampiran C: Checklist Integrasi Frontend

Untuk mengintegrasikan fitur transaksi di frontend, pastikan:

- [ ] Install Midtrans Snap.js: `<script src="https://app.sandbox.midtrans.com/snap/snap.js" data-client-key="CLIENT_KEY"></script>`
- [ ] Ambil client key via `GET /api/v1/transactions/config/client-key`
- [ ] Cek akses ujian via `GET /api/v1/transactions/exam/:examId/access` sebelum tampilkan tombol beli/mulai
- [ ] Handle response `createTransaction` untuk buka Snap popup
- [ ] Implementasi callback `onSuccess`, `onPending`, `onError`, `onClose` dari Snap
- [ ] Polling status atau listen untuk update real-time setelah pembayaran
- [ ] Handle expired transaction (tampilkan tombol "Buat Transaksi Baru")
- [ ] Tampilkan riwayat transaksi via `GET /api/v1/transactions`

---

*Dokumen ini dibuat berdasarkan analisis kode backend aktual pada 2026-01-21.*
