# User Stories Fitur Transaksi

## Informasi Dokumen

- **Fitur:** Transaksi & Pembayaran Midtrans
- **Versi:** 1.0
- **Terakhir Diperbarui:** 2026-01-21
- **Berdasarkan:** Implementasi aktual backend

---

## Peran Pengguna

| Peran | Deskripsi |
|-------|-----------|
| **Peserta (Participant)** | Pengguna terdaftar yang mengikuti ujian tryout CPNS |
| **Admin** | Administrator sistem yang mengelola transaksi |
| **Sistem** | Proses otomatis (webhook Midtrans, cleanup job) |

---

## Daftar User Stories

### Kategori 1: Penemuan Ujian & Pengecekan Akses

---

### US-01: Melihat Detail Ujian Termasuk Harga

**Sebagai** peserta
**Saya ingin** melihat detail ujian termasuk harganya
**Sehingga** saya dapat memutuskan apakah akan membeli akses ujian tersebut

**Kriteria Penerimaan:**
- [ ] Diberikan peserta sudah login, ketika mengakses halaman detail ujian, maka harga ujian ditampilkan (atau label "Gratis" jika `price` null/0)
- [ ] Diberikan ujian berbayar, ketika detail ditampilkan, maka harga ditampilkan dalam format Rupiah (contoh: "Rp 50.000")
- [ ] Diberikan ujian tidak ditemukan, ketika mengakses detail, maka ditampilkan pesan error 404

**Catatan Teknis:**
- Endpoint: `GET /api/v1/exams/:id`
- Field harga: `exam.price` (nullable, dalam Rupiah)
- Jika `price` null atau 0, ujian gratis

**Pertimbangan UI/UX:**
- Tampilkan badge "GRATIS" untuk ujian gratis
- Format harga menggunakan locale Indonesia (titik sebagai pemisah ribuan)

---

### US-02: Mengecek Akses Ujian

**Sebagai** peserta
**Saya ingin** mengecek apakah saya memiliki akses ke suatu ujian
**Sehingga** saya tahu apakah perlu membayar atau bisa langsung mulai

**Kriteria Penerimaan:**
- [ ] Diberikan ujian gratis, ketika cek akses, maka `hasAccess: true, reason: 'free'`
- [ ] Diberikan ujian berbayar dan sudah dibayar, ketika cek akses, maka `hasAccess: true, reason: 'paid'`
- [ ] Diberikan ujian berbayar dengan transaksi pending, ketika cek akses, maka `hasAccess: false, reason: 'pending'` beserta data transaksi
- [ ] Diberikan ujian berbayar tanpa transaksi, ketika cek akses, maka `hasAccess: false, reason: 'not_purchased'`
- [ ] Diberikan ujian tidak ditemukan, ketika cek akses, maka error 404 "Exam not found"

**Catatan Teknis:**
- Endpoint: `GET /api/v1/transactions/exam/:examId/access`
- Response type: `ExamAccessResponse`
- Validasi: `examId` harus integer positif

**Contoh Response:**
```json
{
  "success": true,
  "data": {
    "hasAccess": false,
    "reason": "pending",
    "transaction": {
      "id": 123,
      "orderId": "TRX-1705835400000-A1B2C3D4",
      "snapToken": "...",
      "snapRedirectUrl": "..."
    },
    "exam": {
      "id": 1,
      "title": "Tryout SKD CPNS 2025",
      "price": 50000
    }
  }
}
```

**Pertimbangan UI/UX:**
- Panggil endpoint ini sebelum menampilkan tombol aksi (Mulai/Beli/Lanjutkan Bayar)
- Cache response selama beberapa detik untuk menghindari request berlebihan

---

### US-03: Melihat dan Memulai Ujian Gratis

**Sebagai** peserta
**Saya ingin** langsung memulai ujian gratis tanpa proses pembayaran
**Sehingga** saya dapat mengikuti ujian tanpa hambatan

**Kriteria Penerimaan:**
- [ ] Diberikan ujian dengan `price: null` atau `price: 0`, ketika cek akses, maka `hasAccess: true, reason: 'free'`
- [ ] Diberikan akses diberikan karena gratis, ketika klik tombol "Mulai Ujian", maka langsung diarahkan ke halaman ujian
- [ ] Diberikan ujian gratis, ketika mencoba membuat transaksi, maka error 400 "This exam is free and does not require payment"

**Catatan Teknis:**
- Cek akses: `GET /api/v1/transactions/exam/:examId/access`
- Start exam: `POST /api/v1/exam-sessions/exam/:examId/start`
- Error handling di `transactions.service.ts` baris 119-122

