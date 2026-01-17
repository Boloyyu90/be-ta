/**
 * Prisma Seed File - Tryout CPNS + Proctoring System + Midtrans Transactions
 *
 * THESIS PROJECT: Universitas Atma Jaya Yogyakarta
 * STUDENT: I Gede Bala Putra
 *
 * This seed file creates comprehensive test data for all exam flows:
 * - 1 Admin + 3 Participants with known credentials
 * - 3 Exams (retakes allowed, no retakes, max attempts limited)
 * - 25 Questions spanning TIU/TWK/TKP (CPNS categories)
 * - Multiple exam sessions covering all scenarios:
 *   - IN_PROGRESS (resume flow)
 *   - FINISHED (view results flow)
 *   - FINISHED with retakes allowed (retake flow)
 *   - FINISHED with retakes disabled (error flow)
 *   - Max attempts exhausted (error flow)
 *   - TIMEOUT (edge case)
 *   - CANCELLED (proctoring violation - edge case)
 * - Proctoring events for ML demonstration
 * - NEW: Transaction records for Midtrans payment testing
 *
 * USAGE:
 *   1. npx prisma migrate reset     (RECOMMENDED: clean + migrate + seed)
 *   2. npx ts-node prisma/seed.ts   (seed only - uses internal cleanup)
 *
 * IDEMPOTENT: Safe to run multiple times - cleans data before seeding
 *
 * @version 3.0.0 (Added Midtrans Transaction support)
 * @date January 2026
 */

import {
  PrismaClient,
  UserRole,
  QuestionType,
  ExamStatus,
  ProctoringEventType,
  TransactionStatus, // NEW: Import TransactionStatus enum
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const SALT_ROUNDS = 10;

/**
 * Test Credentials - DOCUMENT THESE FOR TESTING
 *
 * Password Requirements: min 8 chars, uppercase, lowercase, number, special char
 */
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@prestige.ac.id',
    password: 'Admin123!',
    name: 'Admin Prestige',
  },
  participant1: {
    email: 'budi@example.com',
    password: 'Budi1234!',
    name: 'Budi Santoso',
  },
  participant2: {
    email: 'siti@example.com',
    password: 'Siti1234!',
    name: 'Siti Rahayu',
  },
  participant3: {
    email: 'andi@example.com',
    password: 'Andi1234!',
    name: 'Andi Wijaya',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

function log(message: string): void {
  console.log(`[SEED] ${message}`);
}

function logSection(title: string): void {
  console.log('\n' + '─'.repeat(60));
  console.log(`📦 ${title}`);
  console.log('─'.repeat(60));
}

function getWrongOption(correctAnswer: string): string {
  const options = ['A', 'B', 'C', 'D', 'E'];
  const wrongOptions = options.filter((o) => o !== correctAnswer);
  return wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
}

/**
 * Get relative date from now
 * Positive = future, Negative = past
 */
function relativeDate(options: {
  days?: number;
  hours?: number;
  minutes?: number;
}): Date {
  const date = new Date();
  if (options.days) date.setDate(date.getDate() + options.days);
  if (options.hours) date.setHours(date.getHours() + options.hours);
  if (options.minutes) date.setMinutes(date.getMinutes() + options.minutes);
  return date;
}

/**
 * Generate unique order ID for Midtrans transactions
 */
function generateOrderId(prefix: string = 'TRX'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

// ============================================================================
// DATABASE CLEANUP
// ============================================================================

async function cleanDatabase() {
  logSection('CLEANING DATABASE');

  // Order matters due to foreign key constraints
  // Delete in reverse dependency order
  const deleteOrder = [
    { name: 'ProctoringEvent', fn: () => prisma.proctoringEvent.deleteMany() },
    { name: 'Answer', fn: () => prisma.answer.deleteMany() },
    { name: 'UserExam', fn: () => prisma.userExam.deleteMany() },
    { name: 'Transaction', fn: () => prisma.transaction.deleteMany() }, // NEW: Clean transactions
    { name: 'ExamQuestion', fn: () => prisma.examQuestion.deleteMany() },
    { name: 'Exam', fn: () => prisma.exam.deleteMany() },
    { name: 'QuestionBank', fn: () => prisma.questionBank.deleteMany() },
    { name: 'Token', fn: () => prisma.token.deleteMany() },
    { name: 'User', fn: () => prisma.user.deleteMany() },
  ];

  for (const item of deleteOrder) {
    const result = await item.fn();
    log(`  ✓ Deleted ${result.count} records from ${item.name}`);
  }

  log('Database cleaned successfully');
}

// ============================================================================
// SEED: USERS
// ============================================================================

async function seedUsers() {
  logSection('SEEDING USERS');

  const adminPassword = await hashPassword(TEST_CREDENTIALS.admin.password);
  const participant1Password = await hashPassword(TEST_CREDENTIALS.participant1.password);
  const participant2Password = await hashPassword(TEST_CREDENTIALS.participant2.password);
  const participant3Password = await hashPassword(TEST_CREDENTIALS.participant3.password);

  // Admin user
  const admin = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.admin.email,
      name: TEST_CREDENTIALS.admin.name,
      password: adminPassword,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    },
  });

  /**
   * Participant 1 (Budi) - will have:
   * - IN_PROGRESS session on Exam 1 (resume flow)
   * - FINISHED session on Exam 2 (retake disabled error)
   * - 2/2 attempts exhausted on Exam 3 (max attempts error)
   * - PAID transaction for Exam 2 (paid exam access)
   * - PAID transaction for Exam 3 (paid exam access)
   */
  const participant1 = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.participant1.email,
      name: TEST_CREDENTIALS.participant1.name,
      password: participant1Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  /**
   * Participant 2 (Siti) - will have:
   * - FINISHED session on Exam 1 (can retake - "Ulangi Ujian" button)
   * - FINISHED session on Exam 2 (view results)
   * - TIMEOUT session on Exam 3
   * - PAID transaction for Exam 2
   * - PENDING transaction for Exam 3 (waiting payment)
   */
  const participant2 = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.participant2.email,
      name: TEST_CREDENTIALS.participant2.name,
      password: participant2Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  /**
   * Participant 3 (Andi) - Fresh user with NO exam history
   * Perfect for testing first-time exam flow ("Mulai Ujian")
   * - NO transactions (will test purchase flow)
   */
  const participant3 = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.participant3.email,
      name: TEST_CREDENTIALS.participant3.name,
      password: participant3Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  log(`  ✓ Admin: ${admin.email} (ID: ${admin.id})`);
  log(`  ✓ Participant 1: ${participant1.email} (ID: ${participant1.id})`);
  log(`  ✓ Participant 2: ${participant2.email} (ID: ${participant2.id})`);
  log(`  ✓ Participant 3: ${participant3.email} (ID: ${participant3.id}) [FRESH]`);

  return { admin, participant1, participant2, participant3 };
}

