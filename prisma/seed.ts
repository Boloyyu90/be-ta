/**
 * Prisma Seed File - Professional CPNS Tryout System
 *
 * THESIS PROJECT: Universitas Atma Jaya Yogyakarta
 * STUDENT: I Gede Bala Putra
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * FITUR SEED PROFESIONAL:
 * ═══════════════════════════════════════════════════════════════════════════
 * ✓ 110 Soal CPNS berkualitas (35 TIU + 35 TWK + 40 TKP)
 * ✓ Konten soal sesuai standar SKD CPNS BKN
 * ✓ Sistem penilaian realistis (Passing Grade SKD 2024)
 * ✓ 5 Paket Tryout dengan variasi harga & fitur
 * ✓ 6 Akun pengguna demo dengan skenario berbeda
 * ✓ Kompatibel 100% dengan skema Prisma & backend ExpressJS
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * PASSING GRADE SKD CPNS 2024:
 * ═══════════════════════════════════════════════════════════════════════════
 * - TIU (Tes Intelegensia Umum)     : Min 80 dari 175 poin
 * - TKP (Tes Karakteristik Pribadi) : Min 166 dari 225 poin
 * - TWK (Tes Wawasan Kebangsaan)    : Min 65 dari 150 poin
 * - TOTAL KUMULATIF                 : Min 311 poin
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * USAGE:
 *   npx prisma migrate reset     (RECOMMENDED: clean + migrate + seed)
 *   npx ts-node prisma/seed.ts   (seed only)
 *   pnpm tsx prisma/seed.ts      (alternative)
 *
 * @version 6.0.0 (Professional CPNS Edition)
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

// Passing Grade SKD CPNS 2024 (resmi dari BKN)
const PASSING_GRADE = {
  TIU: 80,   // dari 175 poin
  TKP: 166,  // dari 225 poin
  TWK: 65,   // dari 150 poin
  TOTAL: 311 // kumulatif minimum
};

/**
 * Test Credentials - Akun Demo Profesional
 */
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@tryoutcpns.id',
    password: 'Admin@2025!',
    name: 'Administrator Sistem',
  },
  participants: [
    {
      email: 'dewi.anggraini@gmail.com',
      password: 'Dewi@2025!',
      name: 'Dewi Anggraini, S.Pd.',
    },
    {
      email: 'muhammad.rizki@gmail.com',
      password: 'Rizki@2025!',
      name: 'Muhammad Rizki Pratama',
    },
    {
      email: 'siti.nurhaliza@gmail.com',
      password: 'Siti@2025!',
      name: 'Siti Nurhaliza',
    },
    {
      email: 'agus.setiawan@gmail.com',
      password: 'Agus@2025!',
      name: 'Agus Setiawan, S.E.',
    },
    {
      email: 'putri.maharani@gmail.com',
      password: 'Putri@2025!',
      name: 'Putri Maharani',
    },
  ],
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
  console.log('\n' + '═'.repeat(70));
  console.log(`📦 ${title}`);
  console.log('═'.repeat(70));
}

function logSubSection(title: string): void {
  console.log('\n' + '─'.repeat(60));
  console.log(`  📋 ${title}`);
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

/**
 * Format currency IDR
 */
function formatIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

// ============================================================================
// DATABASE CLEANUP
// ============================================================================

async function cleanDatabase() {
  logSection('MEMBERSIHKAN DATABASE');

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
    log(`  ✓ Menghapus ${result.count} data dari ${item.name}`);
  }

  log('\n✅ Database berhasil dibersihkan');
}

// ============================================================================
// SEED: USERS
// ============================================================================

async function seedUsers() {
  logSection('MEMBUAT AKUN PENGGUNA');

  // Create Admin
  const adminPassword = await hashPassword(TEST_CREDENTIALS.admin.password);
  const admin = await prisma.user.create({
    data: {
      email: TEST_CREDENTIALS.admin.email,
      name: TEST_CREDENTIALS.admin.name,
      password: adminPassword,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    },
  });
  log(`  ✓ Admin: ${admin.email}`);

  // Create Participants
  const participants = [];
  for (const p of TEST_CREDENTIALS.participants) {
    const hashedPassword = await hashPassword(p.password);
    const participant = await prisma.user.create({
      data: {
        email: p.email,
        name: p.name,
        password: hashedPassword,
        role: UserRole.PARTICIPANT,
        isEmailVerified: true,
      },
    });
    participants.push(participant);
    log(`  ✓ Peserta: ${participant.name} (${participant.email})`);
  }

  return { admin, participants };
}

// ============================================================================
// SEED: QUESTION BANK - TES INTELEGENSIA UMUM (TIU)
// ============================================================================