**Pertimbangan UI/UX:**
- Tampilkan badge "GRATIS" pada card ujian
- Tombol langsung "Mulai Ujian" tanpa popup pembayaran
- Jangan tampilkan informasi harga (atau tampilkan "Rp 0")

---

### US-04: Melihat Ujian Berbayar yang Belum Dibeli

**Sebagai** peserta
**Saya ingin** melihat informasi ujian berbayar yang belum saya beli
**Sehingga** saya dapat memutuskan untuk membeli akses

**Kriteria Penerimaan:**
- [ ] Diberikan ujian berbayar dan belum ada transaksi, ketika cek akses, maka `hasAccess: false, reason: 'not_purchased'`
- [ ] Diberikan `reason: 'not_purchased'`, ketika ditampilkan di UI, maka tampilkan tombol "Beli Sekarang" dengan harga
- [ ] Diberikan peserta klik "Beli Sekarang", ketika proses berlanjut, maka arahkan ke alur pembuatan transaksi

**Catatan Teknis:**
- Cek akses: `GET /api/v1/transactions/exam/:examId/access`
- Response akan berisi `exam.price` untuk ditampilkan

**Pertimbangan UI/UX:**
- Tampilkan harga dengan jelas
- Tombol CTA: "Beli Sekarang - Rp XX.XXX"
- Tampilkan deskripsi singkat apa yang didapat setelah membeli

---

### US-05: Melihat Ujian Berbayar yang Sudah Dibeli

**Sebagai** peserta
**Saya ingin** mengakses ujian yang sudah saya bayar
**Sehingga** saya dapat memulai atau melanjutkan ujian

**Kriteria Penerimaan:**
- [ ] Diberikan ujian berbayar dengan transaksi PAID, ketika cek akses, maka `hasAccess: true, reason: 'paid'`
- [ ] Diberikan `reason: 'paid'`, ketika ditampilkan di UI, maka tampilkan tombol "Mulai Ujian"
- [ ] Diberikan `hasAccess: true`, ketika start exam, maka berhasil membuat session ujian

**Catatan Teknis:**
- Cek akses: `GET /api/v1/transactions/exam/:examId/access`
- Response menyertakan `transaction` dengan detail transaksi PAID

**Pertimbangan UI/UX:**
- Tampilkan badge "SUDAH DIBELI" atau icon checklist
- Tombol: "Mulai Ujian" atau "Lanjutkan Ujian" jika sudah ada session

---

### US-06: Melihat Ujian dengan Pembayaran Pending

**Sebagai** peserta
**Saya ingin** melanjutkan pembayaran yang belum selesai
**Sehingga** saya dapat menyelesaikan pembelian tanpa membuat transaksi baru

**Kriteria Penerimaan:**
- [ ] Diberikan transaksi PENDING yang belum expired, ketika cek akses, maka `hasAccess: false, reason: 'pending'`
- [ ] Diberikan `reason: 'pending'`, ketika response diterima, maka sertakan `snapToken` dan `snapRedirectUrl`
- [ ] Diberikan tombol "Lanjutkan Pembayaran" diklik, ketika popup Snap dibuka, maka gunakan `snapToken` yang ada

**Catatan Teknis:**
- Cek akses: `GET /api/v1/transactions/exam/:examId/access`
- Response `transaction.snapToken` digunakan untuk melanjutkan pembayaran
- Transaksi dianggap expired jika `expiredAt < now()`

**Pertimbangan UI/UX:**
- Tampilkan status "Menunggu Pembayaran"
- Tombol: "Lanjutkan Pembayaran"
- Tampilkan sisa waktu sebelum transaksi expired
- Tampilkan opsi "Batalkan" untuk membuat transaksi baru

---

### Kategori 2: Pembuatan Transaksi

---

### US-07: Memulai Pembelian Ujian (Buat Transaksi Baru)

**Sebagai** peserta
**Saya ingin** membeli akses ke ujian berbayar
**Sehingga** saya mendapatkan Snap token untuk membayar

**Kriteria Penerimaan:**
- [ ] Diberikan ujian berbayar tanpa transaksi aktif, ketika POST transaksi, maka transaksi baru dibuat dengan status PENDING
- [ ] Diberikan transaksi berhasil dibuat, ketika response diterima, maka sertakan `snapToken`, `snapRedirectUrl`, dan `clientKey`
- [ ] Diberikan transaksi berhasil, ketika disimpan ke database, maka `expiredAt` diset 24 jam dari sekarang
- [ ] Diberikan Midtrans API error, ketika pembuatan gagal, maka error 502 "Failed to initialize payment"