// ============================================================================
// SEED: QUESTION BANK (25 Questions)
// ============================================================================

async function seedQuestions() {
  logSection('SEEDING QUESTION BANK');

  // -------------------------------------------------------------------------
  // TIU Questions (10) - Tes Intelegensia Umum
  // Categories: Verbal, Numerik, Logika, Spasial
  // -------------------------------------------------------------------------
  const tiuQuestions = [
    // Verbal Analogy
    {
      content: 'KUCING : MEONG = ANJING : ...',
      options: { A: 'Menggonggong', B: 'Guk-guk', C: 'Kukuruyuk', D: 'Meringkik', E: 'Mengembik' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'PANAS : DINGIN = TERANG : ...',
      options: { A: 'Siang', B: 'Malam', C: 'Gelap', D: 'Lampu', E: 'Cahaya' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    // Antonim/Sinonim
    {
      content: 'Antonim dari kata "SEMENTARA" adalah...',
      options: { A: 'Sebentar', B: 'Permanen', C: 'Sesaat', D: 'Temporer', E: 'Singkat' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Sinonim dari kata "KOMPREHENSIF" adalah...',
      options: { A: 'Singkat', B: 'Parsial', C: 'Menyeluruh', D: 'Terbatas', E: 'Khusus' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    // Numerik
    {
      content: 'Jika 3x + 5 = 20, maka nilai x adalah...',
      options: { A: '3', B: '4', C: '5', D: '6', E: '7' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Deret angka: 2, 6, 12, 20, 30, ... Bilangan selanjutnya adalah...',
      options: { A: '40', B: '42', C: '44', D: '46', E: '48' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Hasil dari 15% × 240 adalah...',
      options: { A: '24', B: '30', C: '36', D: '40', E: '48' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    // Logika
    {
      content: 'Jika semua A adalah B, dan semua B adalah C, maka...',
      options: {
        A: 'Semua A adalah C',
        B: 'Semua C adalah A',
        C: 'Beberapa A bukan C',
        D: 'Tidak ada hubungan A dan C',
        E: 'Semua C adalah B',
      },
      correctAnswer: 'A',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Semua bunga memerlukan air. Mawar adalah bunga. Maka...',
      options: {
        A: 'Mawar tidak memerlukan air',
        B: 'Mawar memerlukan air',
        C: 'Tidak semua bunga mawar',
        D: 'Air adalah bunga',
        E: 'Bunga tidak memerlukan mawar',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Andi lebih tinggi dari Budi. Cici lebih pendek dari Budi. Maka...',
      options: {
        A: 'Cici paling tinggi',
        B: 'Budi paling tinggi',
        C: 'Andi paling tinggi',
        D: 'Cici lebih tinggi dari Andi',
        E: 'Budi dan Cici sama tinggi',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
  ];

  // -------------------------------------------------------------------------
  // TWK Questions (8) - Tes Wawasan Kebangsaan
  // Categories: Pancasila, UUD 1945, Sejarah, Bhinneka Tunggal Ika
  // -------------------------------------------------------------------------
  const twkQuestions = [
    // Pancasila
    {
      content: 'Pancasila ditetapkan sebagai dasar negara pada tanggal...',
      options: {
        A: '17 Agustus 1945',
        B: '18 Agustus 1945',
        C: '1 Juni 1945',
        D: '22 Juni 1945',
        E: '29 Mei 1945',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Sila pertama Pancasila berbunyi...',
      options: {
        A: 'Kemanusiaan yang adil dan beradab',
        B: 'Persatuan Indonesia',
        C: 'Ketuhanan Yang Maha Esa',
        D: 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan',
        E: 'Keadilan sosial bagi seluruh rakyat Indonesia',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Lambang negara Indonesia adalah...',
      options: {
        A: 'Elang Jawa',
        B: 'Garuda Pancasila',
        C: 'Burung Cendrawasih',
        D: 'Rajawali',
        E: 'Burung Merak',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    // UUD 1945
    {
      content: 'UUD 1945 telah diamandemen sebanyak...',
      options: {
        A: '2 kali',
        B: '3 kali',
        C: '4 kali',
        D: '5 kali',
        E: '6 kali',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Menurut UUD 1945, kedaulatan berada di tangan...',
      options: {
        A: 'Presiden',
        B: 'MPR',
        C: 'DPR',
        D: 'Rakyat',
        E: 'Pemerintah',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    // Sejarah
    {
      content: 'Proklamasi kemerdekaan Indonesia dibacakan oleh...',
      options: {
        A: 'Mohammad Hatta',
        B: 'Soekarno',
        C: 'Ahmad Soebardjo',
        D: 'Fatmawati',
        E: 'Soekarno dan Mohammad Hatta',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Sumpah Pemuda dideklarasikan pada tanggal...',
      options: {
        A: '28 Oktober 1928',
        B: '17 Agustus 1945',
        C: '20 Mei 1908',
        D: '1 Juni 1945',
        E: '10 November 1945',
      },
      correctAnswer: 'A',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    // NKRI
    {
      content: 'Semboyan "Bhinneka Tunggal Ika" berasal dari kitab...',
      options: {
        A: 'Negarakertagama',
        B: 'Sutasoma',
        C: 'Pararaton',
        D: 'Arjunawiwaha',
        E: 'Kakawin Ramayana',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
  ];

  // -------------------------------------------------------------------------
  // TKP Questions (7) - Tes Karakteristik Pribadi
  // Categories: Pelayanan Publik, Sosial Budaya, Profesionalisme, Integritas
  // -------------------------------------------------------------------------
  const tkpQuestions = [
    // Pelayanan Publik
    {
      content: 'Ketika ada masyarakat yang komplain tentang pelayanan, sikap Anda...',
      options: {
        A: 'Mengabaikan karena bukan tanggung jawab langsung',
        B: 'Menyalahkan rekan kerja yang bertugas',
        C: 'Mendengarkan dengan sabar dan mencari solusi',
        D: 'Meminta masyarakat untuk datang lain waktu',
        E: 'Marah karena merasa tidak dihargai',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    // Kerja Tim
    {
      content: 'Ketika rekan kerja meminta bantuan saat Anda sedang sibuk, Anda akan...',
      options: {
        A: 'Menolak dengan tegas',
        B: 'Membantu meski pekerjaan sendiri tertunda',
        C: 'Menjelaskan situasi dan menawarkan bantuan setelah selesai',
        D: 'Mengabaikan permintaan tersebut',
        E: 'Menyuruh dia meminta tolong orang lain',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    // Profesionalisme
    {
      content: 'Ketika menghadapi deadline yang sangat ketat, Anda akan...',
      options: {
        A: 'Panik dan mengeluh kepada rekan kerja',
        B: 'Meminta perpanjangan waktu',
        C: 'Membuat prioritas dan bekerja sistematis',
        D: 'Mengerjakan asal jadi yang penting selesai',
        E: 'Menyerahkan pekerjaan kepada orang lain',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    // Integritas
    {
      content: 'Jika Anda menemukan kesalahan pada pekerjaan atasan, Anda akan...',
      options: {
        A: 'Diam saja karena takut',
        B: 'Memberitahu teman-teman tentang kesalahan tersebut',
        C: 'Menyampaikan dengan sopan secara pribadi',
        D: 'Mengabaikan karena bukan urusan Anda',
        E: 'Langsung memperbaiki tanpa memberitahu',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    // Manajemen Diri
    {
      content: 'Sikap Anda ketika mendapat kritik dari atasan adalah...',
      options: {
        A: 'Marah dan membela diri',
        B: 'Diam dan tidak merespons',
        C: 'Menerima dengan lapang dada dan introspeksi',
        D: 'Mencari alasan pembenaran',
        E: 'Membalas dengan kritik terhadap atasan',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    // Komunikasi
    {
      content: 'Ketika terjadi konflik antar rekan kerja, Anda akan...',
      options: {
        A: 'Memihak salah satu pihak',
        B: 'Tidak peduli dan fokus pada pekerjaan sendiri',
        C: 'Berusaha menjadi mediator yang netral',
        D: 'Melaporkan ke atasan tanpa mencoba menyelesaikan',
        E: 'Memanas-manasi situasi',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    // Adaptasi
    {
      content: 'Ketika ditempatkan di posisi baru yang tidak sesuai keahlian, Anda...',
      options: {
        A: 'Menolak penempatan tersebut',
        B: 'Menerima dengan enggan dan bekerja seadanya',
        C: 'Menerima dan berusaha belajar hal-hal baru',
        D: 'Langsung mengajukan pindah',
        E: 'Mengeluh kepada semua orang',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
  ];

  // Create all questions
  const allQuestions = [...tiuQuestions, ...twkQuestions, ...tkpQuestions];
  const createdQuestions: Array<{ id: number; content: string; questionType: QuestionType }> = [];

  for (const q of allQuestions) {
    const question = await prisma.questionBank.create({
      data: {
        content: q.content,
        options: q.options,
        correctAnswer: q.correctAnswer,
        questionType: q.questionType,
        defaultScore: q.defaultScore,
      },
    });

    createdQuestions.push({
      id: question.id,
      content: question.content.substring(0, 40) + '...',
      questionType: question.questionType,
    });
  }

  log(`  ✓ Created ${createdQuestions.length} questions`);
  log(`    - TIU: ${tiuQuestions.length} soal (Tes Intelegensia Umum)`);
  log(`    - TWK: ${twkQuestions.length} soal (Tes Wawasan Kebangsaan)`);
  log(`    - TKP: ${tkpQuestions.length} soal (Tes Karakteristik Pribadi)`);

  return createdQuestions;
}

// ============================================================================
// SEED: EXAMS (with price field for Midtrans)
// ============================================================================

async function seedExams(adminId: number) {
  logSection('SEEDING EXAMS');

  // Get all questions for assignment
  const allQuestions = await prisma.questionBank.findMany({
    orderBy: [{ questionType: 'asc' }, { id: 'asc' }],
  });

  // -------------------------------------------------------------------------
  // Exam 1: FREE exam with RETAKES ALLOWED (max 3 attempts)
  // Test scenarios: Resume, Retake button, Multiple attempts history
  // -------------------------------------------------------------------------
  const exam1 = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Paket Gratis',
      description:
        'Tryout CPNS GRATIS untuk latihan awal. Durasi 90 menit dengan 25 soal pilihan ganda. Dapat diulang hingga 3 kali untuk latihan optimal.',
      durationMinutes: 90,
      passingScore: 65,
      allowRetake: true,
      maxAttempts: 3,
      price: null, // FREE EXAM
      startTime: relativeDate({ days: -30 }),
      endTime: relativeDate({ days: 60 }),
      createdBy: adminId,
    },
  });

  // -------------------------------------------------------------------------
  // Exam 2: PAID exam with NO RETAKES (one-shot simulation) - Rp 35.000
  // Test scenarios: Retake disabled error, final exam simulation, payment required
  // -------------------------------------------------------------------------
  const exam2 = await prisma.exam.create({
    data: {
      title: 'Simulasi CPNS 2025 - Final (Premium)',
      description:
        'Simulasi ujian CPNS final PREMIUM. TIDAK DAPAT DIULANG setelah selesai. Kondisi menyerupai ujian sesungguhnya dengan pembahasan lengkap.',
      durationMinutes: 60,
      passingScore: 75,
      allowRetake: false,
      maxAttempts: 1,
      price: 35000, // Rp 35.000
      startTime: relativeDate({ days: -15 }),
      endTime: relativeDate({ days: 45 }),
      createdBy: adminId,
    },
  });

  // -------------------------------------------------------------------------
  // Exam 3: PAID exam with LIMITED RETAKES (max 2 attempts) - Rp 25.000
  // Test scenarios: Max attempts reached error, attempt history, payment required
  // -------------------------------------------------------------------------
  const exam3 = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Paket Silver',
      description:
        'Tryout CPNS SILVER dengan maksimal 2 percobaan. Termasuk analisis hasil dan tips peningkatan skor. Gunakan kesempatan dengan bijak!',
      durationMinutes: 45,
      passingScore: 60,
      allowRetake: true,
      maxAttempts: 2,
      price: 25000, // Rp 25.000
      startTime: relativeDate({ days: -7 }),
      endTime: relativeDate({ days: 30 }),
      createdBy: adminId,
    },
  });

  // Assign ALL questions to ALL exams
  for (const exam of [exam1, exam2, exam3]) {
    for (let i = 0; i < allQuestions.length; i++) {
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: allQuestions[i].id,
          orderNumber: i + 1,
        },
      });
    }
  }

  log(`  ✓ Exam 1: "${exam1.title}" (ID: ${exam1.id})`);
  log(`    - Duration: ${exam1.durationMinutes} minutes`);
  log(`    - Passing: ${exam1.passingScore} points`);
  log(`    - Retakes: ✅ Allowed, Max: ${exam1.maxAttempts} attempts`);
  log(`    - Price: 🆓 FREE`);

  log(`  ✓ Exam 2: "${exam2.title}" (ID: ${exam2.id})`);
  log(`    - Duration: ${exam2.durationMinutes} minutes`);
  log(`    - Passing: ${exam2.passingScore} points`);
  log(`    - Retakes: ❌ Disabled (one-shot)`);
  log(`    - Price: 💰 Rp ${exam2.price?.toLocaleString('id-ID')}`);

  log(`  ✓ Exam 3: "${exam3.title}" (ID: ${exam3.id})`);
  log(`    - Duration: ${exam3.durationMinutes} minutes`);
  log(`    - Passing: ${exam3.passingScore} points`);
  log(`    - Retakes: ✅ Allowed, Max: ${exam3.maxAttempts} attempts`);
  log(`    - Price: 💰 Rp ${exam3.price?.toLocaleString('id-ID')}`);

  log(`  ✓ Assigned ${allQuestions.length} questions to each exam`);

  return { exam1, exam2, exam3 };
}

// ============================================================================
// NEW: SEED TRANSACTIONS (Midtrans Payment Records)
// ============================================================================

async function seedTransactions(
  participant1Id: number,
  participant2Id: number,
  participant3Id: number,
  exam1Id: number,
  exam2Id: number,
  exam3Id: number,
  exam2Price: number,
  exam3Price: number
) {
  logSection('SEEDING TRANSACTIONS (Midtrans)');

  const transactions = [];

  // =========================================================================
  // Participant 1 (Budi) - Has PAID transactions for both paid exams
  // This allows Budi to access Exam 2 and Exam 3
  // =========================================================================

  // Transaction 1: Budi paid for Exam 2 (Premium Final) - 3 days ago
  const trx1 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX'),
      userId: participant1Id,
      examId: exam2Id,
      amount: exam2Price,
      status: TransactionStatus.PAID,
      paymentType: 'bank_transfer',
      paidAt: relativeDate({ days: -3 }),
      metadata: {
        bank: 'bca',
        va_number: '12345678901234',
        transaction_time: relativeDate({ days: -3 }).toISOString(),
        settlement_time: relativeDate({ days: -3, minutes: 5 }).toISOString(),
      },
    },
  });
  transactions.push(trx1);
  log(`  ✓ Budi → Exam 2: PAID (Rp ${exam2Price.toLocaleString('id-ID')}) via Bank Transfer`);

  // Transaction 2: Budi paid for Exam 3 (Silver) - 5 days ago
  const trx2 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX'),
      userId: participant1Id,
      examId: exam3Id,
      amount: exam3Price,
      status: TransactionStatus.PAID,
      paymentType: 'gopay',
      paidAt: relativeDate({ days: -5 }),
      metadata: {
        transaction_time: relativeDate({ days: -5 }).toISOString(),
        settlement_time: relativeDate({ days: -5, minutes: 2 }).toISOString(),
      },
    },
  });
  transactions.push(trx2);
  log(`  ✓ Budi → Exam 3: PAID (Rp ${exam3Price.toLocaleString('id-ID')}) via GoPay`);

  // =========================================================================
  // Participant 2 (Siti) - Mixed transaction statuses for testing
  // =========================================================================

  // Transaction 3: Siti paid for Exam 2 - 2 days ago
  const trx3 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX'),
      userId: participant2Id,
      examId: exam2Id,
      amount: exam2Price,
      status: TransactionStatus.PAID,
      paymentType: 'qris',
      paidAt: relativeDate({ days: -2 }),
      metadata: {
        issuer: 'DANA',
        transaction_time: relativeDate({ days: -2 }).toISOString(),
      },
    },
  });
  transactions.push(trx3);
  log(`  ✓ Siti → Exam 2: PAID (Rp ${exam2Price.toLocaleString('id-ID')}) via QRIS`);

  // Transaction 4: Siti has PENDING transaction for Exam 3 (waiting payment)
  const trx4 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX'),
      userId: participant2Id,
      examId: exam3Id,
      amount: exam3Price,
      status: TransactionStatus.PENDING,
      snapToken: 'sample-snap-token-' + Date.now(),
      snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/sample-token',
      expiredAt: relativeDate({ hours: 24 }), // Expires in 24 hours
      metadata: {
        created_via: 'seed_script',
        note: 'Waiting for payment - demo pending transaction',
      },
    },
  });
  transactions.push(trx4);
  log(`  ✓ Siti → Exam 3: PENDING (Rp ${exam3Price.toLocaleString('id-ID')}) - Awaiting Payment`);

  // Transaction 5: Siti has an EXPIRED transaction (for testing expired flow)
  const trx5 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX-EXP'),
      userId: participant2Id,
      examId: exam3Id,
      amount: exam3Price,
      status: TransactionStatus.EXPIRED,
      expiredAt: relativeDate({ days: -1 }), // Expired yesterday
      metadata: {
        reason: 'Payment window expired',
        original_expiry: relativeDate({ days: -1 }).toISOString(),
      },
    },
  });
  transactions.push(trx5);
  log(`  ✓ Siti → Exam 3: EXPIRED (previous attempt)`);

  // =========================================================================
  // Participant 3 (Andi) - NO transactions (fresh user for purchase flow testing)
  // =========================================================================
  log(`  ✓ Andi: No transactions (test fresh purchase flow)`);

  // =========================================================================
  // Additional test transactions
  // =========================================================================

  // Transaction 6: A CANCELLED transaction for demonstration
  const trx6 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX-CAN'),
      userId: participant3Id,
      examId: exam2Id,
      amount: exam2Price,
      status: TransactionStatus.CANCELLED,
      metadata: {
        reason: 'Cancelled by user before payment',
        cancelled_at: relativeDate({ days: -2 }).toISOString(),
      },
    },
  });
  transactions.push(trx6);
  log(`  ✓ Andi → Exam 2: CANCELLED (user cancelled)`);

  log(`\n  📊 Transaction Summary:`);
  log(`    - PAID: 3 transactions`);
  log(`    - PENDING: 1 transaction`);
  log(`    - EXPIRED: 1 transaction`);
  log(`    - CANCELLED: 1 transaction`);
  log(`    - Total: ${transactions.length} transactions`);

  return transactions;
}

// ============================================================================
// SEED: EXAM SESSIONS (UserExam) - ALL SCENARIOS
// ============================================================================

async function seedExamSessions(
  participant1Id: number,
  participant2Id: number,
  exam1Id: number,
  exam2Id: number,
  exam3Id: number
) {
  logSection('SEEDING EXAM SESSIONS');

  // Get exam questions for creating answers
  const exam1Questions = await prisma.examQuestion.findMany({
    where: { examId: exam1Id },
    orderBy: { orderNumber: 'asc' },
    include: { question: true },
  });

  const exam2Questions = await prisma.examQuestion.findMany({
    where: { examId: exam2Id },
    orderBy: { orderNumber: 'asc' },
    include: { question: true },
  });

  const exam3Questions = await prisma.examQuestion.findMany({
    where: { examId: exam3Id },
    orderBy: { orderNumber: 'asc' },
    include: { question: true },
  });

  const sessions: Record<string, { id: number; status: ExamStatus }> = {};

  // =========================================================================
  // SCENARIO 1: IN_PROGRESS Session (Resume Flow)
  // Participant 1 on Exam 1 - Active session with partial answers
  // =========================================================================
  log('  📝 Scenario 1: IN_PROGRESS session (Resume Flow)');

  const session1 = await prisma.userExam.create({
    data: {
      userId: participant1Id,
      examId: exam1Id,
      attemptNumber: 1,
      startedAt: relativeDate({ minutes: -30 }), // Started 30 minutes ago
      status: ExamStatus.IN_PROGRESS,
    },
  });

  // Answer first 8 questions (partial progress ~32%)
  for (let i = 0; i < 8; i++) {
    const eq = exam1Questions[i];
    await prisma.answer.create({
      data: {
        userExamId: session1.id,
        examQuestionId: eq.id,
        selectedOption: eq.question.correctAnswer,
        isCorrect: true,
      },
    });
  }

  sessions.inProgress = { id: session1.id, status: session1.status };
  log(`    ✓ Session ID: ${session1.id} - Participant 1 on Exam 1`);
  log(`      8/${exam1Questions.length} questions answered, 60 min remaining`);

  // =========================================================================
  // SCENARIO 2: FINISHED Session with Retakes Allowed (Retake Flow)
  // Participant 2 on Exam 1 - Completed, can click "Ulangi Ujian"
  // =========================================================================
  log('  📝 Scenario 2: FINISHED session (Can Retake)');

  const session2 = await prisma.userExam.create({
    data: {
      userId: participant2Id,
      examId: exam1Id,
      attemptNumber: 1,
      startedAt: relativeDate({ hours: -3, minutes: -75 }),
      submittedAt: relativeDate({ hours: -3 }),
      status: ExamStatus.FINISHED,
      totalScore: 65, // Just passing
    },
  });

  // Create answers (13/25 correct = 52% accuracy, 65 points)
  let score2 = 0;
  for (let i = 0; i < exam1Questions.length; i++) {
    const eq = exam1Questions[i];
    const isCorrect = i < 13;
    await prisma.answer.create({
      data: {
        userExamId: session2.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
    if (isCorrect) score2 += eq.question.defaultScore;
  }

  await prisma.userExam.update({
    where: { id: session2.id },
    data: { totalScore: score2 },
  });

  sessions.retakeAllowed = { id: session2.id, status: session2.status };
  log(`    ✓ Session ID: ${session2.id} - Participant 2 on Exam 1`);
  log(`      Score: ${score2} (13/25 correct, can retake)`);

  // =========================================================================
  // SCENARIO 3: FINISHED Session with Retakes DISABLED (Error Flow)
  // Participant 1 on Exam 2 - Completed, will get error if tries to retake
  // =========================================================================
  log('  📝 Scenario 3: FINISHED session (Retakes DISABLED)');

  const session3 = await prisma.userExam.create({
    data: {
      userId: participant1Id,
      examId: exam2Id,
      attemptNumber: 1,
      startedAt: relativeDate({ hours: -5, minutes: -55 }),
      submittedAt: relativeDate({ hours: -5 }),
      status: ExamStatus.FINISHED,
      totalScore: 95, // Good score
    },
  });

  let score3 = 0;
  for (let i = 0; i < exam2Questions.length; i++) {
    const eq = exam2Questions[i];
    const isCorrect = i < 19; // 19/25 correct
    await prisma.answer.create({
      data: {
        userExamId: session3.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
    if (isCorrect) score3 += eq.question.defaultScore;
  }

  await prisma.userExam.update({
    where: { id: session3.id },
    data: { totalScore: score3 },
  });

  sessions.retakeDisabled = { id: session3.id, status: session3.status };
  log(`    ✓ Session ID: ${session3.id} - Participant 1 on Exam 2`);
  log(`      Score: ${score3} (19/25 correct, NO retake allowed)`);

  // =========================================================================
  // SCENARIO 4: FINISHED Session for viewing results
  // Participant 2 on Exam 2 - Standard completed exam
  // =========================================================================
  log('  📝 Scenario 4: FINISHED session (View Results)');

  const session4 = await prisma.userExam.create({
    data: {
      userId: participant2Id,
      examId: exam2Id,
      attemptNumber: 1,
      startedAt: relativeDate({ hours: -1, minutes: -45 }),
      submittedAt: relativeDate({ hours: -1 }),
      status: ExamStatus.FINISHED,
      totalScore: 70, // Below passing
    },
  });

  let score4 = 0;
  for (let i = 0; i < exam2Questions.length; i++) {
    const eq = exam2Questions[i];
    const isCorrect = i < 14 || i === 20; // 15/25 correct
    await prisma.answer.create({
      data: {
        userExamId: session4.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
    if (isCorrect) score4 += eq.question.defaultScore;
  }

  await prisma.userExam.update({
    where: { id: session4.id },
    data: { totalScore: score4 },
  });

  sessions.viewResults = { id: session4.id, status: session4.status };
  log(`    ✓ Session ID: ${session4.id} - Participant 2 on Exam 2`);
  log(`      Score: ${score4} (below passing, view results)`);

  // =========================================================================
  // SCENARIO 5: MAX ATTEMPTS EXHAUSTED (Error Flow)
  // Participant 1 on Exam 3 - Has 2/2 attempts completed
  // =========================================================================
  log('  📝 Scenario 5: MAX ATTEMPTS exhausted (2/2)');

  for (let attempt = 1; attempt <= 2; attempt++) {
    const attemptSession = await prisma.userExam.create({
      data: {
        userId: participant1Id,
        examId: exam3Id,
        attemptNumber: attempt,
        startedAt: relativeDate({ days: -attempt, minutes: -40 }),
        submittedAt: relativeDate({ days: -attempt }),
        status: ExamStatus.FINISHED,
        totalScore: 50 + attempt * 15, // Improving: 65, 80
      },
    });

    // Create answers with improvement each attempt
    for (let i = 0; i < exam3Questions.length; i++) {
      const eq = exam3Questions[i];
      const isCorrect = i < (11 + attempt * 3); // 14, 17 correct
      await prisma.answer.create({
        data: {
          userExamId: attemptSession.id,
          examQuestionId: eq.id,
          selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
          isCorrect,
        },
      });
    }

    log(`    ✓ Attempt #${attempt} - Session ID: ${attemptSession.id}, Score: ${50 + attempt * 15}`);

    if (attempt === 2) {
      sessions.maxAttempts = { id: attemptSession.id, status: attemptSession.status };
    }
  }
  log(`      Participant 1 has exhausted 2/2 attempts on Exam 3`);

  // =========================================================================
  // SCENARIO 6: TIMEOUT Session (Edge Case)
  // Participant 2 on Exam 3 - Auto-submitted due to timeout
  // =========================================================================
  log('  📝 Scenario 6: TIMEOUT session (edge case)');

  const session6 = await prisma.userExam.create({
    data: {
      userId: participant2Id,
      examId: exam3Id,
      attemptNumber: 1,
      startedAt: relativeDate({ hours: -4, minutes: -45 }),
      submittedAt: relativeDate({ hours: -4 }), // Exactly at duration limit
      status: ExamStatus.TIMEOUT,
      totalScore: 40, // Low score due to incomplete
    },
  });

  // Only partial answers (simulating timeout before completion)
  let score6 = 0;
  for (let i = 0; i < 10; i++) {
    const eq = exam3Questions[i];
    const isCorrect = i < 8;
    await prisma.answer.create({
      data: {
        userExamId: session6.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
    if (isCorrect) score6 += eq.question.defaultScore;
  }

  await prisma.userExam.update({
    where: { id: session6.id },
    data: { totalScore: score6 },
  });

  sessions.timeout = { id: session6.id, status: session6.status };
  log(`    ✓ Session ID: ${session6.id} - Participant 2 on Exam 3`);
  log(`      Status: TIMEOUT, Score: ${score6} (10/25 answered, ran out of time)`);

  return sessions;
}

// ============================================================================
// SEED: PROCTORING EVENTS
// ============================================================================

async function seedProctoringEvents(sessions: Record<string, { id: number; status: ExamStatus }>) {
  logSection('SEEDING PROCTORING EVENTS');

  // -------------------------------------------------------------------------
  // IN_PROGRESS session: Recent events for live demo
  // Shows active proctoring with some violations
  // -------------------------------------------------------------------------
  if (sessions.inProgress) {
    const events = [
      // Initial face detection (good)
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -28 }),
        metadata: { confidence: 0.98, facesDetected: 1, message: 'Single face detected' },
      },
      // Continuous monitoring (good)
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -25 }),
        metadata: { confidence: 0.96, facesDetected: 1, message: 'Normal monitoring' },
      },
      // User looked away briefly (warning)
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: relativeDate({ minutes: -20 }),
        metadata: { confidence: 0.89, direction: 'left', duration: 3.2, message: 'User looked left' },
      },
      // Back to normal
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -18 }),
        metadata: { confidence: 0.97, facesDetected: 1 },
      },
      // Multiple faces detected! (serious violation)
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.MULTIPLE_FACES,
        severity: 'HIGH',
        timestamp: relativeDate({ minutes: -10 }),
        metadata: { confidence: 0.94, facesDetected: 2, message: 'WARNING: Multiple faces detected!' },
      },
      // Recovered to single face
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -8 }),
        metadata: { confidence: 0.95, facesDetected: 1, message: 'Returned to normal' },
      },
      // Recent monitoring (for live demo)
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -2 }),
        metadata: { confidence: 0.99, facesDetected: 1, message: 'Current status OK' },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ In Progress session: ${events.length} events (including HIGH violation)`);
  }

  // -------------------------------------------------------------------------
  // View Results session: More violations for report demonstration
  // -------------------------------------------------------------------------
  if (sessions.viewResults) {
    const sessionStart = relativeDate({ hours: -1, minutes: -45 });
    const events = [
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(sessionStart.getTime() + 1 * 60 * 1000),
        metadata: { confidence: 0.97, facesDetected: 1 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.NO_FACE_DETECTED,
        severity: 'HIGH',
        timestamp: new Date(sessionStart.getTime() + 10 * 60 * 1000),
        metadata: { confidence: 0.12, message: 'User left view' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.MULTIPLE_FACES,
        severity: 'HIGH',
        timestamp: new Date(sessionStart.getTime() + 20 * 60 * 1000),
        metadata: { confidence: 0.88, facesDetected: 3, message: 'Multiple people detected' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: new Date(sessionStart.getTime() + 30 * 60 * 1000),
        metadata: { confidence: 0.82, direction: 'right', duration: 5.1 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: new Date(sessionStart.getTime() + 35 * 60 * 1000),
        metadata: { confidence: 0.78, direction: 'down', duration: 4.5, message: 'Looking at phone?' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(sessionStart.getTime() + 40 * 60 * 1000),
        metadata: { confidence: 0.93, facesDetected: 1 },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ View Results session: ${events.length} events`);
    log(`    - 2 HIGH severity, 2 MEDIUM severity violations`);
  }

  // -------------------------------------------------------------------------
  // Retake Allowed session: Clean session with minimal violations
  // -------------------------------------------------------------------------
  if (sessions.retakeAllowed) {
    const events = [
      {
        userExamId: sessions.retakeAllowed.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ hours: -3, minutes: -70 }),
        metadata: { confidence: 0.99, facesDetected: 1, message: 'Session started' },
      },
      {
        userExamId: sessions.retakeAllowed.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ hours: -3, minutes: -50 }),
        metadata: { confidence: 0.97, facesDetected: 1 },
      },
      {
        userExamId: sessions.retakeAllowed.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ hours: -3, minutes: -30 }),
        metadata: { confidence: 0.96, facesDetected: 1 },
      },
      {
        userExamId: sessions.retakeAllowed.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ hours: -3, minutes: -10 }),
        metadata: { confidence: 0.98, facesDetected: 1, message: 'Clean session completed' },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ Retake Allowed session: ${events.length} events (clean session)`);
  }

  // -------------------------------------------------------------------------
  // Timeout session: Events stopping abruptly
  // -------------------------------------------------------------------------
  if (sessions.timeout) {
    const events = [
      {
        userExamId: sessions.timeout.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ hours: -4, minutes: -40 }),
        metadata: { confidence: 0.95, facesDetected: 1 },
      },
      {
        userExamId: sessions.timeout.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: relativeDate({ hours: -4, minutes: -25 }),
        metadata: { confidence: 0.75, direction: 'right' },
      },
      {
        userExamId: sessions.timeout.id,
        eventType: ProctoringEventType.NO_FACE_DETECTED,
        severity: 'HIGH',
        timestamp: relativeDate({ hours: -4, minutes: -5 }),
        metadata: { confidence: 0.08, message: 'User absent near timeout' },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ Timeout session: ${events.length} events (incomplete)`);
  }

  log('  ✓ Proctoring events seeded for YOLO demo');
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🎓 TRYOUT CPNS + PROCTORING + MIDTRANS - DATABASE SEEDING');
  console.log('   Thesis Project: Universitas Atma Jaya Yogyakarta');
  console.log('═'.repeat(70));

  try {
    // Step 0: Clean database
    await cleanDatabase();

    // Step 1: Users
    const { admin, participant1, participant2, participant3 } = await seedUsers();

    // Step 2: Questions (25 total)
    await seedQuestions();

    // Step 3: Exams (3 configurations - with price)
    const { exam1, exam2, exam3 } = await seedExams(admin.id);

    // Step 4: Transactions (Midtrans payment records) - NEW!
    await seedTransactions(
      participant1.id,
      participant2.id,
      participant3.id,
      exam1.id,
      exam2.id,
      exam3.id,
      exam2.price!,
      exam3.price!
    );

    // Step 5: Exam Sessions (All scenarios)
    const sessions = await seedExamSessions(
      participant1.id,
      participant2.id,
      exam1.id,
      exam2.id,
      exam3.id
    );

    // Step 6: Proctoring Events
    await seedProctoringEvents(sessions);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n' + '═'.repeat(70));
    console.log('✅ SEEDING COMPLETE!');
    console.log('═'.repeat(70));

    console.log('\n📋 TEST CREDENTIALS:');
    console.log('─'.repeat(60));
    console.log(`ADMIN:         ${TEST_CREDENTIALS.admin.email}`);
    console.log(`               Password: ${TEST_CREDENTIALS.admin.password}`);
    console.log('');
    console.log(`PARTICIPANT 1: ${TEST_CREDENTIALS.participant1.email} (Budi)`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant1.password}`);
    console.log(`               ├─ Exam 1: IN_PROGRESS (resume flow) [FREE]`);
    console.log(`               ├─ Exam 2: FINISHED (retake disabled) [PAID ✓]`);
    console.log(`               └─ Exam 3: 2/2 attempts (max exhausted) [PAID ✓]`);
    console.log('');
    console.log(`PARTICIPANT 2: ${TEST_CREDENTIALS.participant2.email} (Siti)`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant2.password}`);
    console.log(`               ├─ Exam 1: FINISHED (can retake) [FREE]`);
    console.log(`               ├─ Exam 2: FINISHED (view results) [PAID ✓]`);
    console.log(`               └─ Exam 3: TIMEOUT (edge case) [PENDING payment]`);
    console.log('');
    console.log(`PARTICIPANT 3: ${TEST_CREDENTIALS.participant3.email} (Andi)`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant3.password}`);
    console.log(`               └─ NO EXAMS (fresh start + purchase flow)`);
    console.log('─'.repeat(60));

    console.log('\n📊 DATA SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`Users:              4 (1 admin, 3 participants)`);
    console.log(`Questions:          25 (10 TIU, 8 TWK, 7 TKP)`);
    console.log(`Exams:              3`);
    console.log(`  ├─ Exam 1:        Retakes ✅ (max 3) - 🆓 FREE`);
    console.log(`  ├─ Exam 2:        Retakes ❌ (one-shot) - 💰 Rp 35.000`);
    console.log(`  └─ Exam 3:        Retakes ✅ (max 2) - 💰 Rp 25.000`);
    console.log(`Transactions:       6`);
    console.log(`  ├─ PAID:          3 transactions`);
    console.log(`  ├─ PENDING:       1 transaction`);
    console.log(`  ├─ EXPIRED:       1 transaction`);
    console.log(`  └─ CANCELLED:     1 transaction`);
    console.log(`Exam Sessions:      7`);
    console.log(`  ├─ IN_PROGRESS:   1 (resume flow)`);
    console.log(`  ├─ FINISHED:      5 (various scenarios)`);
    console.log(`  └─ TIMEOUT:       1 (edge case)`);
    console.log(`Proctoring Events:  24+ events with violations`);
    console.log('─'.repeat(60));

    console.log('\n🧪 TESTABLE SCENARIOS FOR THESIS DEFENSE:');
    console.log('─'.repeat(60));
    console.log('EXAM FLOW:');
    console.log('  1. First Start     → Login as Andi, start Exam 1 (free)');
    console.log('  2. Resume Exam     → Login as Budi, continue Exam 1');
    console.log('  3. Retake Exam     → Login as Siti, retake Exam 1');
    console.log('  4. Retake Disabled → Login as Budi, try Exam 2 again');
    console.log('  5. Max Attempts    → Login as Budi, try Exam 3 again');
    console.log('  6. View Results    → Login as Siti, view Exam 2 results');
    console.log('');
    console.log('PAYMENT FLOW (MIDTRANS):');
    console.log('  7. Purchase Exam   → Login as Andi, buy Exam 2 or 3');
    console.log('  8. Pending Payment → Login as Siti, check Exam 3 status');
    console.log('  9. Access Granted  → Login as Budi, access paid exams');
    console.log(' 10. Payment History → View all transaction statuses');
    console.log('');
    console.log('PROCTORING:');
    console.log(' 11. Proctoring Demo → Active session shows YOLO events');
    console.log(' 12. Violation Report→ Session 4 has HIGH severity violations');
    console.log('─'.repeat(60));

    console.log('\n🔧 QUICK COMMANDS:');
    console.log('─'.repeat(60));
    console.log('Reset & Reseed:     npx prisma migrate reset');
    console.log('Seed Only:          npx ts-node prisma/seed.ts');
    console.log('View Database:      npx prisma studio');
    console.log('─'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();