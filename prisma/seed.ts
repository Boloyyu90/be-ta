/**
 * Prisma Seed File - Simplified for Transaction Flow Testing
 *
 * THESIS PROJECT: Universitas Atma Jaya Yogyakarta
 * STUDENT: I Gede Bala Putra
 *
 * SIMPLIFIED VERSION untuk manual testing transaction flow:
 * - 1 Admin + 3 Participants (fresh, no transactions)
 * - 2 Exams only: 1 FREE + 1 PAID
 * - 25 Questions (unchanged)
 * - NO pre-seeded transactions (test manually!)
 * - NO pre-seeded exam sessions (start fresh!)
 *
 * MANUAL TEST SCENARIOS:
 * 1. Login any participant → Access FREE exam directly
 * 2. Login any participant → Try PAID exam → Must purchase first
 * 3. Complete payment → Access granted
 * 4. Check transaction history
 * 5. Test PENDING → EXPIRED flow (wait or manipulate DB)
 *
 * USAGE:
 *   npx prisma migrate reset     (RECOMMENDED: clean + migrate + seed)
 *   npx ts-node prisma/seed.ts   (seed only)
 *
 * @version 5.0.0 (Simplified for transaction testing)
 * @date January 2026
 */

import {
  PrismaClient,
  UserRole,
  QuestionType,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const SALT_ROUNDS = 10;

/**
 * Test Credentials
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

/**
 * Get relative date from now
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

// ============================================================================
// DATABASE CLEANUP
// ============================================================================

async function cleanDatabase() {
  logSection('CLEANING DATABASE');

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
// SEED: USERS (All fresh - no transactions, no sessions)
// ============================================================================

async function seedUsers() {
  logSection('SEEDING USERS (All Fresh)');

  const adminPassword = await hashPassword(TEST_CREDENTIALS.admin.password);
  const participant1Password = await hashPassword(TEST_CREDENTIALS.participant1.password);
  const participant2Password = await hashPassword(TEST_CREDENTIALS.participant2.password);
  const participant3Password = await hashPassword(TEST_CREDENTIALS.participant3.password);

  const admin = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.admin.email,
      name: TEST_CREDENTIALS.admin.name,
      password: adminPassword,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    },
  });

  const participant1 = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.participant1.email,
      name: TEST_CREDENTIALS.participant1.name,
      password: participant1Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  const participant2 = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.participant2.email,
      name: TEST_CREDENTIALS.participant2.name,
      password: participant2Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  const participant3 = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.participant3.email,
      name: TEST_CREDENTIALS.participant3.name,
      password: participant3Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  log(`  ✓ Admin: ${admin.email}`);
  log(`  ✓ Participant 1: ${participant1.email} (Budi) - 🆕 FRESH`);
  log(`  ✓ Participant 2: ${participant2.email} (Siti) - 🆕 FRESH`);
  log(`  ✓ Participant 3: ${participant3.email} (Andi) - 🆕 FRESH`);

  return { admin, participant1, participant2, participant3 };
}

// ============================================================================
// SEED: QUESTIONS (25 total - unchanged)
// ============================================================================

async function seedQuestions() {
  logSection('SEEDING QUESTIONS');

  // TIU Questions (10)
  const tiuQuestions = [
    {
      content: 'Jika 3x + 7 = 22, maka nilai x adalah...',
      options: { A: '3', B: '4', C: '5', D: '6', E: '7' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Hasil dari 15% × 80 adalah...',
      options: { A: '10', B: '12', C: '14', D: '16', E: '18' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Deret 2, 6, 18, 54, ... Angka selanjutnya adalah...',
      options: { A: '108', B: '126', C: '162', D: '180', E: '216' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'KUCING : MEONG = ANJING : ...',
      options: { A: 'MENGEONG', B: 'MENGGONGGONG', C: 'MENCICIT', D: 'MENGAUM', E: 'MENDENGKUR' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Semua dokter adalah tenaga kesehatan. Sebagian tenaga kesehatan bekerja di rumah sakit. Kesimpulan yang PASTI benar adalah...',
      options: {
        A: 'Semua dokter bekerja di rumah sakit',
        B: 'Sebagian dokter bekerja di rumah sakit',
        C: 'Semua yang bekerja di rumah sakit adalah dokter',
        D: 'Tidak ada dokter yang bekerja di rumah sakit',
        E: 'Tidak dapat disimpulkan',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Jika semua A adalah B, dan semua B adalah C, maka...',
      options: {
        A: 'Semua C adalah A',
        B: 'Semua A adalah C',
        C: 'Sebagian C adalah A',
        D: 'Tidak ada A yang C',
        E: 'Semua C adalah B',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Rata-rata nilai 5 siswa adalah 70. Jika seorang siswa nilainya 80, rata-rata 4 siswa lainnya adalah...',
      options: { A: '65', B: '67,5', C: '68', D: '70', E: '72,5' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Sebuah persegi panjang memiliki keliling 36 cm. Jika panjangnya 10 cm, maka luasnya adalah...',
      options: { A: '60 cm²', B: '70 cm²', C: '80 cm²', D: '90 cm²', E: '100 cm²' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Antonim dari kata PROLIFERASI adalah...',
      options: { A: 'Perkembangan', B: 'Pengurangan', C: 'Pertumbuhan', D: 'Penyusutan', E: 'Perluasan' },
      correctAnswer: 'D',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Sinonim dari kata ELABORASI adalah...',
      options: { A: 'Penyederhanaan', B: 'Penguraian', C: 'Penghapusan', D: 'Pengurangan', E: 'Pembatasan' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
  ];

  // TWK Questions (8)
  const twkQuestions = [
    {
      content: 'Pancasila sebagai dasar negara tercantum dalam Pembukaan UUD 1945 alinea ke...',
      options: { A: 'Pertama', B: 'Kedua', C: 'Ketiga', D: 'Keempat', E: 'Kelima' },
      correctAnswer: 'D',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Sila ketiga Pancasila berbunyi...',
      options: {
        A: 'Kemanusiaan yang adil dan beradab',
        B: 'Persatuan Indonesia',
        C: 'Kerakyatan yang dipimpin oleh hikmat kebijaksanaan',
        D: 'Keadilan sosial bagi seluruh rakyat Indonesia',
        E: 'Ketuhanan Yang Maha Esa',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Bhinneka Tunggal Ika memiliki arti...',
      options: {
        A: 'Bersatu kita teguh',
        B: 'Berbeda-beda tetapi tetap satu',
        C: 'Satu untuk semua',
        D: 'Bersama dalam perbedaan',
        E: 'Maju bersama',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'UUD 1945 telah diamandemen sebanyak...',
      options: { A: '2 kali', B: '3 kali', C: '4 kali', D: '5 kali', E: '6 kali' },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Menurut UUD 1945, kedaulatan berada di tangan...',
      options: { A: 'Presiden', B: 'MPR', C: 'DPR', D: 'Rakyat', E: 'Pemerintah' },
      correctAnswer: 'D',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
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

  // TKP Questions (7)
  const tkpQuestions = [
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
    {
      content: 'Ketika terjadi konflik antar rekan kerja, Anda akan...',
      options: {
        A: 'Membiarkan mereka menyelesaikan sendiri',
        B: 'Memihak salah satu pihak',
        C: 'Mencoba menjadi mediator yang netral',
        D: 'Melaporkan ke atasan',
        E: 'Menghindari keduanya',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Jika Anda ditawari hadiah oleh pihak yang berkepentingan, Anda akan...',
      options: {
        A: 'Menerima dengan senang hati',
        B: 'Menerima tapi tidak mempengaruhi keputusan',
        C: 'Menolak dengan sopan dan menjelaskan alasannya',
        D: 'Menerima diam-diam',
        E: 'Menerima lalu melaporkan ke atasan',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
  ];

  const allQuestions = [...tiuQuestions, ...twkQuestions, ...tkpQuestions];

  const createdQuestions = [];
  for (const q of allQuestions) {
    const question = await prisma.questionBank.create({
      data: q as any,
    });
    createdQuestions.push(question);
  }

  log(`  ✓ Created ${createdQuestions.length} questions`);
  log(`    - TIU: ${tiuQuestions.length} soal`);
  log(`    - TWK: ${twkQuestions.length} soal`);
  log(`    - TKP: ${tkpQuestions.length} soal`);

  return createdQuestions;
}

// ============================================================================
// SEED: EXAMS (SIMPLIFIED - 1 FREE + 1 PAID only)
// ============================================================================

async function seedExams(adminId: number) {
  logSection('SEEDING EXAMS (1 FREE + 1 PAID)');

  const allQuestions = await prisma.questionBank.findMany({
    orderBy: [{ questionType: 'asc' }, { id: 'asc' }],
  });

  // -------------------------------------------------------------------------
  // Exam 1: FREE exam - untuk baseline testing
  // -------------------------------------------------------------------------
  const examFree = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Paket Gratis',
      description:
        'Tryout CPNS GRATIS untuk latihan. Dapat diulang hingga 3 kali. Tidak memerlukan pembayaran.',
      durationMinutes: 90,
      passingScore: 65,
      allowRetake: true,
      maxAttempts: 3,
      price: null, // 🆓 FREE
      startTime: relativeDate({ days: -30 }),
      endTime: relativeDate({ days: 60 }),
      createdBy: adminId,
    },
  });

  // -------------------------------------------------------------------------
  // Exam 2: PAID exam - untuk transaction flow testing
  // -------------------------------------------------------------------------
  const examPaid = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Paket Premium',
      description:
        'Tryout CPNS PREMIUM dengan fitur lengkap. Memerlukan pembayaran Rp 50.000 untuk akses. Dapat diulang hingga 2 kali setelah pembelian.',
      durationMinutes: 60,
      passingScore: 70,
      allowRetake: true,
      maxAttempts: 2,
      price: 50000, // 💰 Rp 50.000
      startTime: relativeDate({ days: -15 }),
      endTime: relativeDate({ days: 45 }),
      createdBy: adminId,
    },
  });

  // Assign ALL questions to BOTH exams
  for (const exam of [examFree, examPaid]) {
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

  log(`  ✓ Exam FREE: "${examFree.title}" (ID: ${examFree.id})`);
  log(`    - Duration: ${examFree.durationMinutes} minutes`);
  log(`    - Passing: ${examFree.passingScore} points`);
  log(`    - Retakes: ✅ Allowed (max ${examFree.maxAttempts})`);
  log(`    - Price: 🆓 FREE`);
  log('');
  log(`  ✓ Exam PAID: "${examPaid.title}" (ID: ${examPaid.id})`);
  log(`    - Duration: ${examPaid.durationMinutes} minutes`);
  log(`    - Passing: ${examPaid.passingScore} points`);
  log(`    - Retakes: ✅ Allowed (max ${examPaid.maxAttempts})`);
  log(`    - Price: 💰 Rp ${examPaid.price?.toLocaleString('id-ID')}`);
  log('');
  log(`  ✓ Assigned ${allQuestions.length} questions to each exam`);

  return { examFree, examPaid };
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🎓 TRYOUT CPNS - SIMPLIFIED SEED FOR TRANSACTION TESTING v5.0.0');
  console.log('   Thesis Project: Universitas Atma Jaya Yogyakarta');
  console.log('═'.repeat(70));

  try {
    // Step 1: Clean database
    await cleanDatabase();

    // Step 2: Users (all fresh)
    const { admin } = await seedUsers();

    // Step 3: Questions (25 total)
    await seedQuestions();

    // Step 4: Exams (1 FREE + 1 PAID only)
    const { examFree, examPaid } = await seedExams(admin.id);

    // NO TRANSACTIONS - Test manually!
    // NO EXAM SESSIONS - Start fresh!

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
    console.log(`               Status: 🆕 FRESH - No transactions, no sessions`);
    console.log('');
    console.log(`PARTICIPANT 2: ${TEST_CREDENTIALS.participant2.email} (Siti)`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant2.password}`);
    console.log(`               Status: 🆕 FRESH - No transactions, no sessions`);
    console.log('');
    console.log(`PARTICIPANT 3: ${TEST_CREDENTIALS.participant3.email} (Andi)`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant3.password}`);
    console.log(`               Status: 🆕 FRESH - No transactions, no sessions`);
    console.log('─'.repeat(60));

    console.log('\n📊 DATA SUMMARY:');
    console.log('─'.repeat(60));
    console.log(`Users:              4 (1 admin, 3 participants)`);
    console.log(`Questions:          25 (10 TIU, 8 TWK, 7 TKP)`);
    console.log(`Exams:              2`);
    console.log(`  ├─ Exam FREE:     "${examFree.title}"`);
    console.log(`  │                 🆓 FREE - Langsung bisa akses`);
    console.log(`  └─ Exam PAID:     "${examPaid.title}"`);
    console.log(`                    💰 Rp 50.000 - Harus beli dulu`);
    console.log(`Transactions:       0 (test manually!)`);
    console.log(`Exam Sessions:      0 (start fresh!)`);
    console.log('─'.repeat(60));

    console.log('\n🧪 MANUAL TEST SCENARIOS:');
    console.log('─'.repeat(60));
    console.log('1. FREE EXAM ACCESS:');
    console.log('   → Login as any participant');
    console.log('   → Go to "Pilihan Paket"');
    console.log('   → Click FREE exam → Should start directly');
    console.log('');
    console.log('2. PAID EXAM - PURCHASE REQUIRED:');
    console.log('   → Login as any participant');
    console.log('   → Go to "Pilihan Paket"');
    console.log('   → Click PAID exam → Should show "Beli Rp 50.000"');
    console.log('');
    console.log('3. COMPLETE PAYMENT:');
    console.log('   → Click "Beli" → Midtrans popup appears');
    console.log('   → Complete payment (use sandbox test cards)');
    console.log('   → Should redirect back with access granted');
    console.log('');
    console.log('4. CHECK TRANSACTION HISTORY:');
    console.log('   → Go to Profile → Riwayat Transaksi');
    console.log('   → Should see your transaction with status');
    console.log('');
    console.log('5. TEST PENDING PAYMENT:');
    console.log('   → Start payment but close popup');
    console.log('   → Check "Riwayat Transaksi" → Should show PENDING');
    console.log('   → Click "Lanjutkan Pembayaran" to resume');
    console.log('');
    console.log('6. TEST PAYMENT CANCELLATION:');
    console.log('   → With PENDING transaction, click "Batalkan"');
    console.log('   → Should update to CANCELLED');
    console.log('   → Can purchase again (new transaction)');
    console.log('─'.repeat(60));

    console.log('\n💳 MIDTRANS SANDBOX TEST CARDS:');
    console.log('─'.repeat(60));
    console.log('Credit Card (Success):');
    console.log('  Card Number: 4811 1111 1111 1114');
    console.log('  Expiry:      Any future date (e.g., 01/25)');
    console.log('  CVV:         123');
    console.log('  OTP:         112233');
    console.log('');
    console.log('Bank Transfer:');
    console.log('  → Select BCA/BNI/BRI/Mandiri');
    console.log('  → Use Midtrans simulator to complete');
    console.log('');
    console.log('E-Wallet (GoPay/ShopeePay):');
    console.log('  → Scan QR with Midtrans simulator');
    console.log('─'.repeat(60));

    console.log('\n🔧 QUICK COMMANDS:');
    console.log('─'.repeat(60));
    console.log('Reset & Reseed:     pnpm prisma migrate reset');
    console.log('Seed Only:          pnpm tsx prisma/seed.ts');
    console.log('View Database:      pnpm prisma studio');
    console.log('─'.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();