**Catatan Teknis:**
- Endpoint: `POST /api/v1/transactions`
- Request body: `{ "examId": number }`
- Rate limit: 10 requests per 15 menit
- Order ID format: `TRX-{timestamp}-{random8hex}`

**Contoh Request:**
```json
POST /api/v1/transactions
{
  "examId": 1
}
```

**Contoh Response:**
```json
{
  "success": true,
  "message": "Transaction created successfully",
  "data": {
    "transaction": {
      "id": 123,
      "orderId": "TRX-1705835400000-A1B2C3D4",
      "amount": 50000,
      "status": "PENDING",
      "expiredAt": "2026-01-22T10:00:00.000Z"
    },
    "snapToken": "66e4fa55-fdac-4ef9-91b5-733b97d4...",
    "snapRedirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/...",
    "clientKey": "SB-Mid-client-..."
  }
}
```

**Pertimbangan UI/UX:**
- Tampilkan loading state saat membuat transaksi
- Setelah dapat response, langsung buka Snap popup
- Handle error dengan pesan yang user-friendly

---

### US-08: Mendapatkan Transaksi Pending yang Sudah Ada (Idempotent)

**Sebagai** peserta
**Saya ingin** mendapatkan transaksi pending yang sudah ada ketika mencoba membeli lagi
**Sehingga** saya tidak membuat transaksi duplikat

**Kriteria Penerimaan:**
- [ ] Diberikan sudah ada transaksi PENDING yang belum expired untuk exam ini, ketika POST transaksi, maka kembalikan transaksi yang sudah ada (bukan buat baru)
- [ ] Diberikan transaksi existing dikembalikan, ketika response diterima, maka sertakan `snapToken` yang sama
- [ ] Diberikan transaksi PENDING sudah expired, ketika POST transaksi, maka buat transaksi baru

**Catatan Teknis:**
- Implementasi di `transactions.service.ts` baris 137-155
- Cek: `findFirst({ where: { userId, examId, status: PENDING, expiredAt: { gt: new Date() } } })`
- Perilaku idempotent mencegah pemborosan kuota API Midtrans

**Pertimbangan UI/UX:**
- Frontend tidak perlu handling khusus - response sama seperti create baru
- Pengguna tidak perlu tahu bahwa transaksi di-reuse

---

### US-09: Ditolak Membeli Ujian yang Sudah Dibayar

**Sebagai** peserta
**Saya ingin** dicegah dari membeli ujian yang sudah saya bayar
**Sehingga** saya tidak melakukan pembayaran ganda

**Kriteria Penerimaan:**
- [ ] Diberikan sudah ada transaksi PAID untuk exam ini, ketika POST transaksi, maka error 409 "You already have access to this exam"
- [ ] Diberikan error 409, ketika ditampilkan di UI, maka redirect ke halaman ujian atau tampilkan pesan informatif

**Catatan Teknis:**
- Implementasi di `transactions.service.ts` baris 124-135
- Error type: `ConflictError`

**Pertimbangan UI/UX:**
- Idealnya frontend sudah cek akses sebelum tampilkan tombol "Beli"
- Jika error terjadi, tampilkan: "Anda sudah memiliki akses ke ujian ini"
- Tombol: "Mulai Ujian Sekarang"

---

### Kategori 3: Proses Pembayaran

---

### US-10: Menyelesaikan Pembayaran via Snap

**Sebagai** peserta
**Saya ingin** menyelesaikan pembayaran melalui popup Midtrans Snap
**Sehingga** saya mendapatkan akses ke ujian

**Kriteria Penerimaan:**
- [ ] Diberikan `snapToken` valid, ketika Snap.pay() dipanggil, maka popup pembayaran muncul
- [ ] Diberikan pembayaran berhasil, ketika callback `onSuccess` dipanggil, maka tampilkan konfirmasi sukses
- [ ] Diberikan pembayaran berhasil, ketika user kembali ke app, maka akses ujian sudah tersedia

**Catatan Teknis:**
- Frontend: `window.snap.pay(snapToken, { onSuccess, onPending, onError, onClose })`
- Client key: `GET /api/v1/transactions/config/client-key`
- Include Snap.js: `https://app.sandbox.midtrans.com/snap/snap.js`

**Contoh Kode Frontend:**
```javascript
// Inisialisasi
const clientKey = await fetch('/api/v1/transactions/config/client-key');

// Setelah create transaction
window.snap.pay(snapToken, {
  onSuccess: function(result) {
    // Pembayaran langsung sukses (CC, QRIS instan)
    showSuccessMessage();
    redirectToExam();
  },
  onPending: function(result) {
    // Menunggu pembayaran (VA, e-wallet)
    showPendingMessage(result);
  },
  onError: function(result) {
    showErrorMessage(result);
  },
  onClose: function() {
    // User menutup popup tanpa menyelesaikan
    showCancelledMessage();
  }
});
```