function getTIUQuestions() {
  return [
    // ═══════════════════════════════════════════════════════════════════════
    // TIU - VERBAL: SINONIM (5 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'IMPLIKASI',
      options: {
        A: 'Aplikasi',
        B: 'Komplikasi',
        C: 'Konsekuensi',
        D: 'Dedikasi',
        E: 'Inspirasi',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'AMBIGU',
      options: {
        A: 'Jelas',
        B: 'Bermakna ganda',
        C: 'Tegas',
        D: 'Pasti',
        E: 'Lugas',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'ELABORASI',
      options: {
        A: 'Penyederhanaan',
        B: 'Pengurangan',
        C: 'Penguraian terperinci',
        D: 'Pembatasan',
        E: 'Penghapusan',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'PARADOKS',
      options: {
        A: 'Kesamaan',
        B: 'Keteraturan',
        C: 'Pertentangan',
        D: 'Keharmonisan',
        E: 'Keselarasan',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'SKEPTIS',
      options: {
        A: 'Yakin',
        B: 'Optimis',
        C: 'Ragu-ragu',
        D: 'Percaya',
        E: 'Antusias',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIU - VERBAL: ANTONIM (5 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'PROLIFERASI >< ...',
      options: {
        A: 'Pertumbuhan',
        B: 'Perkembangan',
        C: 'Penyusutan',
        D: 'Perluasan',
        E: 'Penyebaran',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'EKSPLISIT >< ...',
      options: {
        A: 'Terang',
        B: 'Jelas',
        C: 'Implisit',
        D: 'Nyata',
        E: 'Gamblang',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'APRIORI >< ...',
      options: {
        A: 'Praduga',
        B: 'Aposteriori',
        C: 'Prasangka',
        D: 'Dugaan',
        E: 'Asumsi',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'KONTRADIKSI >< ...',
      options: {
        A: 'Pertentangan',
        B: 'Perbedaan',
        C: 'Konformitas',
        D: 'Perselisihan',
        E: 'Konflik',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'HETEROGEN >< ...',
      options: {
        A: 'Beragam',
        B: 'Berbeda',
        C: 'Homogen',
        D: 'Majemuk',
        E: 'Bervariasi',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIU - VERBAL: ANALOGI (5 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'DOKTER : STETOSKOP = ARSITEK : ...',
      options: {
        A: 'Bangunan',
        B: 'Pensil',
        C: 'Penggaris',
        D: 'Komputer',
        E: 'Kertas',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'MATA : MELIHAT = TELINGA : ...',
      options: {
        A: 'Berbicara',
        B: 'Mendengar',
        C: 'Mencium',
        D: 'Meraba',
        E: 'Merasakan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'KELAPA : SANTAN = TEBU : ...',
      options: {
        A: 'Garam',
        B: 'Air',
        C: 'Gula',
        D: 'Sirup',
        E: 'Madu',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'PENULIS : BUKU = SUTRADARA : ...',
      options: {
        A: 'Teater',
        B: 'Aktor',
        C: 'Film',
        D: 'Panggung',
        E: 'Kamera',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'BUNGA : KARANGAN = KATA : ...',
      options: {
        A: 'Huruf',
        B: 'Buku',
        C: 'Kalimat',
        D: 'Paragraf',
        E: 'Cerita',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIU - NUMERIK: DERET ANGKA (5 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: '2, 6, 18, 54, 162, ...',
      options: {
        A: '324',
        B: '486',
        C: '512',
        D: '648',
        E: '810',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: '1, 4, 9, 16, 25, 36, ...',
      options: {
        A: '42',
        B: '47',
        C: '49',
        D: '52',
        E: '56',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: '2, 3, 5, 7, 11, 13, ...',
      options: {
        A: '15',
        B: '17',
        C: '19',
        D: '21',
        E: '23',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: '1, 1, 2, 3, 5, 8, 13, ...',
      options: {
        A: '18',
        B: '19',
        C: '20',
        D: '21',
        E: '22',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: '3, 6, 11, 18, 27, ...',
      options: {
        A: '35',
        B: '36',
        C: '38',
        D: '40',
        E: '42',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIU - NUMERIK: ARITMATIKA (5 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Jika 3x + 7 = 22, maka nilai x adalah...',
      options: {
        A: '3',
        B: '4',
        C: '5',
        D: '6',
        E: '7',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Seorang pedagang membeli 50 kg beras dengan harga Rp 12.000 per kg. Jika ia ingin mendapat keuntungan 20%, berapa harga jual per kg?',
      options: {
        A: 'Rp 13.200',
        B: 'Rp 13.800',
        C: 'Rp 14.000',
        D: 'Rp 14.400',
        E: 'Rp 15.000',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Sebuah tangki air berkapasitas 2.400 liter. Jika tangki tersebut diisi dengan debit 8 liter/menit, berapa lama waktu yang diperlukan untuk mengisi penuh tangki?',
      options: {
        A: '4 jam',
        B: '4 jam 30 menit',
        C: '5 jam',
        D: '5 jam 30 menit',
        E: '6 jam',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Rata-rata nilai 8 siswa adalah 75. Jika seorang siswa dengan nilai 55 diganti dengan siswa baru, rata-rata menjadi 77. Berapa nilai siswa baru tersebut?',
      options: {
        A: '67',
        B: '69',
        C: '71',
        D: '73',
        E: '75',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Perbandingan umur Ayah dan Anak saat ini adalah 5:2. Lima tahun yang lalu, perbandingan umur mereka adalah 3:1. Berapa umur Ayah saat ini?',
      options: {
        A: '35 tahun',
        B: '40 tahun',
        C: '45 tahun',
        D: '50 tahun',
        E: '55 tahun',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIU - FIGURAL: LOGIKA GAMBAR (5 Soal - Deskripsi)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Jika semua segitiga berubah menjadi persegi dan semua lingkaran berubah menjadi segitiga, maka gambar yang terdiri dari 2 segitiga dan 3 lingkaran akan menjadi...',
      options: {
        A: '2 persegi dan 3 segitiga',
        B: '3 persegi dan 2 segitiga',
        C: '5 persegi',
        D: '5 segitiga',
        E: '2 segitiga dan 3 persegi',
      },
      correctAnswer: 'A',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Pola: ○●○ → ●○● → ○●○ → ? Pola selanjutnya adalah...',
      options: {
        A: '○○○',
        B: '●●●',
        C: '●○●',
        D: '○●○',
        E: '●●○',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Sebuah kubus memiliki 6 sisi dengan warna berbeda: merah, biru, kuning, hijau, putih, dan hitam. Jika sisi merah berhadapan dengan biru, sisi kuning berhadapan dengan hijau, maka sisi putih berhadapan dengan...',
      options: {
        A: 'Merah',
        B: 'Biru',
        C: 'Kuning',
        D: 'Hijau',
        E: 'Hitam',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Jika A = 1, B = 2, C = 3, dan seterusnya, maka nilai CPNS adalah...',
      options: {
        A: '49',
        B: '50',
        C: '51',
        D: '52',
        E: '53',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Dalam sebuah kotak terdapat 5 bola merah, 3 bola biru, dan 2 bola kuning. Jika diambil 1 bola secara acak, berapa probabilitas terambilnya bola yang bukan merah?',
      options: {
        A: '1/2',
        B: '2/5',
        C: '3/10',
        D: '1/5',
        E: '3/5',
      },
      correctAnswer: 'A',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TIU - LOGIKA: PENALARAN LOGIS (5 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Semua PNS adalah warga negara Indonesia. Semua guru honorer adalah warga negara Indonesia. Kesimpulan yang tepat adalah...',
      options: {
        A: 'Semua PNS adalah guru honorer',
        B: 'Semua guru honorer adalah PNS',
        C: 'Sebagian warga negara Indonesia adalah PNS',
        D: 'Semua warga negara Indonesia adalah PNS',
        E: 'Tidak ada PNS yang guru honorer',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Jika hujan turun, maka tanah menjadi basah. Tanah tidak basah. Kesimpulannya...',
      options: {
        A: 'Hujan turun',
        B: 'Hujan tidak turun',
        C: 'Mungkin hujan turun',
        D: 'Tanah basah',
        E: 'Tidak dapat disimpulkan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Semua peserta ujian yang lulus mengikuti diklat. Budi tidak mengikuti diklat. Kesimpulannya...',
      options: {
        A: 'Budi lulus ujian',
        B: 'Budi tidak lulus ujian',
        C: 'Budi mungkin lulus ujian',
        D: 'Budi peserta ujian',
        E: 'Budi bukan peserta ujian',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Tidak ada koruptor yang jujur. Semua pejabat yang baik adalah orang jujur. Kesimpulannya...',
      options: {
        A: 'Semua pejabat adalah koruptor',
        B: 'Tidak ada pejabat yang koruptor',
        C: 'Tidak ada koruptor yang pejabat baik',
        D: 'Semua orang jujur adalah pejabat',
        E: 'Sebagian koruptor adalah pejabat',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Semua yang rajin belajar akan sukses. Dina sangat malas. Kesimpulannya...',
      options: {
        A: 'Dina pasti sukses',
        B: 'Dina tidak akan sukses',
        C: 'Dina mungkin sukses',
        D: 'Tidak ada yang sukses',
        E: 'Tidak dapat disimpulkan',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
  ];
}

// ============================================================================
// SEED: QUESTION BANK - TES WAWASAN KEBANGSAAN (TWK)
// ============================================================================

function getTWKQuestions() {
  return [
    // ═══════════════════════════════════════════════════════════════════════
    // TWK - PANCASILA (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Pancasila sebagai dasar negara tercantum dalam Pembukaan UUD 1945 alinea ke...',
      options: {
        A: 'Pertama',
        B: 'Kedua',
        C: 'Ketiga',
        D: 'Keempat',
        E: 'Kelima',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Sila Pancasila yang mengandung nilai keadilan sosial adalah sila ke...',
      options: {
        A: 'Pertama',
        B: 'Kedua',
        C: 'Ketiga',
        D: 'Keempat',
        E: 'Kelima',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Rumusan Pancasila yang sah dan resmi terdapat dalam...',
      options: {
        A: 'Piagam Jakarta',
        B: 'Pembukaan UUD 1945',
        C: 'Batang Tubuh UUD 1945',
        D: 'Penjelasan UUD 1945',
        E: 'TAP MPR',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Pancasila sebagai ideologi negara bersifat terbuka, artinya...',
      options: {
        A: 'Dapat diganti dengan ideologi lain',
        B: 'Dapat berinteraksi dengan perkembangan zaman',
        C: 'Dapat diubah sesuai kepentingan',
        D: 'Dapat ditafsirkan bebas oleh siapa saja',
        E: 'Dapat dikombinasikan dengan ideologi asing',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Nilai-nilai Pancasila yang terkandung dalam sila "Kemanusiaan yang adil dan beradab" adalah...',
      options: {
        A: 'Cinta tanah air',
        B: 'Pengakuan persamaan derajat manusia',
        C: 'Gotong royong',
        D: 'Musyawarah mufakat',
        E: 'Toleransi beragama',
      },
      correctAnswer: 'B',
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
    {
      content: 'Makna "Bhinneka Tunggal Ika" adalah...',
      options: {
        A: 'Bersatu kita teguh',
        B: 'Berbeda-beda tetapi tetap satu',
        C: 'Satu untuk semua',
        D: 'Bersama dalam perbedaan',
        E: 'Maju bersama dalam keberagaman',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Pancasila sebagai pandangan hidup bangsa memiliki fungsi...',
      options: {
        A: 'Sebagai alat kekuasaan',
        B: 'Sebagai pedoman tingkah laku',
        C: 'Sebagai sumber hukum',
        D: 'Sebagai ideologi politik',
        E: 'Sebagai dasar ekonomi',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TWK - UUD 1945 & KONSTITUSI (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'UUD 1945 telah mengalami amandemen sebanyak...',
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
      content: 'Menurut UUD 1945 Pasal 1 Ayat 2, kedaulatan berada di tangan...',
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
    {
      content: 'Sistem pemerintahan Indonesia menurut UUD 1945 adalah...',
      options: {
        A: 'Parlementer',
        B: 'Presidensial',
        C: 'Semi Parlementer',
        D: 'Semi Presidensial',
        E: 'Federal',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Lembaga negara yang berwenang mengubah dan menetapkan UUD adalah...',
      options: {
        A: 'Presiden',
        B: 'DPR',
        C: 'MPR',
        D: 'MA',
        E: 'MK',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Hak warga negara untuk mendapat pendidikan dijamin dalam UUD 1945 Pasal...',
      options: {
        A: 'Pasal 27',
        B: 'Pasal 28',
        C: 'Pasal 29',
        D: 'Pasal 30',
        E: 'Pasal 31',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Mahkamah Konstitusi (MK) berwenang untuk...',
      options: {
        A: 'Mengadili perkara pidana',
        B: 'Menguji UU terhadap UUD',
        C: 'Mengadili sengketa tata usaha negara',
        D: 'Membuat peraturan perundangan',
        E: 'Mengawasi hakim',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Presiden dan Wakil Presiden dipilih dalam satu pasangan secara langsung oleh rakyat diatur dalam UUD 1945 Pasal...',
      options: {
        A: 'Pasal 6',
        B: 'Pasal 6A',
        C: 'Pasal 7',
        D: 'Pasal 7A',
        E: 'Pasal 8',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Masa jabatan Presiden dan Wakil Presiden Indonesia adalah...',
      options: {
        A: '4 tahun dan dapat dipilih kembali 1 kali',
        B: '5 tahun dan dapat dipilih kembali 1 kali',
        C: '5 tahun dan dapat dipilih kembali 2 kali',
        D: '6 tahun dan tidak dapat dipilih kembali',
        E: '6 tahun dan dapat dipilih kembali 1 kali',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TWK - SEJARAH NASIONAL (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Proklamasi kemerdekaan Indonesia dibacakan pada tanggal...',
      options: {
        A: '16 Agustus 1945',
        B: '17 Agustus 1945',
        C: '18 Agustus 1945',
        D: '19 Agustus 1945',
        E: '20 Agustus 1945',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Teks proklamasi kemerdekaan Indonesia diketik oleh...',
      options: {
        A: 'Mohammad Hatta',
        B: 'Soekarno',
        C: 'Ahmad Soebardjo',
        D: 'Sayuti Melik',
        E: 'Fatmawati',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Sumpah Pemuda diikrarkan pada tanggal...',
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
      content: 'Hari Kebangkitan Nasional diperingati setiap tanggal...',
      options: {
        A: '2 Mei',
        B: '20 Mei',
        C: '21 Mei',
        D: '28 Oktober',
        E: '10 November',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Organisasi Boedi Oetomo didirikan pada tanggal...',
      options: {
        A: '20 Mei 1905',
        B: '20 Mei 1908',
        C: '28 Oktober 1928',
        D: '17 Agustus 1945',
        E: '1 Juni 1945',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Peristiwa Rengasdengklok terjadi pada tanggal...',
      options: {
        A: '14 Agustus 1945',
        B: '15 Agustus 1945',
        C: '16 Agustus 1945',
        D: '17 Agustus 1945',
        E: '18 Agustus 1945',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Hari Pahlawan diperingati setiap tanggal 10 November untuk mengenang peristiwa...',
      options: {
        A: 'Bandung Lautan Api',
        B: 'Pertempuran Surabaya',
        C: 'Agresi Militer Belanda',
        D: 'Peristiwa Madiun',
        E: 'Serangan Umum 1 Maret',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Sidang BPUPKI yang membahas dasar negara dilaksanakan pada tanggal...',
      options: {
        A: '28 Mei - 1 Juni 1945',
        B: '29 Mei - 1 Juni 1945',
        C: '1 - 17 Juni 1945',
        D: '10 - 17 Juli 1945',
        E: '18 Agustus 1945',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TWK - NKRI & PEMERINTAHAN (6 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Indonesia sebagai negara kesatuan berbentuk...',
      options: {
        A: 'Monarki',
        B: 'Republik',
        C: 'Federasi',
        D: 'Konfederasi',
        E: 'Kesultanan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Otonomi daerah di Indonesia diatur dalam UU Nomor...',
      options: {
        A: 'UU No. 22 Tahun 1999',
        B: 'UU No. 32 Tahun 2004',
        C: 'UU No. 23 Tahun 2014',
        D: 'UU No. 6 Tahun 2014',
        E: 'UU No. 5 Tahun 2014',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Asas penyelenggaraan pemerintahan daerah yang mengutamakan kepentingan umum disebut...',
      options: {
        A: 'Asas kepastian hukum',
        B: 'Asas tertib penyelenggara negara',
        C: 'Asas kepentingan umum',
        D: 'Asas keterbukaan',
        E: 'Asas proporsionalitas',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Wilayah Indonesia menurut UUD 1945 ditetapkan dengan...',
      options: {
        A: 'Peraturan Presiden',
        B: 'Peraturan Pemerintah',
        C: 'Undang-Undang',
        D: 'TAP MPR',
        E: 'Keputusan DPR',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Konsep Wawasan Nusantara pertama kali dicetuskan pada tahun...',
      options: {
        A: '1945',
        B: '1957',
        C: '1966',
        D: '1973',
        E: '1998',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Batas laut teritorial Indonesia adalah...',
      options: {
        A: '3 mil laut',
        B: '12 mil laut',
        C: '24 mil laut',
        D: '200 mil laut',
        E: '350 mil laut',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TWK - BAHASA INDONESIA (5 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Bahasa Indonesia ditetapkan sebagai bahasa negara dalam UUD 1945 Pasal...',
      options: {
        A: 'Pasal 32',
        B: 'Pasal 33',
        C: 'Pasal 34',
        D: 'Pasal 35',
        E: 'Pasal 36',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Bahasa Indonesia berasal dari bahasa...',
      options: {
        A: 'Jawa',
        B: 'Sunda',
        C: 'Melayu',
        D: 'Minang',
        E: 'Betawi',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'EYD (Ejaan yang Disempurnakan) diganti dengan PUEBI pada tahun...',
      options: {
        A: '2013',
        B: '2014',
        C: '2015',
        D: '2016',
        E: '2017',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Fungsi bahasa Indonesia sebagai bahasa persatuan tercantum dalam...',
      options: {
        A: 'Pembukaan UUD 1945',
        B: 'Batang Tubuh UUD 1945',
        C: 'Sumpah Pemuda',
        D: 'TAP MPR',
        E: 'Piagam Jakarta',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
    {
      content: 'Penulisan gelar akademik yang benar adalah...',
      options: {
        A: 'Dr. Ir. Ahmad Sudirman, M.Sc',
        B: 'Dr. Ir. Ahmad Sudirman, M.Sc.',
        C: 'dr. Ir. Ahmad Sudirman, M.Sc.',
        D: 'DR. IR. Ahmad Sudirman, M.SC.',
        E: 'Dr.Ir.Ahmad Sudirman,M.Sc.',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TWK,
      defaultScore: 5,
    },
  ];
}

// ============================================================================
// SEED: QUESTION BANK - TES KARAKTERISTIK PRIBADI (TKP)
// ============================================================================

function getTKPQuestions() {
  return [
    // ═══════════════════════════════════════════════════════════════════════
    // TKP - PELAYANAN PUBLIK (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Seorang warga datang ke kantor Anda dengan keluhan yang sama untuk ketiga kalinya karena permasalahannya belum terselesaikan. Sikap Anda adalah...',
      options: {
        A: 'Meminta warga untuk bersabar karena ada prosedur yang harus diikuti',
        B: 'Mengarahkan warga ke bagian lain yang lebih berwenang',
        C: 'Mendengarkan keluhan dengan empati dan berusaha mencari solusi konkret',
        D: 'Menjelaskan bahwa masalah tersebut bukan tanggung jawab Anda',
        E: 'Meminta warga untuk datang lagi besok karena hari ini sibuk',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda melihat antrian di loket pelayanan sangat panjang dan banyak warga yang mengeluh. Tindakan Anda adalah...',
      options: {
        A: 'Membiarkan saja karena bukan tugas Anda',
        B: 'Membantu dengan membuka loket tambahan atau membantu petugas',
        C: 'Menyarankan warga untuk datang di hari yang lebih sepi',
        D: 'Melaporkan ke atasan tanpa mengambil tindakan',
        E: 'Meminta warga untuk bersabar menunggu',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Seorang lansia kesulitan memahami prosedur pelayanan online. Tindakan Anda adalah...',
      options: {
        A: 'Memberikan brosur dan memintanya membaca sendiri',
        B: 'Membantu dengan sabar hingga prosedur selesai',
        C: 'Menyarankan agar meminta bantuan keluarga yang lebih muda',
        D: 'Menjelaskan sekali dan meminta untuk menghubungi call center',
        E: 'Mengarahkan ke petugas lain karena Anda sibuk',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Ada masyarakat yang komplain tentang pelayanan yang Anda berikan melalui media sosial. Sikap Anda adalah...',
      options: {
        A: 'Mengabaikan karena kritik di media sosial tidak resmi',
        B: 'Merespons dengan memberikan klarifikasi dan menawarkan solusi',
        C: 'Membalas dengan membela diri dan menjelaskan prosedur',
        D: 'Melaporkan akun tersebut ke atasan',
        E: 'Memblokir akun yang memberikan kritik',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Jam pelayanan telah berakhir, namun masih ada satu orang warga yang belum dilayani. Tindakan Anda adalah...',
      options: {
        A: 'Meminta warga untuk datang kembali besok',
        B: 'Tetap melayani hingga selesai karena warga sudah menunggu',
        C: 'Memberikan nomor antrian untuk esok hari',
        D: 'Menyuruh warga komplain ke atasan',
        E: 'Menutup loket sesuai jam kerja',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mendapati ada kesalahan data pada dokumen yang sudah diterbitkan atas nama warga. Tindakan Anda adalah...',
      options: {
        A: 'Menunggu warga komplain terlebih dahulu',
        B: 'Segera menghubungi warga dan memperbaiki kesalahan',
        C: 'Melaporkan ke atasan tanpa mengambil tindakan',
        D: 'Menyalahkan petugas input data',
        E: 'Membiarkan saja karena kesalahan kecil',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Seorang warga meminta untuk didahulukan karena memiliki keperluan mendesak, padahal antrian sudah panjang. Sikap Anda adalah...',
      options: {
        A: 'Langsung mendahulukannya karena ada keperluan mendesak',
        B: 'Menolak dengan tegas karena harus antri',
        C: 'Memverifikasi urgensi dan menjelaskan prosedur dengan sopan',
        D: 'Meminta warga lain untuk mengizinkan',
        E: 'Menyuruhnya menghubungi atasan untuk izin khusus',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mengetahui bahwa sistem pelayanan di kantor dapat diperbaiki menjadi lebih efisien. Tindakan Anda adalah...',
      options: {
        A: 'Diam saja karena bukan tugas Anda',
        B: 'Menyampaikan usulan perbaikan kepada atasan secara tertulis',
        C: 'Mengubah sistem sendiri tanpa izin',
        D: 'Menunggu atasan menyadari sendiri',
        E: 'Membicarakan dengan rekan kerja tanpa tindak lanjut',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TKP - PROFESIONALISME (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Anda diminta mengerjakan tugas yang sebenarnya bukan tanggung jawab Anda karena rekan kerja sedang cuti. Sikap Anda adalah...',
      options: {
        A: 'Menolak karena bukan job description Anda',
        B: 'Menerima dengan syarat mendapat kompensasi',
        C: 'Menerima dan mengerjakannya dengan profesional',
        D: 'Menerima tapi mengerjakannya setengah hati',
        E: 'Meminta atasan mencari orang lain',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mendapat tugas dengan deadline yang sangat ketat dan tidak realistis. Tindakan Anda adalah...',
      options: {
        A: 'Menolak mengerjakan tugas tersebut',
        B: 'Menerima dan bekerja keras menyelesaikannya',
        C: 'Menerima sambil menyampaikan kendala dan meminta perpanjangan',
        D: 'Menerima tapi mengerjakan seadanya',
        E: 'Meminta tugas dipindahkan ke rekan lain',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda menemukan kesalahan fatal pada pekerjaan yang sudah Anda serahkan ke atasan. Tindakan Anda adalah...',
      options: {
        A: 'Berharap atasan tidak menyadari',
        B: 'Segera melapor dan memperbaiki kesalahan',
        C: 'Menyalahkan sistem atau data yang salah',
        D: 'Menunggu atasan komplain terlebih dahulu',
        E: 'Menutupi kesalahan dengan dokumen baru',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Saat mengikuti rapat, ada ide Anda yang diklaim oleh rekan kerja sebagai idenya. Sikap Anda adalah...',
      options: {
        A: 'Menegur langsung di depan peserta rapat',
        B: 'Diam saja demi menjaga harmoni',
        C: 'Mengklarifikasi dengan sopan bahwa itu ide Anda',
        D: 'Melaporkan ke atasan setelah rapat',
        E: 'Membahas dengan rekan tersebut secara pribadi setelah rapat',
      },
      correctAnswer: 'E',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mendapat promosi jabatan sedangkan rekan yang lebih senior tidak. Sikap Anda adalah...',
      options: {
        A: 'Merasa bangga dan menunjukkannya kepada semua orang',
        B: 'Menjaga hubungan baik dan tetap rendah hati',
        C: 'Menghindari rekan senior tersebut',
        D: 'Merayakan dengan pesta bersama teman-teman',
        E: 'Meminta maaf kepada rekan senior',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda diminta untuk melatih pegawai baru padahal beban kerja Anda sudah banyak. Sikap Anda adalah...',
      options: {
        A: 'Menolak dengan alasan kesibukan',
        B: 'Menerima dan mengatur waktu dengan baik',
        C: 'Menerima tapi melatihnya secara tidak serius',
        D: 'Mendelegasikan ke rekan lain',
        E: 'Meminta kompensasi tambahan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mengetahui informasi rahasia kantor yang jika dibocorkan bisa menguntungkan Anda secara pribadi. Tindakan Anda adalah...',
      options: {
        A: 'Memanfaatkan untuk keuntungan pribadi',
        B: 'Menjaga kerahasiaan informasi tersebut',
        C: 'Berbagi dengan rekan dekat saja',
        D: 'Menjualnya kepada pihak yang berkepentingan',
        E: 'Menyimpan untuk digunakan di kemudian hari',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda ditugaskan ke daerah terpencil yang jauh dari keluarga. Sikap Anda adalah...',
      options: {
        A: 'Menolak penugasan tersebut',
        B: 'Menerima sebagai bentuk pengabdian dan profesionalisme',
        C: 'Menerima dengan syarat waktu terbatas',
        D: 'Minta diganti orang lain',
        E: 'Menerima tapi mengajukan keluhan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TKP - KERJASAMA TIM (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Dalam tim kerja, ada rekan yang selalu tidak menyelesaikan tugasnya tepat waktu sehingga menghambat pekerjaan tim. Tindakan Anda adalah...',
      options: {
        A: 'Melaporkan langsung ke atasan',
        B: 'Mengerjakan bagiannya tanpa sepengetahuannya',
        C: 'Mengajak diskusi untuk mencari solusi bersama',
        D: 'Mengabaikan dan fokus pada tugas sendiri',
        E: 'Menegur dengan keras di depan tim',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Tim Anda mendapat target yang sangat berat dan beberapa anggota mulai pesimis. Sebagai anggota tim, Anda akan...',
      options: {
        A: 'Ikut pesimis karena memang target tidak realistis',
        B: 'Memberikan motivasi dan mengajak fokus pada solusi',
        C: 'Diam saja dan mengerjakan bagian sendiri',
        D: 'Komplain ke manajemen tentang target',
        E: 'Menyarankan target diturunkan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Ada konflik antara dua rekan kerja dalam tim Anda yang mempengaruhi kinerja tim. Tindakan Anda adalah...',
      options: {
        A: 'Membiarkan mereka menyelesaikan sendiri',
        B: 'Memihak salah satu yang menurut Anda benar',
        C: 'Mencoba menjadi mediator yang netral',
        D: 'Langsung melaporkan ke atasan',
        E: 'Menghindari keduanya agar tidak terlibat',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda memiliki ide yang berbeda dengan keputusan mayoritas tim. Sikap Anda adalah...',
      options: {
        A: 'Tetap menjalankan ide sendiri',
        B: 'Menyampaikan pendapat lalu mengikuti keputusan bersama',
        C: 'Diam saja dan mengikuti mayoritas',
        D: 'Abstain dari keputusan tersebut',
        E: 'Keluar dari tim',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Tim Anda berhasil mencapai target dengan sangat baik. Saat menerima penghargaan, sikap Anda adalah...',
      options: {
        A: 'Mengklaim sebagai kontributor utama',
        B: 'Memberikan apresiasi kepada seluruh anggota tim',
        C: 'Merendah dan mengatakan ini keberuntungan',
        D: 'Menyebutkan nama-nama yang paling berkontribusi',
        E: 'Menerima dengan biasa saja',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Rekan tim meminta bantuan untuk tugasnya padahal Anda juga sedang sibuk. Sikap Anda adalah...',
      options: {
        A: 'Menolak dengan tegas',
        B: 'Membantu setelah pekerjaan sendiri selesai',
        C: 'Membantu sekaligus berbagi beban secara proporsional',
        D: 'Menyuruh dia minta tolong orang lain',
        E: 'Membantu tapi mengeluh',
      },
      correctAnswer: 'C',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda ditunjuk menjadi ketua tim untuk proyek penting. Langkah pertama yang Anda lakukan adalah...',
      options: {
        A: 'Membagi tugas sesuai keinginan Anda',
        B: 'Mengadakan diskusi untuk memahami kapasitas setiap anggota',
        C: 'Membuat jadwal ketat dan meminta semua mengikuti',
        D: 'Mengerjakan bagian terpenting sendiri',
        E: 'Menunggu instruksi dari atasan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Tim gagal mencapai target karena ada anggota yang tidak perform. Sebagai ketua tim, Anda akan...',
      options: {
        A: 'Melaporkan anggota tersebut ke atasan',
        B: 'Mengambil tanggung jawab sebagai ketua',
        C: 'Menyalahkan anggota tersebut di depan tim',
        D: 'Mengevaluasi bersama dan mencari solusi untuk kedepan',
        E: 'Meminta anggota tersebut dikeluarkan dari tim',
      },
      correctAnswer: 'D',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TKP - INTEGRITAS (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Anda ditawari sejumlah uang oleh pihak yang mengurus dokumen untuk mempercepat prosesnya. Tindakan Anda adalah...',
      options: {
        A: 'Menerima karena ini hal biasa',
        B: 'Menolak dengan tegas dan menjelaskan prosedur yang benar',
        C: 'Menerima tapi tetap mengikuti prosedur normal',
        D: 'Menerima untuk menjaga hubungan baik',
        E: 'Menolak tapi memberikan alternatif orang lain',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mengetahui rekan kerja melakukan kecurangan dalam pengadaan barang. Tindakan Anda adalah...',
      options: {
        A: 'Diam saja karena bukan urusan Anda',
        B: 'Melaporkan melalui jalur yang tepat',
        C: 'Membicarakan dengan rekan tersebut secara pribadi',
        D: 'Menyebarkan informasi ke rekan-rekan lain',
        E: 'Meminta bagian dari kecurangan tersebut',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Atasan meminta Anda untuk memanipulasi data laporan agar terlihat lebih baik. Sikap Anda adalah...',
      options: {
        A: 'Mengikuti perintah atasan',
        B: 'Menolak dengan sopan dan menjelaskan konsekuensinya',
        C: 'Melakukan sedikit penyesuaian saja',
        D: 'Mengikuti sambil menyimpan bukti',
        E: 'Mengerjakan tapi tidak menandatangani',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda tidak sengaja merusak fasilitas kantor dan tidak ada yang melihat. Tindakan Anda adalah...',
      options: {
        A: 'Diam saja karena tidak ada yang tahu',
        B: 'Melapor dan bertanggung jawab atas kerusakan',
        C: 'Memperbaiki sendiri tanpa melapor',
        D: 'Menyalahkan kondisi fasilitas yang sudah usang',
        E: 'Menunggu sampai ada yang menyadari',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda menemukan dompet berisi uang banyak di toilet kantor. Tindakan Anda adalah...',
      options: {
        A: 'Mengambil uangnya dan membuang dompetnya',
        B: 'Menyerahkan ke bagian keamanan atau umum',
        C: 'Mengumumkan di grup chat kantor',
        D: 'Menyimpan untuk mencari pemiliknya sendiri',
        E: 'Membiarkan di tempat ditemukan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda diminta menandatangani dokumen yang isinya tidak Anda pahami sepenuhnya. Tindakan Anda adalah...',
      options: {
        A: 'Langsung menandatangani karena sudah diminta',
        B: 'Membaca dan memahami terlebih dahulu sebelum menandatangani',
        C: 'Menandatangani tapi tidak mencantumkan tanggal',
        D: 'Meminta orang lain yang menandatangani',
        E: 'Menandatangani dengan catatan keberatan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mendapat fasilitas kantor yang bisa digunakan untuk kepentingan pribadi tanpa ketahuan. Sikap Anda adalah...',
      options: {
        A: 'Menggunakannya karena tidak ada yang tahu',
        B: 'Tidak menggunakannya untuk kepentingan pribadi',
        C: 'Menggunakan sesekali saja',
        D: 'Menggunakan tapi mengganti biayanya',
        E: 'Menggunakan karena sudah umum dilakukan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda menyadari telah memberikan informasi yang salah kepada warga tadi pagi. Tindakan Anda adalah...',
      options: {
        A: 'Berharap warga tidak menyadari',
        B: 'Menghubungi warga untuk memberikan informasi yang benar',
        C: 'Menunggu warga komplain dulu',
        D: 'Menyalahkan sistem informasi yang kurang jelas',
        E: 'Melaporkan ke atasan tanpa menghubungi warga',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },

    // ═══════════════════════════════════════════════════════════════════════
    // TKP - SOSIAL BUDAYA (8 Soal)
    // ═══════════════════════════════════════════════════════════════════════
    {
      content: 'Di kantor Anda terdapat keberagaman suku dan agama. Saat ada perayaan hari besar keagamaan rekan yang berbeda agama, sikap Anda adalah...',
      options: {
        A: 'Mengabaikan karena bukan hari besar agama Anda',
        B: 'Memberikan ucapan selamat dan menghormati perayaan mereka',
        C: 'Hanya mengucapkan selamat kepada yang dekat saja',
        D: 'Ikut merayakan meski berbeda agama',
        E: 'Mengkritik perayaan yang berlebihan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda ditugaskan bekerja sama dengan rekan dari suku yang berbeda dan memiliki budaya kerja yang berbeda. Sikap Anda adalah...',
      options: {
        A: 'Meminta diganti dengan rekan dari suku yang sama',
        B: 'Beradaptasi dan menghargai perbedaan budaya kerja',
        C: 'Memaksa rekan mengikuti cara kerja Anda',
        D: 'Bekerja sendiri tanpa melibatkannya',
        E: 'Komplain ke atasan tentang perbedaan tersebut',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Ada rekan kerja yang memiliki keterbatasan fisik dan kesulitan mengakses fasilitas kantor. Tindakan Anda adalah...',
      options: {
        A: 'Membiarkan saja karena ada petugas khusus',
        B: 'Membantu dan mengusulkan perbaikan aksesibilitas',
        C: 'Menghindari karena tidak nyaman',
        D: 'Menyarankan dia pindah ke bagian lain',
        E: 'Hanya membantu jika diminta',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda mendengar rekan membuat candaan yang menyinggung suku tertentu. Sikap Anda adalah...',
      options: {
        A: 'Ikut tertawa agar tidak dikucilkan',
        B: 'Menegur dengan sopan bahwa candaan tersebut tidak pantas',
        C: 'Diam saja tapi tidak ikut tertawa',
        D: 'Melaporkan ke bagian SDM',
        E: 'Membalas dengan candaan tentang suku rekan tersebut',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Kantor mengadakan kegiatan sosial di akhir pekan. Anda memiliki rencana pribadi. Sikap Anda adalah...',
      options: {
        A: 'Tidak mengikuti karena ada rencana pribadi',
        B: 'Mengikuti sebagai bentuk solidaritas dan kebersamaan',
        C: 'Mengikuti tapi pulang lebih awal',
        D: 'Mengirim perwakilan keluarga',
        E: 'Menolak dengan alasan kesehatan',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda ditempatkan di daerah dengan budaya dan bahasa yang sangat berbeda. Langkah Anda adalah...',
      options: {
        A: 'Meminta pindah ke daerah yang lebih familiar',
        B: 'Belajar budaya dan bahasa setempat untuk beradaptasi',
        C: 'Tetap menggunakan cara dan bahasa sendiri',
        D: 'Hanya bergaul dengan orang dari daerah asal',
        E: 'Menghindari interaksi dengan masyarakat setempat',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Ada tradisi masyarakat setempat yang menurut Anda tidak efisien dalam pelayanan publik. Sikap Anda adalah...',
      options: {
        A: 'Langsung mengubah cara pelayanan',
        B: 'Menghargai tradisi sambil perlahan memperkenalkan efisiensi',
        C: 'Mengabaikan tradisi dan fokus pada efisiensi',
        D: 'Mengikuti tradisi sepenuhnya',
        E: 'Komplain ke pusat tentang tradisi tersebut',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
    {
      content: 'Anda melihat ada diskriminasi terhadap rekan kerja berdasarkan latar belakang sosial ekonomi. Tindakan Anda adalah...',
      options: {
        A: 'Diam saja karena bukan urusan Anda',
        B: 'Menegur pelaku dan membela yang didiskriminasi',
        C: 'Ikut menjaga jarak dari rekan tersebut',
        D: 'Melaporkan tanpa membela langsung',
        E: 'Membicarakan di belakang',
      },
      correctAnswer: 'B',
      questionType: QuestionType.TKP,
      defaultScore: 5,
    },
  ];
}

// ============================================================================
// SEED: QUESTIONS
// ============================================================================

async function seedQuestions() {
  logSection('MEMBUAT BANK SOAL CPNS');

  const tiuQuestions = getTIUQuestions();
  const twkQuestions = getTWKQuestions();
  const tkpQuestions = getTKPQuestions();

  logSubSection(`TES INTELEGENSIA UMUM (TIU) - ${tiuQuestions.length} Soal`);
  log('  • Sinonim: 5 soal');
  log('  • Antonim: 5 soal');
  log('  • Analogi: 5 soal');
  log('  • Deret Angka: 5 soal');
  log('  • Aritmatika: 5 soal');
  log('  • Logika Figural: 5 soal');
  log('  • Penalaran Logis: 5 soal');

  logSubSection(`TES WAWASAN KEBANGSAAN (TWK) - ${twkQuestions.length} Soal`);
  log('  • Pancasila: 8 soal');
  log('  • UUD 1945 & Konstitusi: 8 soal');
  log('  • Sejarah Nasional: 8 soal');
  log('  • NKRI & Pemerintahan: 6 soal');
  log('  • Bahasa Indonesia: 5 soal');

  logSubSection(`TES KARAKTERISTIK PRIBADI (TKP) - ${tkpQuestions.length} Soal`);
  log('  • Pelayanan Publik: 8 soal');
  log('  • Profesionalisme: 8 soal');
  log('  • Kerjasama Tim: 8 soal');
  log('  • Integritas: 8 soal');
  log('  • Sosial Budaya: 8 soal');

  const allQuestions = [...tiuQuestions, ...twkQuestions, ...tkpQuestions];

  const createdQuestions = [];
  for (const q of allQuestions) {
    const question = await prisma.questionBank.create({
      data: q,
    });
    createdQuestions.push(question);
  }

  log(`\n✅ Total ${createdQuestions.length} soal berhasil dibuat`);

  return createdQuestions;
}

// ============================================================================
// SEED: EXAMS - PAKET TRYOUT PROFESIONAL
// ============================================================================

async function seedExams(adminId: number) {
  logSection('MEMBUAT PAKET TRYOUT');

  const allQuestions = await prisma.questionBank.findMany({
    orderBy: [{ questionType: 'asc' }, { id: 'asc' }],
  });

  const tiuQuestions = allQuestions.filter((q) => q.questionType === 'TIU');
  const twkQuestions = allQuestions.filter((q) => q.questionType === 'TWK');
  const tkpQuestions = allQuestions.filter((q) => q.questionType === 'TKP');

  // ═══════════════════════════════════════════════════════════════════════════
  // PAKET 1: TRYOUT GRATIS - Perkenalan
  // ═══════════════════════════════════════════════════════════════════════════
  logSubSection('Paket 1: Tryout Gratis');

  const examFree = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Paket Perkenalan (GRATIS)',
      description: `🎯 Paket tryout GRATIS untuk memperkenalkan sistem ujian CPNS online kami.

📋 KONTEN UJIAN:
• 10 Soal TIU (Tes Intelegensia Umum)
• 10 Soal TWK (Tes Wawasan Kebangsaan)
• 10 Soal TKP (Tes Karakteristik Pribadi)

⏱️ DURASI: 45 Menit
🔄 PERCOBAAN: Dapat diulang hingga 3 kali
📊 PASSING GRADE: Mengikuti standar SKD CPNS 2024

Cocok untuk:
✓ Peserta yang baru pertama kali mencoba
✓ Mengenal format dan tipe soal CPNS
✓ Latihan dasar tanpa tekanan`,
      durationMinutes: 45,
      passingScore: PASSING_GRADE.TOTAL,
      allowRetake: true,
      maxAttempts: 3,
      price: null, // GRATIS
      startTime: relativeDate({ days: -30 }),
      endTime: relativeDate({ days: 90 }),
      createdBy: adminId,
    },
  });

  // Assign 30 questions (10 TIU + 10 TWK + 10 TKP)
  const freeQuestions = [
    ...tiuQuestions.slice(0, 10),
    ...twkQuestions.slice(0, 10),
    ...tkpQuestions.slice(0, 10),
  ];

  for (let i = 0; i < freeQuestions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: examFree.id,
        questionId: freeQuestions[i].id,
        orderNumber: i + 1,
      },
    });
  }

  log(`  ✓ "${examFree.title}"`);
  log(`    • Harga: 🆓 GRATIS`);
  log(`    • Soal: ${freeQuestions.length} soal (10 TIU + 10 TWK + 10 TKP)`);
  log(`    • Durasi: ${examFree.durationMinutes} menit`);
  log(`    • Percobaan: Maks ${examFree.maxAttempts}x`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAKET 2: TRYOUT BASIC
  // ═══════════════════════════════════════════════════════════════════════════
  logSubSection('Paket 2: Tryout Basic');

  const examBasic = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Paket Basic',
      description: `💼 Paket tryout ekonomis dengan soal standar SKD CPNS.

📋 KONTEN UJIAN:
• 20 Soal TIU (Tes Intelegensia Umum)
• 20 Soal TWK (Tes Wawasan Kebangsaan)  
• 25 Soal TKP (Tes Karakteristik Pribadi)

⏱️ DURASI: 90 Menit
🔄 PERCOBAAN: Dapat diulang hingga 2 kali
📊 PASSING GRADE: Mengikuti standar SKD CPNS 2024

FITUR:
✓ Soal berkualitas standar CPNS
✓ Pembahasan singkat
✓ Sertifikat digital`,
      durationMinutes: 90,
      passingScore: PASSING_GRADE.TOTAL,
      allowRetake: true,
      maxAttempts: 2,
      price: 25000, // Rp 25.000
      startTime: relativeDate({ days: -30 }),
      endTime: relativeDate({ days: 90 }),
      createdBy: adminId,
    },
  });

  // Assign 65 questions
  const basicQuestions = [
    ...tiuQuestions.slice(0, 20),
    ...twkQuestions.slice(0, 20),
    ...tkpQuestions.slice(0, 25),
  ];

  for (let i = 0; i < basicQuestions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: examBasic.id,
        questionId: basicQuestions[i].id,
        orderNumber: i + 1,
      },
    });
  }

  log(`  ✓ "${examBasic.title}"`);
  log(`    • Harga: ${formatIDR(examBasic.price!)}`);
  log(`    • Soal: ${basicQuestions.length} soal (20 TIU + 20 TWK + 25 TKP)`);
  log(`    • Durasi: ${examBasic.durationMinutes} menit`);
  log(`    • Percobaan: Maks ${examBasic.maxAttempts}x`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAKET 3: TRYOUT PREMIUM
  // ═══════════════════════════════════════════════════════════════════════════
  logSubSection('Paket 3: Tryout Premium');

  const examPremium = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Paket Premium',
      description: `⭐ Paket tryout premium dengan simulasi lengkap seperti ujian CPNS sesungguhnya.

📋 KONTEN UJIAN:
• 35 Soal TIU (Tes Intelegensia Umum) - 175 Poin
• 30 Soal TWK (Tes Wawasan Kebangsaan) - 150 Poin
• 45 Soal TKP (Tes Karakteristik Pribadi) - 225 Poin

⏱️ DURASI: 100 Menit (Standar SKD CPNS)
🔄 PERCOBAAN: Dapat diulang hingga 3 kali
📊 PASSING GRADE:
   • TIU: Min 80 poin
   • TKP: Min 166 poin
   • TWK: Min 65 poin
   • Total: Min 311 poin

FITUR PREMIUM:
✓ Soal setara ujian CPNS sesungguhnya
✓ AI Proctoring untuk deteksi kecurangan
✓ Pembahasan lengkap setiap soal
✓ Analisis kekuatan & kelemahan
✓ Sertifikat digital dengan QR Code
✓ Ranking nasional`,
      durationMinutes: 100,
      passingScore: PASSING_GRADE.TOTAL,
      allowRetake: true,
      maxAttempts: 3,
      price: 75000, // Rp 75.000
      startTime: relativeDate({ days: -30 }),
      endTime: relativeDate({ days: 90 }),
      createdBy: adminId,
    },
  });

  // Assign ALL questions (110)
  const premiumQuestions = [...tiuQuestions, ...twkQuestions, ...tkpQuestions];

  for (let i = 0; i < premiumQuestions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: examPremium.id,
        questionId: premiumQuestions[i].id,
        orderNumber: i + 1,
      },
    });
  }

  log(`  ✓ "${examPremium.title}"`);
  log(`    • Harga: ${formatIDR(examPremium.price!)}`);
  log(`    • Soal: ${premiumQuestions.length} soal (35 TIU + 35 TWK + 40 TKP)`);
  log(`    • Durasi: ${examPremium.durationMinutes} menit`);
  log(`    • Percobaan: Maks ${examPremium.maxAttempts}x`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAKET 4: TRYOUT INTENSIF TIU
  // ═══════════════════════════════════════════════════════════════════════════
  logSubSection('Paket 4: Tryout Intensif TIU');

  const examTIU = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Intensif TIU',
      description: `🧠 Paket khusus untuk latihan intensif Tes Intelegensia Umum (TIU).

📋 KONTEN UJIAN:
• 35 Soal TIU dengan tingkat kesulitan bervariasi
  - Sinonim & Antonim
  - Analogi Verbal
  - Deret Angka & Aritmatika
  - Logika Figural
  - Penalaran Analitis

⏱️ DURASI: 50 Menit
🔄 PERCOBAAN: Dapat diulang hingga 5 kali
📊 TARGET: Min 80 poin dari 175 poin

KEUNGGULAN:
✓ Fokus pendalaman materi TIU
✓ Variasi soal dari mudah hingga sulit
✓ Strategi menjawab soal TIU
✓ Drilling untuk meningkatkan kecepatan`,
      durationMinutes: 50,
      passingScore: PASSING_GRADE.TIU,
      allowRetake: true,
      maxAttempts: 5,
      price: 35000, // Rp 35.000
      startTime: relativeDate({ days: -30 }),
      endTime: relativeDate({ days: 90 }),
      createdBy: adminId,
    },
  });

  for (let i = 0; i < tiuQuestions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: examTIU.id,
        questionId: tiuQuestions[i].id,
        orderNumber: i + 1,
      },
    });
  }

  log(`  ✓ "${examTIU.title}"`);
  log(`    • Harga: ${formatIDR(examTIU.price!)}`);
  log(`    • Soal: ${tiuQuestions.length} soal TIU`);
  log(`    • Durasi: ${examTIU.durationMinutes} menit`);
  log(`    • Percobaan: Maks ${examTIU.maxAttempts}x`);

  // ═══════════════════════════════════════════════════════════════════════════
  // PAKET 5: TRYOUT SIMULASI NASIONAL
  // ═══════════════════════════════════════════════════════════════════════════
  logSubSection('Paket 5: Simulasi Nasional');

  const examNasional = await prisma.exam.create({
    data: {
      title: 'Tryout CPNS 2025 - Simulasi Nasional Februari',
      description: `🏆 TRYOUT SIMULASI NASIONAL SERENTAK

📅 Periode: Februari 2025
👥 Peserta: Ribuan peserta dari seluruh Indonesia

📋 KONTEN UJIAN (Standar SKD CPNS 2024):
• 35 Soal TIU - Maks 175 Poin
• 30 Soal TWK - Maks 150 Poin  
• 45 Soal TKP - Maks 225 Poin

⏱️ DURASI: 100 Menit (Standar BKN)
🔄 PERCOBAAN: 1 KALI SAJA (Seperti ujian sesungguhnya)
📊 PASSING GRADE SKD 2024:
   • TIU: Min 80
   • TKP: Min 166
   • TWK: Min 65

🎖️ KEUNTUNGAN:
✓ Simulasi 100% seperti ujian CPNS asli
✓ Ranking nasional real-time
✓ Sertifikat dengan peringkat
✓ AI Proctoring aktif
✓ Analisis perbandingan dengan peserta lain
✓ Prediksi peluang kelulusan`,
      durationMinutes: 100,
      passingScore: PASSING_GRADE.TOTAL,
      allowRetake: false, // Hanya 1x seperti ujian asli
      maxAttempts: 1,
      price: 50000, // Rp 50.000
      startTime: relativeDate({ days: 0 }), // Mulai hari ini
      endTime: relativeDate({ days: 30 }), // Berlaku 1 bulan
      createdBy: adminId,
    },
  });

  // Assign all questions for national simulation
  const nasionalQuestions = [...tiuQuestions, ...twkQuestions, ...tkpQuestions];

  for (let i = 0; i < nasionalQuestions.length; i++) {
    await prisma.examQuestion.create({
      data: {
        examId: examNasional.id,
        questionId: nasionalQuestions[i].id,
        orderNumber: i + 1,
      },
    });
  }

  log(`  ✓ "${examNasional.title}"`);
  log(`    • Harga: ${formatIDR(examNasional.price!)}`);
  log(`    • Soal: ${nasionalQuestions.length} soal (35 TIU + 35 TWK + 40 TKP)`);
  log(`    • Durasi: ${examNasional.durationMinutes} menit`);
  log(`    • Percobaan: ${examNasional.maxAttempts}x (simulasi ujian asli)`);

  return {
    examFree,
    examBasic,
    examPremium,
    examTIU,
    examNasional,
  };
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                      ║');
  console.log('║   🎓 TRYOUT CPNS ONLINE - PROFESSIONAL SEED v6.0.0                   ║');
  console.log('║                                                                      ║');
  console.log('║   Thesis Project: Universitas Atma Jaya Yogyakarta                   ║');
  console.log('║   Student: I Gede Bala Putra                                         ║');
  console.log('║                                                                      ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  try {
    // Step 1: Clean database
    await cleanDatabase();

    // Step 2: Create users
    const { admin, participants } = await seedUsers();

    // Step 3: Create question bank
    await seedQuestions();

    // Step 4: Create exam packages
    const exams = await seedExams(admin.id);

    // =========================================================================
    // SUMMARY
    // =========================================================================
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════════════════════╗');
    console.log('║                     ✅ SEEDING BERHASIL!                              ║');
    console.log('╚══════════════════════════════════════════════════════════════════════╝');

    console.log('\n📋 KREDENSIAL AKUN:');
    console.log('═'.repeat(70));
    console.log('\n🔐 ADMIN:');
    console.log(`   Email    : ${TEST_CREDENTIALS.admin.email}`);
    console.log(`   Password : ${TEST_CREDENTIALS.admin.password}`);

    console.log('\n👥 PESERTA:');
    TEST_CREDENTIALS.participants.forEach((p, i) => {
      console.log(`   ${i + 1}. ${p.name}`);
      console.log(`      Email    : ${p.email}`);
      console.log(`      Password : ${p.password}`);
      console.log('');
    });

    console.log('═'.repeat(70));

    console.log('\n📊 RINGKASAN DATA:');
    console.log('═'.repeat(70));
    console.log(`   Pengguna         : 6 (1 admin + 5 peserta)`);
    console.log(`   Bank Soal        : 110 soal`);
    console.log(`     ├─ TIU         : 35 soal (Sinonim, Antonim, Analogi, Deret, dll)`);
    console.log(`     ├─ TWK         : 35 soal (Pancasila, UUD, Sejarah, NKRI, dll)`);
    console.log(`     └─ TKP         : 40 soal (Pelayanan, Profesionalisme, Integritas, dll)`);
    console.log(`   Paket Tryout     : 5 paket`);
    console.log('═'.repeat(70));

    console.log('\n📦 DAFTAR PAKET TRYOUT:');
    console.log('═'.repeat(70));
    console.log(`   1. ${exams.examFree.title}`);
    console.log(`      💰 GRATIS | ⏱️ 45 menit | 📝 30 soal | 🔄 3x percobaan`);
    console.log('');
    console.log(`   2. ${exams.examBasic.title}`);
    console.log(`      💰 ${formatIDR(exams.examBasic.price!)} | ⏱️ 90 menit | 📝 65 soal | 🔄 2x percobaan`);
    console.log('');
    console.log(`   3. ${exams.examPremium.title}`);
    console.log(`      💰 ${formatIDR(exams.examPremium.price!)} | ⏱️ 100 menit | 📝 110 soal | 🔄 3x percobaan`);
    console.log('');
    console.log(`   4. ${exams.examTIU.title}`);
    console.log(`      💰 ${formatIDR(exams.examTIU.price!)} | ⏱️ 50 menit | 📝 35 soal TIU | 🔄 5x percobaan`);
    console.log('');
    console.log(`   5. ${exams.examNasional.title}`);
    console.log(`      💰 ${formatIDR(exams.examNasional.price!)} | ⏱️ 100 menit | 📝 110 soal | 🔄 1x (simulasi)`);
    console.log('═'.repeat(70));

    console.log('\n📚 PASSING GRADE SKD CPNS 2024:');
    console.log('═'.repeat(70));
    console.log(`   TIU (Tes Intelegensia Umum)      : Min ${PASSING_GRADE.TIU} dari 175 poin`);
    console.log(`   TKP (Tes Karakteristik Pribadi)  : Min ${PASSING_GRADE.TKP} dari 225 poin`);
    console.log(`   TWK (Tes Wawasan Kebangsaan)     : Min ${PASSING_GRADE.TWK} dari 150 poin`);
    console.log(`   TOTAL KUMULATIF                  : Min ${PASSING_GRADE.TOTAL} poin`);
    console.log('═'.repeat(70));

    console.log('\n💳 MIDTRANS SANDBOX TEST CARDS:');
    console.log('═'.repeat(70));
    console.log('   Credit Card (Success):');
    console.log('     Card Number : 4811 1111 1111 1114');
    console.log('     Expiry      : Any future date (01/28)');
    console.log('     CVV         : 123');
    console.log('     OTP         : 112233');
    console.log('');
    console.log('   Bank Transfer:');
    console.log('     → Pilih BCA/BNI/BRI/Mandiri');
    console.log('     → Gunakan Midtrans Simulator untuk konfirmasi');
    console.log('═'.repeat(70));

    console.log('\n🔧 PERINTAH:');
    console.log('═'.repeat(70));
    console.log('   Reset & Reseed : pnpm prisma migrate reset');
    console.log('   Seed Only      : pnpm tsx prisma/seed.ts');
    console.log('   View Database  : pnpm prisma studio');
    console.log('═'.repeat(70));
    console.log('\n');

  } catch (error) {
    console.error('\n❌ SEEDING GAGAL:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();