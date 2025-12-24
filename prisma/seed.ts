/**
 * Prisma Seed File - Prestige Academy CPNS Exam System
 *
 * This seed file creates comprehensive test data for all exam flows:
 * - 1 Admin + 3 Participants with known credentials
 * - 3 Exams (retakes allowed, no retakes, max attempts limited)
 * - 15+ Questions spanning TIU/TKP/TWK
 * - Multiple exam sessions covering all scenarios:
 *   - IN_PROGRESS (resume flow)
 *   - FINISHED (view results flow)
 *   - FINISHED with retakes allowed (retake flow)
 *   - FINISHED with retakes disabled (error flow)
 *   - Max attempts exhausted (error flow)
 *   - TIMEOUT (edge case)
 * - Proctoring events for demonstration
 *
 * IDEMPOTENT: Safe to run multiple times using upsert and deterministic lookups
 *
 * @author I Gede Bala Putra
 * @thesis Universitas Atma Jaya Yogyakarta
 */

import {
  PrismaClient,
  UserRole,
  QuestionType,
  ExamStatus,
  ProctoringEventType,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================

const SALT_ROUNDS = 10;

// Known test credentials - DOCUMENT THESE FOR TESTING
const TEST_CREDENTIALS = {
  admin: {
    email: 'admin@prestige.ac.id',
    password: 'Admin123!', // Meets: min 8, uppercase, lowercase, number
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

function getWrongOption(correctAnswer: string): string {
  const options = ['A', 'B', 'C', 'D', 'E'];
  const wrongOptions = options.filter((o) => o !== correctAnswer);
  return wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
}

// ============================================================================
// SEED: USERS
// ============================================================================

async function seedUsers() {
  log('Seeding users...');

  const adminPassword = await hashPassword(TEST_CREDENTIALS.admin.password);
  const participant1Password = await hashPassword(TEST_CREDENTIALS.participant1.password);
  const participant2Password = await hashPassword(TEST_CREDENTIALS.participant2.password);
  const participant3Password = await hashPassword(TEST_CREDENTIALS.participant3.password);

  // Admin user
  const admin = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.admin.email },
    update: {
      name: TEST_CREDENTIALS.admin.name,
      password: adminPassword,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    },
    create: {
      email: TEST_CREDENTIALS.admin.email,
      name: TEST_CREDENTIALS.admin.name,
      password: adminPassword,
      role: UserRole.ADMIN,
      isEmailVerified: true,
    },
  });

  // Participant 1 - will have:
  // - IN_PROGRESS session on Exam 1 (resume flow)
  // - FINISHED session on Exam 2 (retake disabled error)
  // - 2/2 attempts exhausted on Exam 3 (max attempts error)
  const participant1 = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.participant1.email },
    update: {
      name: TEST_CREDENTIALS.participant1.name,
      password: participant1Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
    create: {
      email: TEST_CREDENTIALS.participant1.email,
      name: TEST_CREDENTIALS.participant1.name,
      password: participant1Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  // Participant 2 - will have:
  // - FINISHED session on Exam 1 (can retake - "Ulangi Ujian" button)
  // - FINISHED session on Exam 2 (view results)
  // - TIMEOUT session for edge case
  const participant2 = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.participant2.email },
    update: {
      name: TEST_CREDENTIALS.participant2.name,
      password: participant2Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
    create: {
      email: TEST_CREDENTIALS.participant2.email,
      name: TEST_CREDENTIALS.participant2.name,
      password: participant2Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
  });

  // Participant 3 - Fresh user with NO exam history
  // Perfect for testing first-time exam flow ("Mulai Ujian")
  const participant3 = await prisma.user.upsert({
    where: { email: TEST_CREDENTIALS.participant3.email },
    update: {
      name: TEST_CREDENTIALS.participant3.name,
      password: participant3Password,
      role: UserRole.PARTICIPANT,
      isEmailVerified: true,
    },
    create: {
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
  log(`  ✓ Participant 3: ${participant3.email} (ID: ${participant3.id}) [FRESH - no exams]`);

  return { admin, participant1, participant2, participant3 };
}

// ============================================================================
// SEED: QUESTION BANK
// ============================================================================

async function seedQuestions() {
  log('Seeding question bank...');

  // TIU Questions (5) - Tes Intelegensia Umum
  const tiuQuestions = [
    {
      content: 'Jika 3x + 5 = 20, maka nilai x adalah...',
      options: { A: '3', B: '4', C: '5', D: '6', E: '7' },
      correctAnswer: 'C',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'Antonim dari kata "SEMENTARA" adalah...',
      options: { A: 'Sebentar', B: 'Permanen', C: 'Sesaat', D: 'Temporer', E: 'Singkat' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
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
      content: 'Deret angka: 2, 6, 12, 20, 30, ... Bilangan selanjutnya adalah...',
      options: { A: '40', B: '42', C: '44', D: '46', E: '48' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
    {
      content: 'KUCING : MEONG = ANJING : ...',
      options: { A: 'Menggonggong', B: 'Guk-guk', C: 'Kukuruyuk', D: 'Meringkik', E: 'Mengembik' },
      correctAnswer: 'B',
      questionType: QuestionType.TIU,
      defaultScore: 5,
    },
  ];

  // TWK Questions (5) - Tes Wawasan Kebangsaan
  const twkQuestions = [
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
  ];

  // TKP Questions (5) - Tes Karakteristik Pribadi
  const tkpQuestions = [
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
  ];

  const allQuestions = [...tiuQuestions, ...twkQuestions, ...tkpQuestions];
  const createdQuestions: Array<{ id: number; content: string; questionType: QuestionType }> = [];

  for (const q of allQuestions) {
    // Use content as unique identifier for upsert
    const existing = await prisma.questionBank.findFirst({
      where: { content: q.content },
    });

    let question;
    if (existing) {
      question = await prisma.questionBank.update({
        where: { id: existing.id },
        data: {
          options: q.options,
          correctAnswer: q.correctAnswer,
          questionType: q.questionType,
          defaultScore: q.defaultScore,
        },
      });
    } else {
      question = await prisma.questionBank.create({
        data: {
          content: q.content,
          options: q.options,
          correctAnswer: q.correctAnswer,
          questionType: q.questionType,
          defaultScore: q.defaultScore,
        },
      });
    }

    createdQuestions.push({
      id: question.id,
      content: question.content.substring(0, 50) + '...',
      questionType: question.questionType,
    });
  }

  log(`  ✓ Created/Updated ${createdQuestions.length} questions`);
  log(`    - TIU: ${tiuQuestions.length}`);
  log(`    - TWK: ${twkQuestions.length}`);
  log(`    - TKP: ${tkpQuestions.length}`);

  return createdQuestions;
}

// ============================================================================
// SEED: EXAMS
// ============================================================================

async function seedExams(adminId: number) {
  log('Seeding exams...');

  // Get all questions for assignment
  const allQuestions = await prisma.questionBank.findMany({
    orderBy: [{ questionType: 'asc' }, { id: 'asc' }],
  });

  // -------------------------------------------------------------------------
  // Exam 1: Active exam with RETAKES ALLOWED (max 3 attempts)
  // Test scenarios: Resume, Retake button, Multiple attempts history
  // -------------------------------------------------------------------------
  const exam1Title = 'Tryout CPNS 2025 - Paket A';
  let exam1 = await prisma.exam.findFirst({
    where: { title: exam1Title },
  });

  if (!exam1) {
    exam1 = await prisma.exam.create({
      data: {
        title: exam1Title,
        description:
          'Tryout CPNS lengkap mencakup TIU, TWK, dan TKP. Durasi 90 menit dengan 15 soal pilihan ganda. Dapat diulang hingga 3 kali.',
        durationMinutes: 90,
        passingScore: 50,
        allowRetake: true,
        maxAttempts: 3,
        startTime: new Date('2025-01-01T00:00:00Z'),
        endTime: new Date('2025-12-31T23:59:59Z'),
        createdBy: adminId,
      },
    });
  } else {
    exam1 = await prisma.exam.update({
      where: { id: exam1.id },
      data: {
        description:
          'Tryout CPNS lengkap mencakup TIU, TWK, dan TKP. Durasi 90 menit dengan 15 soal pilihan ganda. Dapat diulang hingga 3 kali.',
        durationMinutes: 90,
        passingScore: 50,
        allowRetake: true,
        maxAttempts: 3,
        startTime: new Date('2025-01-01T00:00:00Z'),
        endTime: new Date('2025-12-31T23:59:59Z'),
      },
    });
  }

  // -------------------------------------------------------------------------
  // Exam 2: Exam with NO RETAKES (one-shot)
  // Test scenarios: Retake disabled error
  // -------------------------------------------------------------------------
  const exam2Title = 'Simulasi CPNS 2025 - Final';
  let exam2 = await prisma.exam.findFirst({
    where: { title: exam2Title },
  });

  if (!exam2) {
    exam2 = await prisma.exam.create({
      data: {
        title: exam2Title,
        description:
          'Simulasi ujian CPNS final. TIDAK DAPAT DIULANG setelah selesai. Persiapkan diri dengan baik!',
        durationMinutes: 60,
        passingScore: 60,
        allowRetake: false,
        maxAttempts: 1,
        startTime: new Date('2025-01-01T00:00:00Z'),
        endTime: new Date('2025-12-31T23:59:59Z'),
        createdBy: adminId,
      },
    });
  } else {
    exam2 = await prisma.exam.update({
      where: { id: exam2.id },
      data: {
        description:
          'Simulasi ujian CPNS final. TIDAK DAPAT DIULANG setelah selesai. Persiapkan diri dengan baik!',
        durationMinutes: 60,
        passingScore: 60,
        allowRetake: false,
        maxAttempts: 1,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Exam 3: Exam with LIMITED RETAKES (max 2 attempts)
  // Test scenarios: Max attempts reached error
  // -------------------------------------------------------------------------
  const exam3Title = 'Tryout CPNS 2025 - Paket B (Limited)';
  let exam3 = await prisma.exam.findFirst({
    where: { title: exam3Title },
  });

  if (!exam3) {
    exam3 = await prisma.exam.create({
      data: {
        title: exam3Title,
        description:
          'Tryout CPNS dengan maksimal 2 percobaan. Gunakan kesempatan dengan bijak!',
        durationMinutes: 45,
        passingScore: 55,
        allowRetake: true,
        maxAttempts: 2, // Only 2 attempts allowed
        startTime: new Date('2025-01-01T00:00:00Z'),
        endTime: new Date('2025-12-31T23:59:59Z'),
        createdBy: adminId,
      },
    });
  } else {
    exam3 = await prisma.exam.update({
      where: { id: exam3.id },
      data: {
        description:
          'Tryout CPNS dengan maksimal 2 percobaan. Gunakan kesempatan dengan bijak!',
        durationMinutes: 45,
        passingScore: 55,
        allowRetake: true,
        maxAttempts: 2,
      },
    });
  }

  // Assign questions to all exams
  for (const exam of [exam1, exam2, exam3]) {
    // Delete existing exam questions
    await prisma.examQuestion.deleteMany({
      where: { examId: exam.id },
    });

    // Assign all 15 questions
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
  log(`    - Retakes: ✅ Allowed, Max: ${exam1.maxAttempts} attempts`);
  log(`  ✓ Exam 2: "${exam2.title}" (ID: ${exam2.id})`);
  log(`    - Retakes: ❌ Disabled`);
  log(`  ✓ Exam 3: "${exam3.title}" (ID: ${exam3.id})`);
  log(`    - Retakes: ✅ Allowed, Max: ${exam3.maxAttempts} attempts`);
  log(`  ✓ Assigned ${allQuestions.length} questions to each exam`);

  return { exam1, exam2, exam3 };
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
  log('Seeding exam sessions...');

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

  const sessions: Record<string, any> = {};

  // =========================================================================
  // SCENARIO 1: IN_PROGRESS Session (Resume Flow)
  // Participant 1 on Exam 1 - Active session with partial answers
  // =========================================================================
  log('  Creating Scenario 1: IN_PROGRESS session (Resume Flow)...');

  let session1 = await prisma.userExam.findFirst({
    where: {
      userId: participant1Id,
      examId: exam1Id,
      attemptNumber: 1,
    },
  });

  if (!session1) {
    session1 = await prisma.userExam.create({
      data: {
        userId: participant1Id,
        examId: exam1Id,
        attemptNumber: 1,
        startedAt: new Date(),
        status: ExamStatus.IN_PROGRESS,
      },
    });
  } else {
    session1 = await prisma.userExam.update({
      where: { id: session1.id },
      data: {
        status: ExamStatus.IN_PROGRESS,
        startedAt: new Date(),
        submittedAt: null,
        totalScore: null,
      },
    });
  }

  // Clear existing answers and add partial answers
  await prisma.answer.deleteMany({
    where: { userExamId: session1.id },
  });

  // Answer first 5 questions (partial progress)
  for (let i = 0; i < 5; i++) {
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

  sessions.inProgress = session1;
  log(`    ✓ Session ID: ${session1.id} - Participant 1 on Exam 1`);
  log(`      5/${exam1Questions.length} questions answered`);

  // =========================================================================
  // SCENARIO 2: FINISHED Session with Retakes Allowed (Retake Flow)
  // Participant 2 on Exam 1 - Completed, can click "Ulangi Ujian"
  // =========================================================================
  log('  Creating Scenario 2: FINISHED session with retakes allowed...');

  const completedTime2 = new Date();
  completedTime2.setHours(completedTime2.getHours() - 3); // 3 hours ago
  const startTime2 = new Date(completedTime2);
  startTime2.setMinutes(startTime2.getMinutes() - 75); // 75 min before submit

  let session2 = await prisma.userExam.findFirst({
    where: {
      userId: participant2Id,
      examId: exam1Id,
      attemptNumber: 1,
    },
  });

  if (!session2) {
    session2 = await prisma.userExam.create({
      data: {
        userId: participant2Id,
        examId: exam1Id,
        attemptNumber: 1,
        startedAt: startTime2,
        submittedAt: completedTime2,
        status: ExamStatus.FINISHED,
        totalScore: 45, // Below passing (50) to motivate retake
      },
    });
  } else {
    session2 = await prisma.userExam.update({
      where: { id: session2.id },
      data: {
        startedAt: startTime2,
        submittedAt: completedTime2,
        status: ExamStatus.FINISHED,
        totalScore: 45,
      },
    });
  }

  // Clear and add answers
  await prisma.answer.deleteMany({
    where: { userExamId: session2.id },
  });

  let score2 = 0;
  for (let i = 0; i < exam1Questions.length; i++) {
    const eq = exam1Questions[i];
    const isCorrect = i < 9; // 9/15 correct = 60% but score = 45 (9*5)
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

  // Update with calculated score
  await prisma.userExam.update({
    where: { id: session2.id },
    data: { totalScore: score2 },
  });

  sessions.retakeAllowed = session2;
  log(`    ✓ Session ID: ${session2.id} - Participant 2 on Exam 1`);
  log(`      Score: ${score2} (can retake up to 3 attempts)`);

  // =========================================================================
  // SCENARIO 3: FINISHED Session with Retakes DISABLED (Error Flow)
  // Participant 1 on Exam 2 - Completed, will get error if tries to retake
  // =========================================================================
  log('  Creating Scenario 3: FINISHED session with retakes DISABLED...');

  const completedTime3 = new Date();
  completedTime3.setHours(completedTime3.getHours() - 5); // 5 hours ago
  const startTime3 = new Date(completedTime3);
  startTime3.setMinutes(startTime3.getMinutes() - 55);

  let session3 = await prisma.userExam.findFirst({
    where: {
      userId: participant1Id,
      examId: exam2Id,
      attemptNumber: 1,
    },
  });

  if (!session3) {
    session3 = await prisma.userExam.create({
      data: {
        userId: participant1Id,
        examId: exam2Id,
        attemptNumber: 1,
        startedAt: startTime3,
        submittedAt: completedTime3,
        status: ExamStatus.FINISHED,
        totalScore: 70,
      },
    });
  } else {
    session3 = await prisma.userExam.update({
      where: { id: session3.id },
      data: {
        startedAt: startTime3,
        submittedAt: completedTime3,
        status: ExamStatus.FINISHED,
        totalScore: 70,
      },
    });
  }

  await prisma.answer.deleteMany({
    where: { userExamId: session3.id },
  });

  let score3 = 0;
  for (let i = 0; i < exam2Questions.length; i++) {
    const eq = exam2Questions[i];
    const isCorrect = i < 14; // 14/15 correct
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

  sessions.retakeDisabled = session3;
  log(`    ✓ Session ID: ${session3.id} - Participant 1 on Exam 2`);
  log(`      Score: ${score3} (NO retakes allowed - will get error)`);

  // =========================================================================
  // SCENARIO 4: FINISHED Session for viewing results
  // Participant 2 on Exam 2 - Standard completed exam
  // =========================================================================
  log('  Creating Scenario 4: FINISHED session for results viewing...');

  const completedTime4 = new Date();
  completedTime4.setHours(completedTime4.getHours() - 1);
  const startTime4 = new Date(completedTime4);
  startTime4.setMinutes(startTime4.getMinutes() - 45);

  let session4 = await prisma.userExam.findFirst({
    where: {
      userId: participant2Id,
      examId: exam2Id,
      attemptNumber: 1,
    },
  });

  if (!session4) {
    session4 = await prisma.userExam.create({
      data: {
        userId: participant2Id,
        examId: exam2Id,
        attemptNumber: 1,
        startedAt: startTime4,
        submittedAt: completedTime4,
        status: ExamStatus.FINISHED,
        totalScore: 65,
      },
    });
  } else {
    session4 = await prisma.userExam.update({
      where: { id: session4.id },
      data: {
        startedAt: startTime4,
        submittedAt: completedTime4,
        status: ExamStatus.FINISHED,
      },
    });
  }

  await prisma.answer.deleteMany({
    where: { userExamId: session4.id },
  });

  let score4 = 0;
  for (let i = 0; i < exam2Questions.length; i++) {
    const eq = exam2Questions[i];
    const isCorrect = i < 9 || i === 12;
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

  sessions.viewResults = session4;
  log(`    ✓ Session ID: ${session4.id} - Participant 2 on Exam 2`);
  log(`      Score: ${score4}`);

  // =========================================================================
  // SCENARIO 5: MAX ATTEMPTS EXHAUSTED (Error Flow)
  // Participant 1 on Exam 3 - Has 2/2 attempts completed
  // =========================================================================
  log('  Creating Scenario 5: MAX ATTEMPTS exhausted...');

  for (let attempt = 1; attempt <= 2; attempt++) {
    const attemptStart = new Date();
    attemptStart.setDate(attemptStart.getDate() - attempt);
    const attemptEnd = new Date(attemptStart);
    attemptEnd.setMinutes(attemptEnd.getMinutes() + 40);

    let existingAttempt = await prisma.userExam.findFirst({
      where: {
        userId: participant1Id,
        examId: exam3Id,
        attemptNumber: attempt,
      },
    });

    if (!existingAttempt) {
      existingAttempt = await prisma.userExam.create({
        data: {
          userId: participant1Id,
          examId: exam3Id,
          attemptNumber: attempt,
          startedAt: attemptStart,
          submittedAt: attemptEnd,
          status: ExamStatus.FINISHED,
          totalScore: 45 + attempt * 10, // Scores: 55, 65
        },
      });
    } else {
      existingAttempt = await prisma.userExam.update({
        where: { id: existingAttempt.id },
        data: {
          startedAt: attemptStart,
          submittedAt: attemptEnd,
          status: ExamStatus.FINISHED,
          totalScore: 45 + attempt * 10,
        },
      });
    }

    await prisma.answer.deleteMany({
      where: { userExamId: existingAttempt.id },
    });

    for (let i = 0; i < exam3Questions.length; i++) {
      const eq = exam3Questions[i];
      const isCorrect = i < (9 + attempt * 2); // Improvement on each attempt
      await prisma.answer.create({
        data: {
          userExamId: existingAttempt.id,
          examQuestionId: eq.id,
          selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
          isCorrect,
        },
      });
    }

    if (attempt === 1) sessions.maxAttemptsFirst = existingAttempt;
    if (attempt === 2) sessions.maxAttemptsSecond = existingAttempt;

    log(`    ✓ Attempt #${attempt} - Session ID: ${existingAttempt.id}`);
    log(`      Score: ${existingAttempt.totalScore}`);
  }
  log(`      Participant 1 has exhausted 2/2 attempts on Exam 3`);

  // =========================================================================
  // SCENARIO 6: TIMEOUT Session (Edge Case)
  // Participant 2 on Exam 3 - Auto-submitted due to timeout
  // =========================================================================
  log('  Creating Scenario 6: TIMEOUT session (edge case)...');

  const timeoutStart = new Date();
  timeoutStart.setHours(timeoutStart.getHours() - 4);
  const timeoutEnd = new Date(timeoutStart);
  timeoutEnd.setMinutes(timeoutEnd.getMinutes() + 45); // Exactly at duration limit

  let session6 = await prisma.userExam.findFirst({
    where: {
      userId: participant2Id,
      examId: exam3Id,
      attemptNumber: 1,
    },
  });

  if (!session6) {
    session6 = await prisma.userExam.create({
      data: {
        userId: participant2Id,
        examId: exam3Id,
        attemptNumber: 1,
        startedAt: timeoutStart,
        submittedAt: timeoutEnd,
        status: ExamStatus.TIMEOUT,
        totalScore: 30,
      },
    });
  } else {
    session6 = await prisma.userExam.update({
      where: { id: session6.id },
      data: {
        startedAt: timeoutStart,
        submittedAt: timeoutEnd,
        status: ExamStatus.TIMEOUT,
        totalScore: 30,
      },
    });
  }

  await prisma.answer.deleteMany({
    where: { userExamId: session6.id },
  });

  // Only partial answers (simulating timeout before completion)
  for (let i = 0; i < 8; i++) {
    const eq = exam3Questions[i];
    const isCorrect = i < 6;
    await prisma.answer.create({
      data: {
        userExamId: session6.id,
        examQuestionId: eq.id,
        selectedOption: isCorrect ? eq.question.correctAnswer : getWrongOption(eq.question.correctAnswer),
        isCorrect,
      },
    });
  }

  sessions.timeout = session6;
  log(`    ✓ Session ID: ${session6.id} - Participant 2 on Exam 3`);
  log(`      Status: TIMEOUT, Score: 30 (partial answers)`);

  return sessions;
}

// ============================================================================
// SEED: PROCTORING EVENTS
// ============================================================================

async function seedProctoringEvents(sessions: Record<string, any>) {
  log('Seeding proctoring events...');

  // Get session IDs
  const sessionIds = Object.values(sessions)
    .filter((s) => s && s.id)
    .map((s) => s.id);

  // Clear existing events for these sessions
  await prisma.proctoringEvent.deleteMany({
    where: {
      userExamId: { in: sessionIds },
    },
  });

  const now = new Date();

  // IN_PROGRESS session: Recent events (for demo)
  if (sessions.inProgress) {
    const events = [
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(now.getTime() - 5 * 60 * 1000),
        metadata: { confidence: 0.98, faces: 1 },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(now.getTime() - 3 * 60 * 1000),
        metadata: { confidence: 0.95, faces: 1 },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: new Date(now.getTime() - 2 * 60 * 1000),
        metadata: { confidence: 0.87, deviation: 'left' },
      },
      {
        userExamId: sessions.inProgress.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(now.getTime() - 1 * 60 * 1000),
        metadata: { confidence: 0.96, faces: 1 },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ IN_PROGRESS session: ${events.length} events`);
  }

  // View Results session: Historical events with violations
  if (sessions.viewResults) {
    const sessionStartTime = new Date(now.getTime() - 60 * 60 * 1000);
    const events = [
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(sessionStartTime.getTime() + 1 * 60 * 1000),
        metadata: { confidence: 0.97, faces: 1 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(sessionStartTime.getTime() + 5 * 60 * 1000),
        metadata: { confidence: 0.94, faces: 1 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.NO_FACE_DETECTED,
        severity: 'HIGH',
        timestamp: new Date(sessionStartTime.getTime() + 10 * 60 * 1000),
        metadata: { confidence: 0.12, message: 'User may have left frame' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(sessionStartTime.getTime() + 11 * 60 * 1000),
        metadata: { confidence: 0.91, faces: 1 },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.MULTIPLE_FACES,
        severity: 'HIGH',
        timestamp: new Date(sessionStartTime.getTime() + 20 * 60 * 1000),
        metadata: { confidence: 0.88, faces: 2, message: 'Two faces detected' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.LOOKING_AWAY,
        severity: 'MEDIUM',
        timestamp: new Date(sessionStartTime.getTime() + 30 * 60 * 1000),
        metadata: { confidence: 0.82, deviation: 'right' },
      },
      {
        userExamId: sessions.viewResults.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(sessionStartTime.getTime() + 40 * 60 * 1000),
        metadata: { confidence: 0.93, faces: 1 },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ View Results session: ${events.length} events (includes HIGH severity)`);
  }

  // Retake Allowed session: Clean session with minimal violations
  if (sessions.retakeAllowed) {
    const events = [
      {
        userExamId: sessions.retakeAllowed.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(now.getTime() - 180 * 60 * 1000),
        metadata: { confidence: 0.99, faces: 1 },
      },
      {
        userExamId: sessions.retakeAllowed.id,
        eventType: ProctoringEventType.FACE_DETECTED,
        severity: 'LOW',
        timestamp: new Date(now.getTime() - 120 * 60 * 1000),
        metadata: { confidence: 0.97, faces: 1 },
      },
    ];

    for (const event of events) {
      await prisma.proctoringEvent.create({ data: event });
    }
    log(`  ✓ Retake Allowed session: ${events.length} events (clean session)`);
  }

  log('  ✓ Proctoring events seeded for demo purposes');
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('PRESTIGE ACADEMY CPNS - COMPREHENSIVE DATABASE SEEDING');
  console.log('='.repeat(70) + '\n');

  try {
    // Step 1: Users
    const { admin, participant1, participant2, participant3 } = await seedUsers();

    // Step 2: Questions
    await seedQuestions();

    // Step 3: Exams (3 different configurations)
    const { exam1, exam2, exam3 } = await seedExams(admin.id);

    // Step 4: Exam Sessions (All scenarios)
    const sessions = await seedExamSessions(
      participant1.id,
      participant2.id,
      exam1.id,
      exam2.id,
      exam3.id
    );

    // Step 5: Proctoring Events
    await seedProctoringEvents(sessions);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('SEEDING COMPLETE! ✓');
    console.log('='.repeat(70));

    console.log('\n📋 TEST CREDENTIALS:');
    console.log('─'.repeat(50));
    console.log(`ADMIN:         ${TEST_CREDENTIALS.admin.email}`);
    console.log(`               Password: ${TEST_CREDENTIALS.admin.password}`);
    console.log('');
    console.log(`PARTICIPANT 1: ${TEST_CREDENTIALS.participant1.email}`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant1.password}`);
    console.log(`               ├─ Exam 1: IN_PROGRESS (resume flow)`);
    console.log(`               ├─ Exam 2: FINISHED (retake disabled)`);
    console.log(`               └─ Exam 3: 2/2 attempts (max attempts error)`);
    console.log('');
    console.log(`PARTICIPANT 2: ${TEST_CREDENTIALS.participant2.email}`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant2.password}`);
    console.log(`               ├─ Exam 1: FINISHED (can retake)`);
    console.log(`               ├─ Exam 2: FINISHED (view results)`);
    console.log(`               └─ Exam 3: TIMEOUT (edge case)`);
    console.log('');
    console.log(`PARTICIPANT 3: ${TEST_CREDENTIALS.participant3.email}`);
    console.log(`               Password: ${TEST_CREDENTIALS.participant3.password}`);
    console.log(`               └─ NO EXAMS (fresh start flow)`);
    console.log('─'.repeat(50));

    console.log('\n📊 DATA SUMMARY:');
    console.log('─'.repeat(50));
    console.log(`Users:              4 (1 admin, 3 participants)`);
    console.log(`Questions:          15 (5 TIU, 5 TWK, 5 TKP)`);
    console.log(`Exams:              3`);
    console.log(`  ├─ Exam 1:        Retakes ✅ (max 3)`);
    console.log(`  ├─ Exam 2:        Retakes ❌`);
    console.log(`  └─ Exam 3:        Retakes ✅ (max 2)`);
    console.log(`Exam Sessions:      7`);
    console.log(`  ├─ IN_PROGRESS:   1 (resume flow)`);
    console.log(`  ├─ FINISHED:      5 (various scenarios)`);
    console.log(`  └─ TIMEOUT:       1 (edge case)`);
    console.log(`Proctoring Events:  13+ (with HIGH severity violations)`);
    console.log('─'.repeat(50));

    console.log('\n🧪 TESTABLE SCENARIOS:');
    console.log('─'.repeat(50));
    console.log('1. First Start     → Login as Participant 3, start any exam');
    console.log('2. Resume Exam     → Login as Participant 1, continue Exam 1');
    console.log('3. Retake Exam     → Login as Participant 2, retake Exam 1');
    console.log('4. Retake Disabled → Login as Participant 1, try Exam 2 again');
    console.log('5. Max Attempts    → Login as Participant 1, try Exam 3 again');
    console.log('6. View Results    → Login as Participant 2, view Exam 2 results');
    console.log('7. View History    → Login as Participant 1, view Exam 3 attempts');
    console.log('8. Proctoring Demo → Any active session shows ML events');
    console.log('─'.repeat(50) + '\n');
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();