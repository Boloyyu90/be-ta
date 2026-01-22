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
 * - Transaction records for Midtrans payment testing:
 *   - PAID transactions (access granted)
 *   - PENDING transactions (valid & expired for lazy cleanup test)
 *   - EXPIRED transactions (multiple for same user-exam)
 *   - CANCELLED transactions
 *
 * CHANGES IN v4.0.0:
 * - Unique constraint [userId, examId, status] REMOVED from Transaction model
 * - Added lazy cleanup test case (PENDING with expiredAt in past)
 * - Multiple EXPIRED/CANCELLED transactions per user-exam now allowed
 * - Enhanced test scenarios for payment flow demonstration
 *
 * USAGE:
 *   1. npx prisma migrate reset     (RECOMMENDED: clean + migrate + seed)
 *   2. npx ts-node prisma/seed.ts   (seed only - uses internal cleanup)
 *
 * IDEMPOTENT: Safe to run multiple times - cleans data before seeding
 *
 * @version 4.0.0 (Updated for lazy cleanup & constraint removal)
 * @date January 2026
 */

import {
  PrismaClient,
  UserRole,
  QuestionType,
  ExamStatus,
  ProctoringEventType,
  TransactionStatus,
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
 * Format: TRX-{timestamp}-{random8hex}
 */
function generateOrderId(prefix: string = 'TRX'): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
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
    { name: 'Transaction', fn: () => prisma.transaction.deleteMany() },
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
   * Participant 1 (Budi) - PAID USER with exam sessions
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
   * Participant 2 (Siti) - MIXED transaction statuses for testing
   * - FINISHED session on Exam 1 (can retake - "Ulangi Ujian" button)
   * - FINISHED session on Exam 2 (view results)
   * - TIMEOUT session on Exam 3
   * - PAID transaction for Exam 2
   * - PENDING transaction for Exam 3 (valid - can continue payment)
   * - PENDING EXPIRED transaction for Exam 3 (lazy cleanup test!)
   * - Multiple EXPIRED transactions for Exam 3 (constraint removal test!)
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
   * - CANCELLED transaction (user cancelled before payment)
   * - Ready for fresh purchase flow testing
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
// SEED TRANSACTIONS (Midtrans Payment Records)
// Updated for v4.0.0: Includes lazy cleanup test cases
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
  // Participant 2 (Siti) - Mixed transaction statuses for comprehensive testing
  // Now includes LAZY CLEANUP test case!
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

  // =========================================================================
  // 🆕 LAZY CLEANUP TEST CASE
  // Transaction 4: Siti has PENDING transaction that is ALREADY EXPIRED
  // This tests the lazy cleanup in checkExamAccess() and createTransaction()
  // When accessed, system should automatically mark this as EXPIRED
  // =========================================================================
  const trx4_lazy = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX-LAZY'),
      userId: participant2Id,
      examId: exam3Id,
      amount: exam3Price,
      status: TransactionStatus.PENDING, // Still PENDING in DB...
      snapToken: 'expired-snap-token-' + Date.now(),
      snapRedirectUrl: 'https://app.sandbox.midtrans.com/snap/v3/redirection/expired-token',
      expiredAt: relativeDate({ hours: -2 }), // ...but expiredAt is 2 hours AGO!
      metadata: {
        created_via: 'seed_script',
        note: '🧪 LAZY CLEANUP TEST: PENDING but expiredAt in past',
        purpose: 'Test that checkExamAccess() auto-expires this transaction',
      },
    },
  });
  transactions.push(trx4_lazy);
  log(`  ✓ Siti → Exam 3: PENDING (EXPIRED!) - 🧪 Lazy Cleanup Test`);
  log(`    ⚠️  expiredAt is 2 hours ago - will be auto-expired on access`);

  // =========================================================================
  // 🆕 MULTIPLE EXPIRED TEST (Constraint Removal Verification)
  // These transactions demonstrate that multiple EXPIRED for same user-exam
  // is now allowed (unique constraint was removed)
  // =========================================================================

  // Transaction 5: First EXPIRED transaction for Siti-Exam3
  const trx5 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX-EXP1'),
      userId: participant2Id,
      examId: exam3Id,
      amount: exam3Price,
      status: TransactionStatus.EXPIRED,
      expiredAt: relativeDate({ days: -3 }),
      metadata: {
        reason: 'Payment window expired (attempt 1)',
        expired_at: relativeDate({ days: -3 }).toISOString(),
      },
    },
  });
  transactions.push(trx5);
  log(`  ✓ Siti → Exam 3: EXPIRED #1 (3 days ago)`);

  // Transaction 6: Second EXPIRED transaction for Siti-Exam3
  // Previously this would FAIL due to unique constraint!
  const trx6 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX-EXP2'),
      userId: participant2Id,
      examId: exam3Id,
      amount: exam3Price,
      status: TransactionStatus.EXPIRED,
      expiredAt: relativeDate({ days: -1 }),
      metadata: {
        reason: 'Payment window expired (attempt 2)',
        expired_at: relativeDate({ days: -1 }).toISOString(),
        note: '🆕 This is now allowed after constraint removal!',
      },
    },
  });
  transactions.push(trx6);
  log(`  ✓ Siti → Exam 3: EXPIRED #2 (1 day ago) - 🆕 Multiple EXPIRED now allowed!`);

  // =========================================================================
  // Participant 3 (Andi) - Fresh user with only CANCELLED transaction
  // =========================================================================

  // Transaction 7: A CANCELLED transaction for demonstration
  const trx7 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX-CAN'),
      userId: participant3Id,
      examId: exam2Id,
      amount: exam2Price,
      status: TransactionStatus.CANCELLED,
      metadata: {
        reason: 'Cancelled by user before payment',
        cancelled_at: relativeDate({ days: -2 }).toISOString(),
        cancelled_by: 'user',
      },
    },
  });
  transactions.push(trx7);
  log(`  ✓ Andi → Exam 2: CANCELLED (user cancelled before payment)`);

  // Transaction 8: Second CANCELLED for same user-exam (constraint test)
  const trx8 = await prisma.transaction.create({
    data: {
      orderId: generateOrderId('TRX-CAN2'),
      userId: participant3Id,
      examId: exam2Id,
      amount: exam2Price,
      status: TransactionStatus.CANCELLED,
      metadata: {
        reason: 'Cancelled by user (second attempt)',
        cancelled_at: relativeDate({ days: -1 }).toISOString(),
        cancelled_by: 'user',
        note: '🆕 Multiple CANCELLED now allowed after constraint removal',
      },
    },
  });
  transactions.push(trx8);
  log(`  ✓ Andi → Exam 2: CANCELLED #2 - 🆕 Multiple CANCELLED now allowed!`);

  log(`\n  📊 Transaction Summary:`);
  log(`    - PAID: 3 transactions`);
  log(`    - PENDING (expired): 1 transaction (lazy cleanup test)`);
  log(`    - EXPIRED: 2 transactions (same user-exam, constraint test)`);
  log(`    - CANCELLED: 2 transactions (same user-exam, constraint test)`);
  log(`    - Total: ${transactions.length} transactions`);

  log(`\n  🧪 NEW TEST SCENARIOS:`);
  log(`    1. Lazy Cleanup: Login as Siti, check Exam 3 access`);
  log(`       → PENDING with past expiredAt should auto-expire`);
  log(`    2. Multiple EXPIRED: Verified by successful seed`);
  log(`       → Previously blocked by unique constraint`);

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
  log(`      Score: ${score3} (19/25 correct, CANNOT retake)`);

  // =========================================================================
  // SCENARIO 4: FINISHED Session with View Results (Analytics Demo)
  // Participant 2 on Exam 2 - Show result details & analysis
  // =========================================================================
  log('  📝 Scenario 4: FINISHED session (View Results/Analytics)');

  const session4 = await prisma.userExam.create({
    data: {
      userId: participant2Id,
      examId: exam2Id,
      attemptNumber: 1,
      startedAt: relativeDate({ hours: -4, minutes: -50 }),
      submittedAt: relativeDate({ hours: -4 }),
      status: ExamStatus.FINISHED,
      totalScore: 80,
    },
  });

  let score4 = 0;
  for (let i = 0; i < exam2Questions.length; i++) {
    const eq = exam2Questions[i];
    const isCorrect = i < 16; // 16/25 correct
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
  log(`      Score: ${score4} (16/25 correct, for analytics demo)`);

  // =========================================================================
  // SCENARIO 5 & 6: Max Attempts Exhausted (2/2 attempts used)
  // Participant 1 on Exam 3 - Both attempts finished
  // =========================================================================
  log('  📝 Scenario 5 & 6: MAX ATTEMPTS EXHAUSTED (2/2)');

  // Attempt 1
  const session5 = await prisma.userExam.create({
    data: {
      userId: participant1Id,
      examId: exam3Id,
      attemptNumber: 1,
      startedAt: relativeDate({ days: -2, hours: -2 }),
      submittedAt: relativeDate({ days: -2, hours: -1 }),
      status: ExamStatus.FINISHED,
      totalScore: 45, // Below passing
    },
  });

  for (let i = 0; i < exam3Questions.length; i++) {
    const eq = exam3Questions[i];
    const isCorrect = i < 9; // 9/25 correct
    await prisma.answer.create({
      data: {
        userExamId: session5.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
  }

  // Attempt 2
  const session6 = await prisma.userExam.create({
    data: {
      userId: participant1Id,
      examId: exam3Id,
      attemptNumber: 2, // Second attempt
      startedAt: relativeDate({ days: -1, hours: -2 }),
      submittedAt: relativeDate({ days: -1, hours: -1 }),
      status: ExamStatus.FINISHED,
      totalScore: 55, // Improved but still below passing
    },
  });

  for (let i = 0; i < exam3Questions.length; i++) {
    const eq = exam3Questions[i];
    const isCorrect = i < 11; // 11/25 correct
    await prisma.answer.create({
      data: {
        userExamId: session6.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
  }

  sessions.maxAttempts1 = { id: session5.id, status: session5.status };
  sessions.maxAttempts2 = { id: session6.id, status: session6.status };
  log(`    ✓ Attempt 1 (ID: ${session5.id}): Score 45 (failed)`);
  log(`    ✓ Attempt 2 (ID: ${session6.id}): Score 55 (still failed)`);
  log(`      ⚠️ Max attempts (2) exhausted - will get error on retry`);

  // =========================================================================
  // SCENARIO 7: TIMEOUT Session (Edge Case)
  // Participant 2 on Exam 3 - Session timed out
  // Note: Siti doesn't have PAID transaction for Exam 3 (has expired PENDING)
  // This session exists for proctoring event demonstration
  // =========================================================================
  log('  📝 Scenario 7: TIMEOUT session (Edge Case)');

  const session7 = await prisma.userExam.create({
    data: {
      userId: participant2Id,
      examId: exam3Id,
      attemptNumber: 1,
      startedAt: relativeDate({ hours: -4, minutes: -45 }),
      submittedAt: relativeDate({ hours: -4 }),
      status: ExamStatus.TIMEOUT,
      totalScore: 30, // Partial score before timeout
    },
  });

  // Only 12 questions answered before timeout
  for (let i = 0; i < 12; i++) {
    const eq = exam3Questions[i];
    const isCorrect = i < 6;
    await prisma.answer.create({
      data: {
        userExamId: session7.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
  }

  sessions.timeout = { id: session7.id, status: session7.status };
  log(`    ✓ Session ID: ${session7.id} - Participant 2 on Exam 3`);
  log(`      Only 12/${exam3Questions.length} answered, timed out`);

  log(`\n  📊 Session Summary: ${Object.keys(sessions).length} sessions created`);

  return sessions;
}

// ============================================================================
// SEED: PROCTORING EVENTS (For YOLO Demo)
// ============================================================================

async function seedProctoringEvents(
  sessions: Record<string, { id: number; status: ExamStatus }>
) {
  logSection('SEEDING PROCTORING EVENTS');

  // -------------------------------------------------------------------------
  // In Progress session: Active proctoring with various events
  // -------------------------------------------------------------------------
  if (sessions.inProgress) {
    const events = [
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -30 }),
        metadata: { confidence: 0.98, facesDetected: 1, message: 'Session started' },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -25 }),
        metadata: { confidence: 0.95, facesDetected: 1 },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: relativeDate({ minutes: -20 }),
        metadata: { confidence: 0.82, direction: 'left', duration_seconds: 3 },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -15 }),
        metadata: { confidence: 0.97, facesDetected: 1 },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.NO_FACE_DETECTED,
        severity: 'HIGH',
        timestamp: relativeDate({ minutes: -10 }),
        metadata: { confidence: 0.12, possibleReason: 'User left camera view' },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -8 }),
        metadata: { confidence: 0.94, facesDetected: 1, message: 'User returned' },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.MULTIPLE_FACES,
        severity: 'HIGH',
        timestamp: relativeDate({ minutes: -5 }),
        metadata: { confidence: 0.89, facesDetected: 2, warning: 'Possible cheating' },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ minutes: -2 }),
        metadata: { confidence: 0.96, facesDetected: 1, message: 'Single face restored' },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ In Progress session: ${events.length} events`);
    log(`    - 2 HIGH severity violations (NO_FACE, MULTIPLE_FACES)`);
  }

  // -------------------------------------------------------------------------
  // View Results session: Mixed proctoring history
  // -------------------------------------------------------------------------
  if (sessions.viewResults) {
    const events = [
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ hours: -4, minutes: -50 }),
        metadata: { confidence: 0.97, facesDetected: 1 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: relativeDate({ hours: -4, minutes: -40 }),
        metadata: { confidence: 0.78, direction: 'down' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.NO_FACE_DETECTED,
        severity: 'HIGH',
        timestamp: relativeDate({ hours: -4, minutes: -30 }),
        metadata: { confidence: 0.15, duration_seconds: 5 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: relativeDate({ hours: -4, minutes: -28 }),
        metadata: { confidence: 0.95, facesDetected: 1 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: relativeDate({ hours: -4, minutes: -20 }),
        metadata: { confidence: 0.72, direction: 'right' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.MULTIPLE_FACES,
        severity: 'HIGH',
        timestamp: relativeDate({ hours: -4, minutes: -10 }),
        metadata: { confidence: 0.85, facesDetected: 3, warning: 'Multiple people detected' },
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
  console.log('🎓 TRYOUT CPNS + PROCTORING + MIDTRANS - DATABASE SEEDING v4.0.0');
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

    // Step 4: Transactions (Midtrans payment records) - Updated with lazy cleanup tests!
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
    console.log(`               └─ Exam 3: TIMEOUT + 🧪 Lazy Cleanup Test`);
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
    console.log(`Transactions:       8`);
    console.log(`  ├─ PAID:          3 transactions`);
    console.log(`  ├─ PENDING:       1 transaction (🧪 expired - lazy cleanup test)`);
    console.log(`  ├─ EXPIRED:       2 transactions (same user-exam)`);
    console.log(`  └─ CANCELLED:     2 transactions (same user-exam)`);
    console.log(`Exam Sessions:      7`);
    console.log(`  ├─ IN_PROGRESS:   1 (resume flow)`);
    console.log(`  ├─ FINISHED:      5 (various scenarios)`);
    console.log(`  └─ TIMEOUT:       1 (edge case)`);
    console.log(`Proctoring Events:  21+ events with violations`);
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
    console.log('  8. Access Check    → Login as Budi, access paid exams');
    console.log('  9. Payment History → View all transaction statuses');
    console.log('');
    console.log('🆕 LAZY CLEANUP TEST:');
    console.log(' 10. Lazy Cleanup    → Login as Siti, check Exam 3 access');
    console.log('     → PENDING transaction with past expiredAt');
    console.log('     → System should auto-mark as EXPIRED');
    console.log('');
    console.log('PROCTORING:');
    console.log(' 11. Proctoring Demo → Active session shows YOLO events');
    console.log(' 12. Violation Report→ Session 4 has HIGH severity violations');
    console.log('─'.repeat(60));

    console.log('\n🔧 QUICK COMMANDS:');
    console.log('─'.repeat(60));
    console.log('Reset & Reseed:     pnpm prisma migrate reset');
    console.log('Seed Only:          pnpm tsx prisma/seed.ts');
    console.log('View Database:      pnpm prisma studio');
    console.log('Type Check:         pnpm run type-check');
    console.log('─'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();