**Pertimbangan UI/UX:**
- Tampilkan loading sebelum popup muncul
- Siapkan halaman sukses/pending/error
- Jangan tutup halaman parent saat popup aktif

---

### US-11: Menunggu Pembayaran (e-Wallet/VA)

**Sebagai** peserta
**Saya ingin** menerima instruksi pembayaran untuk metode non-instan
**Sehingga** saya dapat menyelesaikan pembayaran melalui channel yang dipilih

**Kriteria Penerimaan:**
- [ ] Diberikan pembayaran via VA/e-wallet, ketika callback `onPending` dipanggil, maka tampilkan instruksi pembayaran
- [ ] Diberikan callback pending, ketika data diterima, maka sertakan nomor VA atau deep link e-wallet
- [ ] Diberikan user sudah bayar tapi belum dapat notifikasi, ketika cek status manual, maka status terupdate

**Catatan Teknis:**
- Callback `onPending` menyertakan detail metode pembayaran
- Polling status: `POST /api/v1/transactions/:id/sync`
- Atau tunggu webhook update status di backend

**Pertimbangan UI/UX:**
- Tampilkan instruksi lengkap sesuai metode pembayaran
- Tampilkan nomor VA yang bisa di-copy
- Tombol refresh untuk cek status terbaru
- Countdown timer sampai expired

---

### US-12: Menutup Popup Pembayaran Tanpa Menyelesaikan

**Sebagai** peserta
**Saya ingin** dapat menutup popup pembayaran dan kembali nanti
**Sehingga** saya tidak kehilangan transaksi yang sudah dibuat

**Kriteria Penerimaan:**
- [ ] Diberikan popup Snap ditutup tanpa pembayaran, ketika callback `onClose` dipanggil, maka transaksi tetap PENDING
- [ ] Diberikan transaksi masih PENDING, ketika user kembali ke halaman ujian, maka tampilkan opsi "Lanjutkan Pembayaran"
- [ ] Diberikan user ingin lanjut bayar, ketika create transaction lagi, maka kembalikan transaksi PENDING yang sama (idempotent)

**Catatan Teknis:**
- Transaksi tidak dibatalkan otomatis saat popup ditutup
- `snapToken` tetap valid sampai `expiredAt`

**Pertimbangan UI/UX:**
- Tampilkan pesan: "Pembayaran belum selesai"
- Tombol: "Lanjutkan Pembayaran" dan "Batalkan"
- Jelaskan bahwa transaksi akan expired dalam X jam

---

### US-13: Pembayaran Gagal

**Sebagai** peserta
**Saya ingin** mengetahui jika pembayaran saya gagal
**Sehingga** saya dapat mencoba metode pembayaran lain

**Kriteria Penerimaan:**
- [ ] Diberikan pembayaran ditolak (kartu ditolak, saldo tidak cukup), ketika callback `onError` dipanggil, maka tampilkan pesan error
- [ ] Diberikan error terjadi, ketika webhook diterima dengan status `deny`/`failure`, maka status transaksi jadi FAILED
- [ ] Diberikan transaksi FAILED, ketika user coba beli lagi, maka buat transaksi baru (bukan reuse yang gagal)

**Catatan Teknis:**
- Status mapping: `deny` → FAILED, `failure` → FAILED
- Transaksi FAILED tidak bisa di-reuse karena status bukan PENDING

**Pertimbangan UI/UX:**
- Tampilkan pesan error yang jelas
- Sarankan untuk coba metode pembayaran lain
- Tombol: "Coba Lagi" untuk membuat transaksi baru

---

### US-14: Pembayaran Kedaluwarsa

**Sebagai** peserta
**Saya ingin** mengetahui jika waktu pembayaran saya habis
**Sehingga** saya dapat membuat transaksi baru

**Kriteria Penerimaan:**
- [ ] Diberikan transaksi PENDING melewati 24 jam, ketika webhook `expire` diterima, maka status jadi EXPIRED
- [ ] Diberikan transaksi EXPIRED, ketika cek akses, maka `reason: 'not_purchased'` (bukan pending)
- [ ] Diberikan transaksi EXPIRED, ketika user buat transaksi baru, maka transaksi baru dibuat (bukan reuse)

