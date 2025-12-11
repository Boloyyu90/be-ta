/**
 * Combined Seeder - Questions + Exams + Sample Users
 *
 * Seeds the complete test dataset for the CPNS Tryout System:
 * 1. Admin user
 * 2. Sample participant users
 * 3. Question bank (TWK, TIU, TKP)
 * 4. Exams with attached questions
 *
 * Usage: pnpm exec tsx prisma/seed-all.ts
 *
 * Individual seeders:
 * - Questions only: pnpm exec tsx prisma/seed.ts
 * - Exams only: pnpm exec tsx prisma/seed-exams.ts
 */

import { PrismaClient, QuestionType, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const SALT_ROUNDS = 10;

// Admin user
const ADMIN_USER = {
  name: 'Admin CPNS',
  email: 'admin@cpns-tryout.id',
  password: 'Admin123!',
  role: UserRole.ADMIN,
};

// Sample participants for testing
const SAMPLE_PARTICIPANTS = [
  {
    name: 'Budi Santoso',
    email: 'budi@example.com',
    password: 'Password123!',
  },
  {
    name: 'Siti Rahayu',
    email: 'siti@example.com',
    password: 'Password123!',
  },
  {
    name: 'Ahmad Fauzi',
    email: 'ahmad@example.com',
    password: 'Password123!',
  },
];

// ============================================================================
// QUESTION DATA
// ============================================================================

const SAMPLE_QUESTIONS = [
  // ==================== TWK Questions ====================
  {
    content: 'Pancasila sebagai dasar negara Indonesia ditetapkan pada tanggal?',
    options: {
      A: '17 Agustus 1945',
      B: '18 Agustus 1945',
      C: '1 Juni 1945',
      D: '22 Juni 1945',
      E: '1 Oktober 1945',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: QuestionType.TWK,
  },
  {
    content: 'Siapakah presiden pertama Republik Indonesia?',
    options: {
      A: 'Ir. Soekarno',
      B: 'Soeharto',
      C: 'B.J. Habibie',
      D: 'Megawati Soekarnoputri',
      E: 'Susilo Bambang Yudhoyono',
    },
    correctAnswer: 'A',
    defaultScore: 5,
    questionType: QuestionType.TWK,
  },
  {
    content: 'UUD 1945 disahkan oleh?',
    options: {
      A: 'BPUPKI',
      B: 'PPKI',
      C: 'MPR',
      D: 'DPR',
      E: 'Presiden',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: QuestionType.TWK,
  },
  {
    content: 'Lambang negara Indonesia adalah?',
    options: {
      A: 'Garuda Pancasila',
      B: 'Burung Cendrawasih',
      C: 'Harimau Sumatera',
      D: 'Komodo',
      E: 'Elang Jawa',
    },
    correctAnswer: 'A',
    defaultScore: 5,
    questionType: QuestionType.TWK,
  },
  {
    content: 'Ibukota Indonesia adalah?',
    options: {
      A: 'Bandung',
      B: 'Surabaya',
      C: 'Jakarta',
      D: 'Medan',
      E: 'Yogyakarta',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: QuestionType.TWK,
  },

  // ==================== TIU Questions ====================
  {
    content: 'Jika 3x + 5 = 20, maka nilai x adalah?',
    options: {
      A: '3',
      B: '5',
      C: '7',
      D: '10',
      E: '15',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: QuestionType.TIU,
  },
  {
    content: 'Berapakah hasil dari 15 x 8?',
    options: {
      A: '100',
      B: '110',
      C: '120',
      D: '130',
      E: '140',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: QuestionType.TIU,
  },
  {
    content: 'Jika A lebih tua dari B, dan B lebih tua dari C, maka?',
    options: {
      A: 'A lebih muda dari C',
      B: 'A sama usia dengan C',
      C: 'A lebih tua dari C',
      D: 'Tidak dapat ditentukan',
      E: 'B paling tua',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: QuestionType.TIU,
  },
  {
    content: 'Manakah yang merupakan bilangan prima?',
    options: {
      A: '12',
      B: '15',
      C: '17',
      D: '18',
      E: '20',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: QuestionType.TIU,
  },
  {
    content: 'Jika semua kucing adalah mamalia, dan semua mamalia adalah hewan, maka?',
    options: {
      A: 'Semua hewan adalah kucing',
      B: 'Semua kucing adalah hewan',
      C: 'Tidak ada kucing yang bukan mamalia',
      D: 'B dan C benar',
      E: 'Semua salah',
    },
    correctAnswer: 'D',
    defaultScore: 5,
    questionType: QuestionType.TIU,
  },

  // ==================== TKP Questions ====================
  {
    content:
      'Anda diminta lembur untuk menyelesaikan proyek penting, tetapi sudah ada janji dengan keluarga. Apa yang Anda lakukan?',
    options: {
      A: 'Langsung menolak tanpa memberikan alasan',
      B: 'Menerima lembur dan membatalkan janji dengan keluarga',
      C: 'Mencari solusi kompromi dengan atasan dan keluarga',
      D: 'Mengabaikan permintaan lembur',
      E: 'Menerima lembur tapi tidak datang',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: QuestionType.TKP,
  },
  {
    content: 'Rekan kerja Anda melakukan kesalahan yang merugikan tim. Sikap Anda?',
    options: {
      A: 'Langsung melaporkan ke atasan',
      B: 'Diam saja karena bukan urusan saya',
      C: 'Membantu mencari solusi dan memberi masukan konstruktif',
      D: 'Menyalahkan di depan tim',
      E: 'Meminta dia untuk mengundurkan diri',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: QuestionType.TKP,
  },
  {
    content: 'Anda diberi tugas yang tidak sesuai dengan keahlian Anda. Apa yang Anda lakukan?',
    options: {
      A: 'Menolak karena di luar kompetensi',
      B: 'Menerima dan belajar sambil mengerjakan',
      C: 'Meminta bantuan rekan yang lebih ahli',
      D: 'Menerima tapi mengerjakan seadanya',
      E: 'B dan C',
    },
    correctAnswer: 'E',
    defaultScore: 5,
    questionType: QuestionType.TKP,
  },
  {
    content: 'Atasan Anda memberikan target yang menurut Anda tidak realistis. Bagaimana respons Anda?',
    options: {
      A: 'Menerima tanpa bertanya',
      B: 'Menolak mentah-mentah',
      C: 'Mendiskusikan dan mengusulkan target yang lebih realistis dengan data',
      D: 'Menerima tapi tidak berusaha mencapai',
      E: 'Mengeluh ke rekan kerja',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: QuestionType.TKP,
  },
  {
    content: 'Anda menemukan kesalahan dalam laporan yang sudah disetujui atasan. Apa yang Anda lakukan?',
    options: {
      A: 'Diam saja karena sudah disetujui',
      B: 'Langsung memberitahu atasan dengan data yang benar',
      C: 'Menunggu sampai ada yang menyadari',
      D: 'Memperbaiki sendiri tanpa memberitahu',
      E: 'Menyalahkan yang membuat laporan',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: QuestionType.TKP,
  },
];

// ============================================================================
// EXAM DATA
// ============================================================================

function getDateWithOffset(daysOffset: number, hour: number, minute: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hour, minute, 0, 0);
  return date;
}

const SAMPLE_EXAMS = [
  {
    title: 'Simulasi CAT CPNS 2024 - Paket A',
    description:
      'Simulasi lengkap Computer Assisted Test (CAT) CPNS meliputi TWK, TIU, dan TKP. Paket ini dirancang untuk mempersiapkan peserta menghadapi seleksi CPNS dengan tingkat kesulitan sedang.',
    durationMinutes: 90,
    startTime: getDateWithOffset(1, 9, 0),
    endTime: getDateWithOffset(7, 17, 0),
    questionConfig: { TWK: 5, TIU: 5, TKP: 5 },
  },
  {
    title: 'Latihan Soal TWK - Wawasan Kebangsaan',
    description:
      'Latihan khusus untuk Tes Wawasan Kebangsaan (TWK). Materi mencakup Pancasila, UUD 1945, NKRI, dan Bhinneka Tunggal Ika.',
    durationMinutes: 30,
    startTime: getDateWithOffset(0, 0, 0),
    endTime: getDateWithOffset(30, 23, 59),
    questionConfig: { TWK: 5, TIU: 0, TKP: 0 },
  },
  {
    title: 'Latihan Soal TIU - Penalaran Logis',
    description:
      'Latihan Tes Intelegensia Umum (TIU) fokus pada penalaran logis, analitis, dan numerik.',
    durationMinutes: 30,
    startTime: getDateWithOffset(0, 0, 0),
    endTime: getDateWithOffset(30, 23, 59),
    questionConfig: { TWK: 0, TIU: 5, TKP: 0 },
  },
  {
    title: 'Latihan Soal TKP - Karakteristik Pribadi',
    description:
      'Latihan Tes Karakteristik Pribadi (TKP) untuk mengasah kemampuan dalam situasi kerja.',
    durationMinutes: 30,
    startTime: getDateWithOffset(0, 0, 0),
    endTime: getDateWithOffset(30, 23, 59),
    questionConfig: { TWK: 0, TIU: 0, TKP: 5 },
  },
  {
    title: 'Try Out CPNS - Paket Intensif',
    description:
      'Paket try out intensif dengan durasi penuh seperti ujian sebenarnya. Cocok untuk latihan final.',
    durationMinutes: 120,
    startTime: getDateWithOffset(2, 8, 0),
    endTime: getDateWithOffset(14, 18, 0),
    questionConfig: { TWK: 5, TIU: 5, TKP: 5 },
  },
  {
    title: 'Ujian Expired - Untuk Testing',
    description: 'Exam yang sudah melewati waktu end time. Digunakan untuk testing flow expired exam.',
    durationMinutes: 60,
    startTime: getDateWithOffset(-7, 9, 0),
    endTime: getDateWithOffset(-1, 17, 0),
    questionConfig: { TWK: 2, TIU: 2, TKP: 1 },
  },
  {
    title: 'Ujian Belum Mulai - Untuk Testing',
    description: 'Exam yang belum mencapai waktu start. Digunakan untuk testing flow upcoming exam.',
    durationMinutes: 60,
    startTime: getDateWithOffset(30, 9, 0),
    endTime: getDateWithOffset(37, 17, 0),
    questionConfig: { TWK: 2, TIU: 2, TKP: 1 },
  },
];

// ============================================================================
// SEEDER FUNCTIONS
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function seedUsers(): Promise<number> {
  console.log('\n👤 Seeding users...');

  // Create admin
  let adminId: number;
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_USER.email },
  });

  if (existingAdmin) {
    console.log(`   ⏭️  Admin already exists (ID: ${existingAdmin.id})`);
    adminId = existingAdmin.id;
  } else {
    const admin = await prisma.user.create({
      data: {
        name: ADMIN_USER.name,
        email: ADMIN_USER.email,
        password: await hashPassword(ADMIN_USER.password),
        role: ADMIN_USER.role,
        isEmailVerified: true,
      },
    });
    console.log(`   ✅ Created admin: ${admin.email}`);
    adminId = admin.id;
  }

  // Create participants
  for (const participant of SAMPLE_PARTICIPANTS) {
    const existing = await prisma.user.findUnique({
      where: { email: participant.email },
    });

    if (existing) {
      console.log(`   ⏭️  Participant exists: ${participant.email}`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: participant.name,
        email: participant.email,
        password: await hashPassword(participant.password),
        role: UserRole.PARTICIPANT,
        isEmailVerified: true,
      },
    });
    console.log(`   ✅ Created participant: ${participant.email}`);
  }

  return adminId;
}

async function seedQuestions(): Promise<Record<QuestionType, number[]>> {
  console.log('\n📚 Seeding questions...');

  const questionsByType: Record<QuestionType, number[]> = {
    TWK: [],
    TIU: [],
    TKP: [],
  };

  for (const q of SAMPLE_QUESTIONS) {
    // Check if question with same content exists
    const existing = await prisma.questionBank.findFirst({
      where: { content: q.content },
    });

    if (existing) {
      questionsByType[existing.questionType].push(existing.id);
      continue;
    }

    const created = await prisma.questionBank.create({
      data: q,
    });
    questionsByType[created.questionType].push(created.id);
  }

  console.log(`   ✅ Questions ready:`);
  console.log(`      - TWK: ${questionsByType.TWK.length}`);
  console.log(`      - TIU: ${questionsByType.TIU.length}`);
  console.log(`      - TKP: ${questionsByType.TKP.length}`);

  return questionsByType;
}

async function seedExams(
  adminId: number,
  questionsByType: Record<QuestionType, number[]>
): Promise<void> {
  console.log('\n📝 Seeding exams...');

  for (const examConfig of SAMPLE_EXAMS) {
    // Check if exam exists
    const existing = await prisma.exam.findFirst({
      where: { title: examConfig.title },
    });

    if (existing) {
      console.log(`   ⏭️  Exam exists: ${examConfig.title}`);
      continue;
    }

    // Collect question IDs
    const questionIds: number[] = [];
    for (const [type, count] of Object.entries(examConfig.questionConfig)) {
      const available = questionsByType[type as QuestionType];
      questionIds.push(...available.slice(0, count));
    }

    // Create exam with questions
    const exam = await prisma.$transaction(async (tx) => {
      const newExam = await tx.exam.create({
        data: {
          title: examConfig.title,
          description: examConfig.description,
          startTime: examConfig.startTime,
          endTime: examConfig.endTime,
          durationMinutes: examConfig.durationMinutes,
          createdBy: adminId,
        },
      });

      if (questionIds.length > 0) {
        await tx.examQuestion.createMany({
          data: questionIds.map((qId, idx) => ({
            examId: newExam.id,
            questionId: qId,
            orderNumber: idx + 1,
          })),
        });
      }

      return newExam;
    });

    console.log(`   ✅ Created exam: ${exam.title} (${questionIds.length} questions)`);
  }
}

async function displaySummary(): Promise<void> {
  console.log('\n' + '='.repeat(60));
  console.log('📊 DATABASE SUMMARY');
  console.log('='.repeat(60));

  const [users, questions, exams, examQuestions] = await Promise.all([
    prisma.user.count(),
    prisma.questionBank.count(),
    prisma.exam.count(),
    prisma.examQuestion.count(),
  ]);

  console.log(`\n   👤 Users: ${users}`);
  console.log(`   📚 Questions: ${questions}`);
  console.log(`   📝 Exams: ${exams}`);
  console.log(`   🔗 Exam-Question Links: ${examQuestions}`);

  console.log('\n📋 Test Credentials:');
  console.log('-'.repeat(60));
  console.log(`   Admin:       ${ADMIN_USER.email} / ${ADMIN_USER.password}`);
  console.log(`   Participant: ${SAMPLE_PARTICIPANTS[0].email} / ${SAMPLE_PARTICIPANTS[0].password}`);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🌱 COMBINED SEEDER - CPNS Tryout System');
  console.log('='.repeat(60));

  const adminId = await seedUsers();
  const questionsByType = await seedQuestions();
  await seedExams(adminId, questionsByType);
  await displaySummary();

  console.log('\n✅ All seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('\n❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { main as seedAll };