/**
 * Prisma Seed File - Prestige Academy CPNS Exam System
 *
 * This seed file creates minimum essential data for Iteration-1 end-to-end testing:
 * - 1 Admin + 2 Participants with known credentials
 * - 2 Exams (one allows retakes, one doesn't)
 * - 15+ Questions spanning TIU/TKP/TWK
 * - Exam sessions (1 active, 1 finished) with answers
 * - Proctoring events for demonstration
 *
 * IDEMPOTENT: Safe to run multiple times using upsert and deterministic IDs
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

// ============================================================================
// SEED: USERS
// ============================================================================

async function seedUsers() {
  log('Seeding users...');

  const adminPassword = await hashPassword(TEST_CREDENTIALS.admin.password);
  const participant1Password = await hashPassword(TEST_CREDENTIALS.participant1.password);
  const participant2Password = await hashPassword(TEST_CREDENTIALS.participant2.password);

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

  // Participant 1 - will have active exam session
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

  // Participant 2 - will have finished exam session
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

  log(`  ✓ Admin: ${admin.email} (ID: ${admin.id})`);
  log(`  ✓ Participant 1: ${participant1.email} (ID: ${participant1.id})`);
  log(`  ✓ Participant 2: ${participant2.email} (ID: ${participant2.id})`);

  return { admin, participant1, participant2 };
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
      content:
        'Ketika menghadapi deadline yang sangat ketat, Anda akan...',
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
      content:
        'Ketika rekan kerja meminta bantuan saat Anda sedang sibuk, Anda akan...',
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
      content:
        'Jika Anda menemukan kesalahan pada pekerjaan atasan, Anda akan...',
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
      content:
        'Sikap Anda ketika mendapat kritik dari atasan adalah...',
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
      content:
        'Ketika terjadi konflik antar rekan kerja, Anda akan...',
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
    // First, try to find existing question by content
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

  // Exam 1: Active exam with retakes allowed
  const exam1Title = 'Tryout CPNS 2025 - Paket A';
  let exam1 = await prisma.exam.findFirst({
    where: { title: exam1Title },
  });

  if (!exam1) {
    exam1 = await prisma.exam.create({
      data: {
        title: exam1Title,
        description:
          'Tryout CPNS lengkap mencakup TIU, TWK, dan TKP. Durasi 90 menit dengan 15 soal pilihan ganda.',
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
          'Tryout CPNS lengkap mencakup TIU, TWK, dan TKP. Durasi 90 menit dengan 15 soal pilihan ganda.',
        durationMinutes: 90,
        passingScore: 50,
        allowRetake: true,
        maxAttempts: 3,
        startTime: new Date('2025-01-01T00:00:00Z'),
        endTime: new Date('2025-12-31T23:59:59Z'),
      },
    });
  }

  // Exam 2: Exam without retakes (one-shot)
  const exam2Title = 'Simulasi CPNS 2025 - Final';
  let exam2 = await prisma.exam.findFirst({
    where: { title: exam2Title },
  });

  if (!exam2) {
    exam2 = await prisma.exam.create({
      data: {
        title: exam2Title,
        description:
          'Simulasi ujian CPNS final. Tidak dapat diulang setelah selesai. Persiapkan diri dengan baik!',
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
          'Simulasi ujian CPNS final. Tidak dapat diulang setelah selesai. Persiapkan diri dengan baik!',
        durationMinutes: 60,
        passingScore: 60,
        allowRetake: false,
        maxAttempts: 1,
      },
    });
  }

  // Assign questions to exams
  // For each exam, clear existing questions and re-assign
  for (const exam of [exam1, exam2]) {
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

  log(`  ✓ Exam 1: "${exam1.title}" (ID: ${exam1.id}) - Retakes: ${exam1.allowRetake}`);
  log(`  ✓ Exam 2: "${exam2.title}" (ID: ${exam2.id}) - Retakes: ${exam2.allowRetake}`);
  log(`  ✓ Assigned ${allQuestions.length} questions to each exam`);

  return { exam1, exam2 };
}

// ============================================================================
// SEED: EXAM SESSIONS (UserExam)
// ============================================================================

async function seedExamSessions(
  participant1Id: number,
  participant2Id: number,
  exam1Id: number,
  exam2Id: number
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

  // -------------------------------------------------------------------------
  // Session 1: Participant 1 with IN_PROGRESS session on Exam 1
  // -------------------------------------------------------------------------

  // Find or create the session
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
    // Update to ensure it's in progress
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

  // Clear existing answers and add partial answers (simulating in-progress)
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
        selectedOption: eq.question.correctAnswer, // Answer correctly for demo
        isCorrect: true,
      },
    });
  }

  log(`  ✓ Session 1 (IN_PROGRESS): Participant 1 on Exam 1 (ID: ${session1.id})`);
  log(`    - 5 of ${exam1Questions.length} questions answered`);

  // -------------------------------------------------------------------------
  // Session 2: Participant 2 with FINISHED session on Exam 2
  // -------------------------------------------------------------------------

  let session2 = await prisma.userExam.findFirst({
    where: {
      userId: participant2Id,
      examId: exam2Id,
      attemptNumber: 1,
    },
  });

  const submittedTime = new Date();
  submittedTime.setHours(submittedTime.getHours() - 1); // 1 hour ago

  const startedTime = new Date(submittedTime);
  startedTime.setMinutes(startedTime.getMinutes() - 45); // Started 45 min before submit

  if (!session2) {
    session2 = await prisma.userExam.create({
      data: {
        userId: participant2Id,
        examId: exam2Id,
        attemptNumber: 1,
        startedAt: startedTime,
        submittedAt: submittedTime,
        status: ExamStatus.FINISHED,
        totalScore: 65, // Will calculate properly below
      },
    });
  } else {
    session2 = await prisma.userExam.update({
      where: { id: session2.id },
      data: {
        startedAt: startedTime,
        submittedAt: submittedTime,
        status: ExamStatus.FINISHED,
      },
    });
  }

  // Clear existing answers and add all answers
  await prisma.answer.deleteMany({
    where: { userExamId: session2.id },
  });

  let totalScore = 0;
  for (let i = 0; i < exam2Questions.length; i++) {
    const eq = exam2Questions[i];
    // Simulate: correct on ~60% (9 of 15 questions)
    const isCorrect = i < 9 || i === 12;
    const selectedOption = isCorrect
      ? eq.question.correctAnswer
      : getWrongOption(eq.question.correctAnswer);

    await prisma.answer.create({
      data: {
        userExamId: session2.id,
        examQuestionId: eq.id,
        selectedOption,
        isCorrect,
      },
    });

    if (isCorrect) {
      totalScore += eq.question.defaultScore;
    }
  }

  // Update total score
  await prisma.userExam.update({
    where: { id: session2.id },
    data: { totalScore },
  });

  log(`  ✓ Session 2 (FINISHED): Participant 2 on Exam 2 (ID: ${session2.id})`);
  log(`    - All ${exam2Questions.length} questions answered, Score: ${totalScore}`);

  return { session1, session2 };
}

function getWrongOption(correctAnswer: string): string {
  const options = ['A', 'B', 'C', 'D', 'E'];
  const wrongOptions = options.filter((o) => o !== correctAnswer);
  return wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
}

// ============================================================================
// SEED: PROCTORING EVENTS
// ============================================================================

async function seedProctoringEvents(
  session1Id: number,
  session2Id: number
) {
  log('Seeding proctoring events...');

  // Clear existing events
  await prisma.proctoringEvent.deleteMany({
    where: {
      userExamId: { in: [session1Id, session2Id] },
    },
  });

  const now = new Date();

  // Session 1: Active session - recent events
  const session1Events = [
    {
      userExamId: session1Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 min ago
      metadata: { confidence: 0.98, faces: 1 },
    },
    {
      userExamId: session1Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(now.getTime() - 3 * 60 * 1000), // 3 min ago
      metadata: { confidence: 0.95, faces: 1 },
    },
    {
      userExamId: session1Id,
      eventType: ProctoringEventType.LOOKING_AWAY,
      severity: 'MEDIUM',
      timestamp: new Date(now.getTime() - 2 * 60 * 1000), // 2 min ago
      metadata: { confidence: 0.87, deviation: 'left' },
    },
    {
      userExamId: session1Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(now.getTime() - 1 * 60 * 1000), // 1 min ago
      metadata: { confidence: 0.96, faces: 1 },
    },
  ];

  // Session 2: Finished session - historical events with some violations
  const session2StartTime = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const session2Events = [
    {
      userExamId: session2Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(session2StartTime.getTime() + 1 * 60 * 1000),
      metadata: { confidence: 0.97, faces: 1 },
    },
    {
      userExamId: session2Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(session2StartTime.getTime() + 5 * 60 * 1000),
      metadata: { confidence: 0.94, faces: 1 },
    },
    {
      userExamId: session2Id,
      eventType: ProctoringEventType.NO_FACE_DETECTED,
      severity: 'HIGH',
      timestamp: new Date(session2StartTime.getTime() + 10 * 60 * 1000),
      metadata: { confidence: 0.12, message: 'User may have left frame' },
    },
    {
      userExamId: session2Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(session2StartTime.getTime() + 11 * 60 * 1000),
      metadata: { confidence: 0.91, faces: 1 },
    },
    {
      userExamId: session2Id,
      eventType: ProctoringEventType.MULTIPLE_FACES,
      severity: 'HIGH',
      timestamp: new Date(session2StartTime.getTime() + 20 * 60 * 1000),
      metadata: { confidence: 0.88, faces: 2, message: 'Two faces detected' },
    },
    {
      userExamId: session2Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(session2StartTime.getTime() + 25 * 60 * 1000),
      metadata: { confidence: 0.95, faces: 1 },
    },
    {
      userExamId: session2Id,
      eventType: ProctoringEventType.FACE_DETECTED,
      severity: 'LOW',
      timestamp: new Date(session2StartTime.getTime() + 40 * 60 * 1000),
      metadata: { confidence: 0.93, faces: 1 },
    },
  ];

  // Create all events
  for (const event of [...session1Events, ...session2Events]) {
    await prisma.proctoringEvent.create({
      data: event,
    });
  }

  log(`  ✓ Session 1: ${session1Events.length} proctoring events`);
  log(`  ✓ Session 2: ${session2Events.length} proctoring events`);
  log(`    - Including HIGH severity violations for demo`);
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('PRESTIGE ACADEMY CPNS - DATABASE SEEDING');
  console.log('='.repeat(60) + '\n');

  try {
    // Step 1: Users
    const { admin, participant1, participant2 } = await seedUsers();

    // Step 2: Questions
    await seedQuestions();

    // Step 3: Exams
    const { exam1, exam2 } = await seedExams(admin.id);

    // Step 4: Exam Sessions
    const { session1, session2 } = await seedExamSessions(
      participant1.id,
      participant2.id,
      exam1.id,
      exam2.id
    );

    // Step 5: Proctoring Events
    await seedProctoringEvents(session1.id, session2.id);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SEEDING COMPLETE! ✓');
    console.log('='.repeat(60));
    console.log('\n📋 TEST CREDENTIALS:');
    console.log('─'.repeat(40));
    console.log(`ADMIN:        ${TEST_CREDENTIALS.admin.email}`);
    console.log(`              Password: ${TEST_CREDENTIALS.admin.password}`);
    console.log('');
    console.log(`PARTICIPANT 1: ${TEST_CREDENTIALS.participant1.email}`);
    console.log(`              Password: ${TEST_CREDENTIALS.participant1.password}`);
    console.log(`              Has IN_PROGRESS exam session`);
    console.log('');
    console.log(`PARTICIPANT 2: ${TEST_CREDENTIALS.participant2.email}`);
    console.log(`              Password: ${TEST_CREDENTIALS.participant2.password}`);
    console.log(`              Has FINISHED exam session with score`);
    console.log('─'.repeat(40) + '\n');

    console.log('📊 DATA SUMMARY:');
    console.log('─'.repeat(40));
    console.log(`Users:              3 (1 admin, 2 participants)`);
    console.log(`Questions:          15 (5 TIU, 5 TWK, 5 TKP)`);
    console.log(`Exams:              2 (1 with retakes, 1 without)`);
    console.log(`Exam Sessions:      2 (1 in-progress, 1 finished)`);
    console.log(`Proctoring Events:  11 (with violations for demo)`);
    console.log('─'.repeat(40) + '\n');
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();