**Catatan Teknis:**
- `TRANSACTION_EXPIRY_HOURS = 24`
- Status mapping: `expire` → EXPIRED
- Cleanup job: `POST /api/v1/admin/transactions/cleanup` untuk mark expired tanpa webhook

**Pertimbangan UI/UX:**
- Tampilkan: "Waktu pembayaran telah habis"
- Tombol: "Buat Transaksi Baru"
- Tampilkan countdown di halaman pending untuk awareness

---

### Kategori 4: Pasca-Pembayaran

---

### US-15: Sistem Menerima Webhook Settlement

**Sebagai** sistem
**Saya ingin** memproses notifikasi pembayaran sukses dari Midtrans
**Sehingga** status transaksi diupdate dan user dapat akses ujian

**Kriteria Penerimaan:**
- [ ] Diberikan webhook dengan `transaction_status: settlement`, ketika diproses, maka status transaksi jadi PAID
- [ ] Diberikan status diupdate ke PAID, ketika disimpan, maka `paidAt` diset ke waktu sekarang
- [ ] Diberikan webhook valid, ketika selesai diproses, maka return 200 OK ke Midtrans
- [ ] Diberikan signature tidak valid, ketika verifikasi gagal, maka log warning dan tetap return 200

**Catatan Teknis:**
- Endpoint: `POST /api/v1/transactions/webhook`
- Signature verification: SHA512(order_id + status_code + gross_amount + serverKey)
- Implementasi: `handleWebhookNotification()` di `transactions.service.ts`

**Pertimbangan UI/UX:**
- Tidak ada UI - ini proses backend
- Frontend perlu polling atau websocket untuk detect perubahan status

---

### US-16: Sistem Menerima Webhook Expire

**Sebagai** sistem
**Saya ingin** memproses notifikasi transaksi expired dari Midtrans
**Sehingga** status transaksi diupdate dengan benar

**Kriteria Penerimaan:**
- [ ] Diberikan webhook dengan `transaction_status: expire`, ketika diproses, maka status transaksi jadi EXPIRED
- [ ] Diberikan transaksi sudah EXPIRED, ketika user cek akses, maka `reason: 'not_purchased'`

**Catatan Teknis:**
- Status mapping: `expire` → EXPIRED
- Midtrans mengirim webhook expire setelah payment window habis

---

### US-17: Sistem Menangani Webhook Duplikat

**Sebagai** sistem
**Saya ingin** menangani webhook duplikat dengan aman
**Sehingga** tidak terjadi race condition atau error

**Kriteria Penerimaan:**
- [ ] Diberikan webhook dengan status yang sama seperti status saat ini, ketika diproses, maka tidak ada update (idempotent)
- [ ] Diberikan webhook mencoba menurunkan status (PAID → PENDING), ketika diproses, maka diabaikan (status priority)
- [ ] Diberikan webhook duplikat, ketika diproses, maka tetap return 200 OK

**Catatan Teknis:**
- Idempotency check: `transactions.service.ts` baris 476-506
- Status priority: PENDING(1) < FAILED(2) < CANCELLED(3) < EXPIRED(4) < PAID(5) < REFUNDED(6)
- Status hanya bisa naik, tidak bisa turun

**Log output:**
```
[INFO] Webhook idempotent hit - order TRX-xxx already has status PAID
```

---

### US-18: Polling Status Transaksi

**Sebagai** peserta
**Saya ingin** mengecek status transaksi secara berkala
**Sehingga** saya tahu kapan pembayaran sudah berhasil

**Kriteria Penerimaan:**
- [ ] Diberikan transaksi PENDING, ketika GET status, maka tampilkan status saat ini
- [ ] Diberikan transaksi sudah PAID, ketika GET status, maka tampilkan sukses
- [ ] Diberikan polling interval, ketika status masih PENDING, maka poll setiap 5-10 detik

**Catatan Teknis:**
- Get by ID: `GET /api/v1/transactions/:id`
- Get by Order ID: `GET /api/v1/transactions/order/:orderId`
- Response menyertakan `status` yang bisa di-check

**Pertimbangan UI/UX:**
- Implementasi polling dengan interval reasonable (5-10 detik)
- Stop polling setelah status final (PAID, EXPIRED, FAILED, CANCELLED)
- Tampilkan spinner/loading indicator saat polling
- Pertimbangkan WebSocket untuk real-time update

---

### US-19: Sinkronisasi Status Manual

**Sebagai** peserta
**Saya ingin** memaksa sinkronisasi status dari Midtrans
**Sehingga** saya dapat mendapatkan status terbaru jika webhook terlambat

**Kriteria Penerimaan:**
- [ ] Diberikan transaksi PENDING, ketika sync dipanggil, maka query status ke Midtrans Core API
- [ ] Diberikan Midtrans return settlement, ketika sync selesai, maka status diupdate ke PAID
- [ ] Diberikan user bukan pemilik transaksi, ketika sync dipanggil, maka error 404

**Catatan Teknis:**
- Endpoint: `POST /api/v1/transactions/:id/sync`
- Implementasi: `syncTransactionStatus()` memanggil `coreApi.transaction.status(orderId)`
- Response diproses seperti webhook

**Pertimbangan UI/UX:**
- Tombol: "Cek Status Pembayaran"
- Tampilkan loading saat sync
- Jangan spam - batasi 1x per menit per transaksi

---

### Kategori 5: Manajemen Transaksi

---

### US-20: Melihat Riwayat Transaksi

**Sebagai** peserta
**Saya ingin** melihat semua riwayat transaksi saya
**Sehingga** saya dapat tracking pembelian saya

**Kriteria Penerimaan:**
- [ ] Diberikan peserta punya transaksi, ketika list transaksi, maka tampilkan semua transaksi milik peserta
- [ ] Diberikan filter status, ketika diterapkan, maka hanya tampilkan transaksi dengan status tersebut
- [ ] Diberikan pagination, ketika page 2, maka tampilkan transaksi halaman kedua

**Catatan Teknis:**
- Endpoint: `GET /api/v1/transactions`
- Query params: `page`, `limit`, `status`, `examId`, `sortOrder`
- Default: page=1, limit=10, sortOrder=desc

**Contoh Request:**
```
GET /api/v1/transactions?status=PAID&page=1&limit=10
```

**Pertimbangan UI/UX:**
- Tampilkan dalam tabel atau card list
- Filter: All, Pending, Paid, Expired, Cancelled, Failed
- Sort: Terbaru dulu (default)
- Pagination dengan page numbers

---

### US-21: Melihat Detail Transaksi

**Sebagai** peserta
**Saya ingin** melihat detail lengkap satu transaksi
**Sehingga** saya dapat melihat informasi pembayaran

**Kriteria Penerimaan:**
- [ ] Diberikan ID transaksi valid dan milik peserta, ketika GET detail, maka tampilkan semua informasi
- [ ] Diberikan transaksi bukan milik peserta, ketika GET detail, maka error 404
- [ ] Diberikan transaksi PAID, ketika detail ditampilkan, maka sertakan `paidAt` dan `paymentType`

**Catatan Teknis:**
- By ID: `GET /api/v1/transactions/:id`
- By Order ID: `GET /api/v1/transactions/order/:orderId`
- Response menyertakan relasi `exam` dan `user`

**Pertimbangan UI/UX:**
- Tampilkan:
  - Nama ujian
  - Jumlah pembayaran
  - Status dengan badge warna
  - Metode pembayaran (jika sudah bayar)
  - Tanggal dibuat, dibayar, expired
  - Order ID untuk referensi

---

### US-22: Membatalkan Transaksi Pending

**Sebagai** peserta
**Saya ingin** membatalkan transaksi yang belum dibayar
**Sehingga** saya dapat membuat transaksi baru jika diperlukan

**Kriteria Penerimaan:**
- [ ] Diberikan transaksi PENDING milik peserta, ketika cancel dipanggil, maka status jadi CANCELLED
- [ ] Diberikan transaksi bukan PENDING, ketika cancel dipanggil, maka error 400 "Only pending transactions can be cancelled"
- [ ] Diberikan transaksi bukan milik peserta, ketika cancel dipanggil, maka error 403

**Catatan Teknis:**
- Endpoint: `POST /api/v1/transactions/:id/cancel`
- Hanya PENDING yang bisa di-cancel
- Metadata dicatat: `cancelled_at`, `cancelled_by: 'user'`

**Pertimbangan UI/UX:**
- Konfirmasi sebelum cancel: "Yakin batalkan transaksi ini?"
- Setelah cancel, tampilkan opsi "Buat Transaksi Baru"

---

### US-23: Membuat Transaksi Baru Setelah Gagal/Expired

**Sebagai** peserta
**Saya ingin** membuat transaksi baru setelah yang sebelumnya gagal atau expired
**Sehingga** saya dapat mencoba membayar lagi

**Kriteria Penerimaan:**
- [ ] Diberikan transaksi terakhir EXPIRED/FAILED/CANCELLED, ketika POST transaksi baru, maka transaksi baru dibuat
- [ ] Diberikan transaksi baru dibuat, ketika disimpan, maka punya Order ID baru
- [ ] Diberikan transaksi baru berhasil, ketika response diterima, maka bisa lanjut pembayaran

**Catatan Teknis:**
- Unique constraint `[userId, examId, status]` memungkinkan multiple transaksi dengan status berbeda
- Transaksi baru hanya dibuat jika tidak ada PENDING atau PAID aktif

**Pertimbangan UI/UX:**
- Tampilkan riwayat transaksi sebelumnya yang gagal
- Tombol: "Coba Bayar Lagi" yang jelas
- Jelaskan kenapa transaksi sebelumnya gagal

---

### Kategori 6: Operasi Admin

---

### US-24: Admin Melihat Semua Transaksi

**Sebagai** admin
**Saya ingin** melihat semua transaksi dalam sistem
**Sehingga** saya dapat monitoring aktivitas pembayaran

**Kriteria Penerimaan:**
- [ ] Diberikan admin terautentikasi, ketika list transaksi, maka tampilkan semua transaksi (bukan hanya milik admin)
- [ ] Diberikan filter status dan examId, ketika diterapkan, maka hasil terfilter
- [ ] Diberikan admin, ketika akses endpoint peserta, maka hanya lihat transaksi sendiri (bukan admin view)

**Catatan Teknis:**
- Endpoint: `GET /api/v1/admin/transactions`
- Berbeda dengan `GET /api/v1/transactions` yang hanya untuk user sendiri
- Query params sama: `page`, `limit`, `status`, `examId`, `sortOrder`

**Pertimbangan UI/UX:**
- Dashboard admin dengan tabel transaksi
- Filter tambahan: by user, by date range
- Export ke CSV/Excel

---

### US-25: Admin Melihat Detail Transaksi Lengkap

**Sebagai** admin
**Saya ingin** melihat detail lengkap transaksi siapa saja
**Sehingga** saya dapat membantu troubleshoot masalah pembayaran

**Kriteria Penerimaan:**
- [ ] Diberikan admin, ketika GET detail transaksi, maka tampilkan semua info termasuk metadata
- [ ] Diberikan admin, ketika lihat detail, maka sertakan info user (nama, email)
- [ ] Diberikan admin, ketika lihat detail, maka tampilkan metadata webhook dari Midtrans

**Catatan Teknis:**
- Endpoint: `GET /api/v1/admin/transactions/:id`
- Tidak ada filter userId - admin bisa lihat semua
- Metadata berisi full response dari Midtrans

**Pertimbangan UI/UX:**
- Tampilkan info user dengan jelas
- Tampilkan raw metadata (JSON viewer) untuk debugging
- Tombol: "Sync Status" untuk force update

---

## Lampiran A: Referensi Status

| Status | Warna Badge | Deskripsi UI | Aksi yang Tersedia |
|--------|-------------|--------------|-------------------|
| PENDING | Kuning/Orange | Menunggu Pembayaran | Lanjutkan Bayar, Batalkan |
| PAID | Hijau | Pembayaran Berhasil | Mulai Ujian |
| EXPIRED | Abu-abu | Waktu Habis | Buat Transaksi Baru |
| CANCELLED | Abu-abu | Dibatalkan | Buat Transaksi Baru |
| FAILED | Merah | Pembayaran Gagal | Coba Lagi |
| REFUNDED | Biru | Dikembalikan | - |

---

## Lampiran B: Kode Error & Pesan Ramah Pengguna

| Kode HTTP | Error | Pesan Backend | Pesan UI (Bahasa Indonesia) |
|-----------|-------|---------------|----------------------------|
| 400 | BadRequestError | "This exam is free and does not require payment" | "Ujian ini gratis, Anda tidak perlu membayar" |
| 400 | BadRequestError | "Only pending transactions can be cancelled" | "Hanya transaksi yang belum dibayar yang dapat dibatalkan" |
| 400 | BusinessLogicError | "Payment is pending..." | "Pembayaran sedang menunggu. Silakan selesaikan pembayaran." |
| 400 | BusinessLogicError | "Payment required..." | "Diperlukan pembayaran untuk mengakses ujian ini" |
| 403 | ForbiddenError | "Unauthorized" | "Anda tidak memiliki akses ke transaksi ini" |
| 404 | NotFoundError | "Exam not found" | "Ujian tidak ditemukan" |
| 404 | NotFoundError | "Transaction not found" | "Transaksi tidak ditemukan" |
| 404 | NotFoundError | "User not found" | "Pengguna tidak ditemukan" |
| 409 | ConflictError | "You already have access to this exam" | "Anda sudah memiliki akses ke ujian ini" |
| 429 | RateLimitExceeded | "Too many requests..." | "Terlalu banyak permintaan. Silakan coba lagi nanti." |
| 500 | AppError | "Payment gateway is not configured" | "Sistem pembayaran sedang tidak tersedia" |
| 502 | AppError | "Failed to initialize payment..." | "Gagal memulai pembayaran. Silakan coba lagi." |

---

## Lampiran C: Diagram Sequence Alur Utama

### C.1 Alur Pembelian Ujian (Happy Path)

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│   User  │          │ Frontend│          │ Backend │          │Midtrans │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │ Klik "Beli Ujian"  │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ POST /transactions │                    │
     │                    │───────────────────▶│                    │
     │                    │                    │                    │
     │                    │                    │ createTransaction()│
     │                    │                    │───────────────────▶│
     │                    │                    │                    │
     │                    │                    │◀─── snapToken ─────│
     │                    │                    │                    │
     │                    │◀─── { snapToken }  │                    │
     │                    │                    │                    │
     │                    │ snap.pay(token)    │                    │
     │◀─── Popup Snap ────│                    │                    │
     │                    │                    │                    │
     │ Pilih metode bayar │                    │                    │
     │ & selesaikan       │                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ onSuccess callback │                    │
     │                    │◀──────────────────────────────────────│
     │                    │                    │                    │
     │                    │                    │◀─── Webhook ───────│
     │                    │                    │    settlement      │
     │                    │                    │                    │
     │ "Pembayaran        │                    │                    │
     │  Berhasil!"        │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
```

### C.2 Alur Pembayaran Pending (VA/e-Wallet)

```
┌─────────┐          ┌─────────┐          ┌─────────┐          ┌─────────┐
│   User  │          │ Frontend│          │ Backend │          │Midtrans │
└────┬────┘          └────┬────┘          └────┬────┘          └────┬────┘
     │                    │                    │                    │
     │ Pilih Bank Transfer│                    │                    │
     │───────────────────▶│                    │                    │
     │                    │                    │                    │
     │                    │ onPending callback │                    │
     │                    │◀─────────────────────────────────────│
     │                    │                    │                    │
     │ Tampilkan no. VA   │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
     │ (Transfer via ATM) │                    │                    │
     │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ▶│
     │                    │                    │                    │
     │                    │                    │◀─── Webhook ───────│
     │                    │                    │    settlement      │
     │                    │                    │                    │
     │                    │ Poll: GET /transactions/:id            │
     │                    │───────────────────▶│                    │
     │                    │◀─── status: PAID ──│                    │
     │                    │                    │                    │
     │ "Pembayaran        │                    │                    │
     │  Berhasil!"        │                    │                    │
     │◀───────────────────│                    │                    │
     │                    │                    │                    │
```

---

## Lampiran D: Checklist Implementasi Frontend

### Persiapan

- [ ] Install Snap.js di HTML: `<script src="https://app.sandbox.midtrans.com/snap/snap.js">`
- [ ] Buat service untuk API calls (`transactionService.ts`)
- [ ] Buat store/state untuk menyimpan status transaksi

### Halaman/Komponen

- [ ] **ExamDetail**: Tampilkan harga, tombol Beli/Mulai berdasarkan akses
- [ ] **PaymentModal**: Wrapper untuk Snap popup
- [ ] **PaymentPending**: Tampilkan instruksi VA/e-wallet dengan countdown
- [ ] **PaymentSuccess**: Konfirmasi pembayaran berhasil
- [ ] **PaymentError**: Tampilkan error dan opsi retry
- [ ] **TransactionHistory**: List semua transaksi user
- [ ] **TransactionDetail**: Detail satu transaksi

### API Integration

- [ ] `checkExamAccess(examId)` - Cek akses ujian
- [ ] `createTransaction(examId)` - Buat transaksi
- [ ] `getTransaction(id)` - Get detail transaksi
- [ ] `getTransactions(filters)` - List transaksi
- [ ] `cancelTransaction(id)` - Batalkan transaksi
- [ ] `syncTransaction(id)` - Force sync status
- [ ] `getClientKey()` - Get Midtrans client key

### Error Handling

- [ ] Handle 400 Bad Request (validation errors)
- [ ] Handle 403 Forbidden (unauthorized)
- [ ] Handle 404 Not Found (exam/transaction not found)
- [ ] Handle 409 Conflict (already purchased)
- [ ] Handle 429 Rate Limit (too many requests)
- [ ] Handle 500/502 (server/gateway errors)

---

*Dokumen ini dibuat berdasarkan analisis kode backend aktual pada 2026-01-21.*
