import {
  PrismaClient,
  QuestionType,
  ProctoringEventType,
  ProctoringSeverity,
  ExamStatus,
  TransactionStatus,
} from '@prisma/client';
import { faker } from '@faker-js/faker/locale/id_ID';
import * as bcrypt from 'bcrypt';
import twkQuestions from './seed/twk-questions';
import tiuQuestions from './seed/tiu-questions';
import tkpQuestions from './seed/tkp-questions';

const prisma = new PrismaClient();

// ============================================================================
// CONFIGURATION
// ============================================================================
const TOTAL_PARTICIPANTS = 1000;
const PAID_EXAM_TAKERS = 500;
const FREE_EXAM_TAKERS = 200;
const EXAM_DURATION_MINUTES = 100;
const USER_CHUNK_SIZE = 500;
const ANSWER_CHUNK_SIZE = 5000;
const SCORE_UPDATE_CHUNK_SIZE = 100;
const DEFAULT_PASSWORD = 'password123';
const OPTIONS = ['A', 'B', 'C', 'D', 'E'] as const;

// ============================================================================
// HELPERS
// ============================================================================
function getEventDescription(eventType: ProctoringEventType): string {
  const descriptions: Record<string, string> = {
    NO_FACE_DETECTED: 'No face detected in camera frame. Participant may have left the screen.',
    MULTIPLE_FACES: 'Multiple faces detected in camera frame. Possible unauthorized assistance.',
    LOOKING_AWAY: 'Participant detected looking away from screen for extended period.',
  };
  return descriptions[eventType] ?? 'Proctoring event detected.';
}

function getSeverity(eventType: ProctoringEventType): ProctoringSeverity {
  const map: Record<ProctoringEventType, ProctoringSeverity> = {
    FACE_DETECTED: 'LOW',
    NO_FACE_DETECTED: 'MEDIUM',
    MULTIPLE_FACES: 'HIGH',
    LOOKING_AWAY: 'MEDIUM',
  };
  return map[eventType];
}

function generateAnswer(
  eq: {
    examQuestionId: number;
    questionType: QuestionType;
    correctAnswer: string;
    optionScores: Record<string, number> | null;
  },
  userExamId: number,
  answeredAt: Date,
) {
  const skipped = Math.random() < 0.03;
  let selectedOption: string | null = null;
  let isCorrect: boolean | null = null;
  let score = 0;

  if (!skipped) {
    selectedOption = faker.helpers.arrayElement([...OPTIONS]);
    if (eq.questionType === 'TKP') {
      isCorrect = null;
      score = eq.optionScores?.[selectedOption] ?? 0;
    } else {
      isCorrect = selectedOption === eq.correctAnswer;
      score = isCorrect ? 5 : 0;
    }
  }

  return { userExamId, examQuestionId: eq.examQuestionId, selectedOption, isCorrect, score, answeredAt };
}

function logBox(lines: (string | null)[]) {
  const W = 58;
  const border = '\u2500'.repeat(W);
  console.log(`  \u250C${border}\u2510`);
  for (const line of lines) {
    if (line === null) {
      console.log(`  \u251C${border}\u2524`);
    } else {
      console.log(`  \u2502${line.padEnd(W)}\u2502`);
    }
  }
  console.log(`  \u2514${border}\u2518`);
}

// ============================================================================
// TYPES
// ============================================================================
type OrderedEQ = {
  examQuestionId: number;
  questionType: QuestionType;
  correctAnswer: string;
  optionScores: Record<string, number> | null;
};

type ExamMeta = {
  examId: number;
  title: string;
  price: number | null;
  orderedEQs: OrderedEQ[];
};

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================
async function main() {
  console.log('='.repeat(60));
  console.log('  SEED: Simulasi Tryout SKD CPNS - Large Scale Data');
  console.log('='.repeat(60));
  console.log();

  // ==========================================================================
  // A. TEARDOWN (Idempotency)
  // ==========================================================================
  console.log('[1/8] Tearing down existing data...');

  await prisma.proctoringEvent.deleteMany();
  await prisma.answer.deleteMany();
  await prisma.userExam.deleteMany();
  await prisma.examQuestion.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.questionBank.deleteMany();
  await prisma.token.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.user.deleteMany();

  console.log('  Teardown complete.\n');

  // ==========================================================================
  // B. SEED USERS (3 Admins + 1000 Participants)
  // ==========================================================================
  console.log('[2/8] Seeding Users...');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // --- 3 Admin / Tutor accounts ---
  const admins = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Tutor Prestige Edu',
        email: 'tutor@prestige-edu.com',
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Admin SKD Master',
        email: 'admin@skdmaster.com',
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dr. Siti Nurhaliza, M.Pd',
        email: 'siti.nurhaliza@cpns-prep.id',
        password: hashedPassword,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    }),
  ]);

  console.log(`  Seeded ${admins.length} Admin users.`);

  // --- 1000 Participant accounts ---
  const usedEmails = new Set<string>();
  const participantRows: Array<{
    name: string;
    email: string;
    password: string;
    role: 'PARTICIPANT';
    isEmailVerified: boolean;
  }> = [];

  for (let i = 0; i < TOTAL_PARTICIPANTS; i++) {
    let email: string;
    do {
      email = faker.internet
        .email({
          firstName: faker.person.firstName(),
          lastName: faker.person.lastName(),
        })
        .toLowerCase();
    } while (usedEmails.has(email));
    usedEmails.add(email);

    participantRows.push({
      name: faker.person.fullName(),
      email,
      password: hashedPassword,
      role: 'PARTICIPANT',
      isEmailVerified: faker.datatype.boolean({ probability: 0.85 }),
    });
  }

  for (let i = 0; i < participantRows.length; i += USER_CHUNK_SIZE) {
    const chunk = participantRows.slice(i, i + USER_CHUNK_SIZE);
    await prisma.user.createMany({ data: chunk });
    const batchNum = Math.floor(i / USER_CHUNK_SIZE) + 1;
    const totalBatches = Math.ceil(participantRows.length / USER_CHUNK_SIZE);
    console.log(`  Participants chunk ${batchNum}/${totalBatches} inserted.`);
  }

  console.log(`  Seeded ${TOTAL_PARTICIPANTS} Participant users.`);

  // Fetch all participant IDs + emails for credential log
  const allParticipants = await prisma.user.findMany({
    where: { role: 'PARTICIPANT' },
    select: { id: true, email: true, name: true },
    orderBy: { id: 'asc' },
  });

  // --- Credential Verification Log ---
  const sampleParticipants = allParticipants.slice(0, 5);
  console.log();
  logBox([
    `  TEST CREDENTIALS`,
    `  Password (all accounts): ${DEFAULT_PASSWORD}`,
    null,
    `  ADMIN:`,
    ...admins.map((a) => `    ${a.email}`),
    null,
    `  PARTICIPANT (sample, ${TOTAL_PARTICIPANTS} total):`,
    ...sampleParticipants.map((p) => `    ${p.email} (${p.name})`),
    `    ... and ${TOTAL_PARTICIPANTS - sampleParticipants.length} more`,
  ]);
  console.log();

  // ==========================================================================
  // C. SEED QUESTION BANK
  // ==========================================================================
  console.log('[3/8] Seeding Question Bank...');

  const allQuestionSeeds = [...twkQuestions, ...tiuQuestions, ...tkpQuestions];

  await prisma.questionBank.createMany({
    data: allQuestionSeeds.map((q) => ({
      content: q.content,
      options: q.options,
      correctAnswer: q.correctAnswer,
      defaultScore: q.defaultScore,
      optionScores: q.optionScores,
      questionType: q.questionType as QuestionType,
    })),
  });

  // Fetch created questions for metadata lookup
  const dbQuestions = await prisma.questionBank.findMany({
    orderBy: { id: 'asc' },
    select: { id: true, questionType: true, correctAnswer: true, optionScores: true },
  });

  // Group question IDs by type for selective linking
  const twkDbIds = dbQuestions.filter((q) => q.questionType === 'TWK').map((q) => q.id);
  const tiuDbIds = dbQuestions.filter((q) => q.questionType === 'TIU').map((q) => q.id);
  const tkpDbIds = dbQuestions.filter((q) => q.questionType === 'TKP').map((q) => q.id);
  const allDbIds = dbQuestions.map((q) => q.id);

  console.log(
    `  Seeded ${dbQuestions.length} Questions (TWK:${twkDbIds.length} TIU:${tiuDbIds.length} TKP:${tkpDbIds.length}).\n`,
  );

  // ==========================================================================
  // D. SEED EXAMS (Multiple Packages)
  // ==========================================================================
  console.log('[4/8] Seeding Exam Packages...');

  const examDefinitions = [
    {
      title: 'Simulasi Tryout SKD Akbar',
      description:
        'Paket simulasi lengkap SKD CPNS. TWK 30 soal, TIU 35 soal, TKP 45 soal. Total 110 soal, durasi 100 menit.',
      durationMinutes: 100,
      passingScore: 311,
      allowRetake: false,
      maxAttempts: 1,
      price: 75000,
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-12-31T23:59:59Z'),
      questionIds: allDbIds,
    },
    {
      title: 'Tryout Gratis SKD CPNS',
      description:
        'Paket tryout GRATIS untuk latihan SKD CPNS. Soal lengkap 110 butir tanpa biaya \u2014 langsung kerjakan tanpa pembayaran.',
      durationMinutes: 100,
      passingScore: 311,
      allowRetake: true,
      maxAttempts: 3,
      price: null as number | null,
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-12-31T23:59:59Z'),
      questionIds: allDbIds,
    },
    {
      title: 'Paket Kilat TWK',
      description:
        'Paket latihan khusus Tes Wawasan Kebangsaan (TWK). 30 soal pilihan ganda, durasi 30 menit.',
      durationMinutes: 30,
      passingScore: 65,
      allowRetake: true,
      maxAttempts: 5,
      price: 25000,
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-12-31T23:59:59Z'),
      questionIds: twkDbIds,
    },
    {
      title: 'Paket Kilat TIU',
      description:
        'Paket latihan khusus Tes Intelegensia Umum (TIU). 35 soal pilihan ganda, durasi 40 menit.',
      durationMinutes: 40,
      passingScore: 80,
      allowRetake: true,
      maxAttempts: 5,
      price: 25000,
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-12-31T23:59:59Z'),
      questionIds: tiuDbIds,
    },
    {
      title: 'Paket Kilat TKP',
      description:
        'Paket latihan khusus Tes Karakteristik Pribadi (TKP). 45 soal pilihan ganda, durasi 45 menit.',
      durationMinutes: 45,
      passingScore: 117,
      allowRetake: true,
      maxAttempts: 5,
      price: 30000,
      startTime: new Date('2026-01-01T00:00:00Z'),
      endTime: new Date('2026-12-31T23:59:59Z'),
      questionIds: tkpDbIds,
    },
  ];

  const createdExams: Array<{
    id: number;
    title: string;
    price: number | null;
    questionIds: number[];
  }> = [];

  for (const def of examDefinitions) {
    const { questionIds, ...examData } = def;
    const ex = await prisma.exam.create({
      data: { ...examData, createdBy: admins[0].id },
    });
    createdExams.push({ id: ex.id, title: ex.title, price: def.price, questionIds });
    const priceLabel = def.price === null ? 'FREE' : `Rp ${def.price.toLocaleString('id-ID')}`;
    console.log(
      `  [${priceLabel}] "${ex.title}" (ID: ${ex.id}, ${questionIds.length} soal, ${def.durationMinutes} min)`,
    );
  }

  console.log(`  Seeded ${createdExams.length} Exam Packages.\n`);

  // ==========================================================================
  // E. SEED EXAM QUESTIONS (Link per Exam)
  // ==========================================================================
  console.log('[5/8] Linking Questions to Exams...');

  const questionMetaMap = new Map(dbQuestions.map((q) => [q.id, q]));
  const examMetas: ExamMeta[] = [];

  for (const ex of createdExams) {
    await prisma.examQuestion.createMany({
      data: ex.questionIds.map((qId, idx) => ({
        examId: ex.id,
        questionId: qId,
        orderNumber: idx + 1,
      })),
    });

    const eqs = await prisma.examQuestion.findMany({
      where: { examId: ex.id },
      orderBy: { orderNumber: 'asc' },
      select: { id: true, questionId: true },
    });

    const orderedEQs: OrderedEQ[] = eqs.map((eq) => {
      const meta = questionMetaMap.get(eq.questionId)!;
      return {
        examQuestionId: eq.id,
        questionType: meta.questionType,
        correctAnswer: meta.correctAnswer,
        optionScores: meta.optionScores as Record<string, number> | null,
      };
    });

    examMetas.push({ examId: ex.id, title: ex.title, price: ex.price, orderedEQs });
    console.log(`  "${ex.title}" -> ${orderedEQs.length} ExamQuestions linked.`);
  }

  console.log();

  // ==========================================================================
  // F. SEED TRANSACTIONS & USER EXAMS
  // ==========================================================================
  console.log('[6/8] Seeding Transactions & Exam Sessions...');

  const paidExamMeta = examMetas[0]; // Simulasi Tryout SKD Akbar
  const freeExamMeta = examMetas[1]; // Tryout Gratis SKD CPNS

  const paidParticipants = allParticipants.slice(0, PAID_EXAM_TAKERS);
  const freeParticipants = allParticipants.slice(
    PAID_EXAM_TAKERS,
    PAID_EXAM_TAKERS + FREE_EXAM_TAKERS,
  );

  // --- Transactions for PAID exam ---
  const transactionRows = paidParticipants.map((p, idx) => {
    const paidAt = faker.date.between({ from: '2026-01-15', to: '2026-02-20' });
    return {
      orderId: `TRX-SKD-${String(idx + 1).padStart(5, '0')}`,
      userId: p.id,
      examId: paidExamMeta.examId,
      amount: 75000,
      status: 'PAID' as TransactionStatus,
      paymentType: faker.helpers.arrayElement(['bank_transfer', 'e_wallet', 'qris', 'credit_card']),
      paidAt,
      createdAt: new Date(paidAt.getTime() - faker.number.int({ min: 60_000, max: 3_600_000 })),
    };
  });

  await prisma.transaction.createMany({ data: transactionRows });
  console.log(`  Seeded ${transactionRows.length} Transactions (paid exam).`);

  // Fetch transactions for linking
  const dbTransactions = await prisma.transaction.findMany({
    where: { examId: paidExamMeta.examId, status: 'PAID' },
    select: { orderId: true, userId: true, paidAt: true },
    orderBy: { id: 'asc' },
  });
  const txByUser = new Map(dbTransactions.map((t) => [t.userId, t]));

  // --- UserExams for PAID exam ---
  const examSessionDeadline = new Date('2026-03-15T00:00:00Z');

  const paidUserExamRows = paidParticipants.map((p) => {
    const tx = txByUser.get(p.id)!;
    const fromDate = new Date(tx.paidAt!.getTime() + 3_600_000);
    const toDate = new Date(
      Math.max(fromDate.getTime() + 86_400_000, examSessionDeadline.getTime()),
    );
    const startedAt = faker.date.between({ from: fromDate, to: toDate });
    const durationMs = faker.number.int({
      min: 70 * 60_000,
      max: EXAM_DURATION_MINUTES * 60_000,
    });

    return {
      userId: p.id,
      examId: paidExamMeta.examId,
      attemptNumber: 1,
      startedAt,
      submittedAt: new Date(startedAt.getTime() + durationMs),
      status: 'FINISHED' as ExamStatus,
      transactionId: tx.orderId,
      totalScore: 0,
    };
  });

  await prisma.userExam.createMany({ data: paidUserExamRows });
  console.log(
    `  Seeded ${paidUserExamRows.length} Exam Sessions (paid: "${paidExamMeta.title}").`,
  );

  // --- UserExams for FREE exam (no transaction needed) ---
  const freeUserExamRows = freeParticipants.map((p) => {
    const startedAt = faker.date.between({ from: '2026-01-20', to: '2026-03-10' });
    const durationMs = faker.number.int({
      min: 70 * 60_000,
      max: EXAM_DURATION_MINUTES * 60_000,
    });

    return {
      userId: p.id,
      examId: freeExamMeta.examId,
      attemptNumber: 1,
      startedAt,
      submittedAt: new Date(startedAt.getTime() + durationMs),
      status: 'FINISHED' as ExamStatus,
      transactionId: null,
      totalScore: 0,
    };
  });

  await prisma.userExam.createMany({ data: freeUserExamRows });
  console.log(
    `  Seeded ${freeUserExamRows.length} Exam Sessions (free: "${freeExamMeta.title}").\n`,
  );

  // Fetch all finished sessions
  const allUserExams = await prisma.userExam.findMany({
    where: { status: 'FINISHED' },
    select: { id: true, userId: true, examId: true, startedAt: true, submittedAt: true },
    orderBy: { id: 'asc' },
  });

  // Group sessions by examId for answer generation
  const sessionsByExam = new Map<number, typeof allUserExams>();
  for (const ue of allUserExams) {
    const arr = sessionsByExam.get(ue.examId) ?? [];
    arr.push(ue);
    sessionsByExam.set(ue.examId, arr);
  }

  // ==========================================================================
  // G. SEED ANSWERS (Crucial Scoring Logic)
  // ==========================================================================
  const examsToSeed = [paidExamMeta, freeExamMeta];
  let grandTotalAnswers = 0;
  for (const em of examsToSeed) {
    grandTotalAnswers += (sessionsByExam.get(em.examId)?.length ?? 0) * em.orderedEQs.length;
  }

  console.log(
    `[7/8] Seeding Answers (${allUserExams.length} sessions, ${grandTotalAnswers} rows total)...`,
  );

  const scoreByUserExam = new Map<number, number>();
  let answerBuffer: Array<{
    userExamId: number;
    examQuestionId: number;
    selectedOption: string | null;
    isCorrect: boolean | null;
    score: number;
    answeredAt: Date;
  }> = [];
  let globalBatch = 0;
  let globalInserted = 0;
  const globalTotalBatches = Math.ceil(grandTotalAnswers / ANSWER_CHUNK_SIZE);

  for (const em of examsToSeed) {
    const sessions = sessionsByExam.get(em.examId) ?? [];
    console.log(
      `  Processing "${em.title}" (${sessions.length} sessions x ${em.orderedEQs.length} questions)...`,
    );

    for (const ue of sessions) {
      let sessionScore = 0;
      const tStart = ue.startedAt!.getTime();
      const tDuration = ue.submittedAt!.getTime() - tStart;

      for (let qIdx = 0; qIdx < em.orderedEQs.length; qIdx++) {
        const eq = em.orderedEQs[qIdx];
        const ratio = (qIdx + Math.random()) / em.orderedEQs.length;
        const answeredAt = new Date(tStart + ratio * tDuration);

        const ans = generateAnswer(eq, ue.id, answeredAt);
        sessionScore += ans.score;
        answerBuffer.push(ans);

        if (answerBuffer.length >= ANSWER_CHUNK_SIZE) {
          globalBatch++;
          await prisma.answer.createMany({ data: answerBuffer });
          globalInserted += answerBuffer.length;
          console.log(
            `  Answers batch ${globalBatch}/${globalTotalBatches} (${globalInserted}/${grandTotalAnswers})`,
          );
          answerBuffer = [];
        }
      }

      scoreByUserExam.set(ue.id, sessionScore);
    }
  }

  // Flush remaining buffer
  if (answerBuffer.length > 0) {
    globalBatch++;
    await prisma.answer.createMany({ data: answerBuffer });
    globalInserted += answerBuffer.length;
    console.log(
      `  Answers batch ${globalBatch}/${globalTotalBatches} (${globalInserted}/${grandTotalAnswers})`,
    );
  }

  console.log(`  Seeded ${globalInserted} Answers.`);

  // Update totalScore on each UserExam
  console.log('  Updating total scores...');

  const scoreEntries = Array.from(scoreByUserExam.entries());
  for (let i = 0; i < scoreEntries.length; i += SCORE_UPDATE_CHUNK_SIZE) {
    const chunk = scoreEntries.slice(i, i + SCORE_UPDATE_CHUNK_SIZE);
    await prisma.$transaction(
      chunk.map(([id, score]) =>
        prisma.userExam.update({ where: { id }, data: { totalScore: score } }),
      ),
    );
  }

  console.log(`  Updated scores for ${scoreByUserExam.size} sessions.\n`);

  // ==========================================================================
  // H. SEED PROCTORING EVENTS
  // ==========================================================================
  console.log('[8/8] Seeding Proctoring Events...');

  const violationTypes: ProctoringEventType[] = [
    'NO_FACE_DETECTED',
    'MULTIPLE_FACES',
    'LOOKING_AWAY',
  ];
  let proctoringBuffer: Array<{
    userExamId: number;
    eventType: ProctoringEventType;
    severity: ProctoringSeverity;
    createdAt: Date;
    metadata: object;
  }> = [];

  for (const ue of allUserExams) {
    const count = faker.number.int({ min: 0, max: 3 });
    for (let v = 0; v < count; v++) {
      const eventType = faker.helpers.arrayElement(violationTypes);
      proctoringBuffer.push({
        userExamId: ue.id,
        eventType,
        severity: getSeverity(eventType),
        createdAt: faker.date.between({ from: ue.startedAt!, to: ue.submittedAt! }),
        metadata: {
          confidence: parseFloat(
            faker.number.float({ min: 0.6, max: 0.99, fractionDigits: 2 }).toFixed(2),
          ),
          source: 'yolo_v8_proctoring',
          frameIndex: faker.number.int({ min: 1, max: 18000 }),
          description: getEventDescription(eventType),
        },
      });
    }
  }

  if (proctoringBuffer.length > 0) {
    for (let i = 0; i < proctoringBuffer.length; i += USER_CHUNK_SIZE) {
      await prisma.proctoringEvent.createMany({
        data: proctoringBuffer.slice(i, i + USER_CHUNK_SIZE),
      });
    }
  }

  console.log(`  Seeded ${proctoringBuffer.length} Proctoring Events.\n`);

  // ==========================================================================
  // SUMMARY
  // ==========================================================================
  const allScores = Array.from(scoreByUserExam.values());
  const avgScore =
    allScores.length > 0 ? allScores.reduce((a, b) => a + b, 0) / allScores.length : 0;
  const minScore = allScores.length > 0 ? Math.min(...allScores) : 0;
  const maxScore = allScores.length > 0 ? Math.max(...allScores) : 0;
  const passingCount = allScores.filter((s) => s >= 311).length;

  console.log('='.repeat(60));
  console.log('  SEED SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Admin Users:          ${admins.length}`);
  console.log(`  Participant Users:    ${TOTAL_PARTICIPANTS}`);
  console.log(`  Exam Packages:        ${createdExams.length}`);
  for (const ex of createdExams) {
    const label = ex.price === null ? 'FREE' : `Rp ${ex.price.toLocaleString('id-ID')}`;
    console.log(`    - [${label}] ${ex.title} (${ex.questionIds.length} soal)`);
  }
  console.log(
    `  Questions:            ${dbQuestions.length} (TWK:${twkDbIds.length} TIU:${tiuDbIds.length} TKP:${tkpDbIds.length})`,
  );
  console.log(`  Transactions:         ${transactionRows.length}`);
  console.log(
    `  Exam Sessions:        ${allUserExams.length} (paid:${paidUserExamRows.length}, free:${freeUserExamRows.length})`,
  );
  console.log(`  Total Answers:        ${globalInserted}`);
  console.log(`  Proctoring Events:    ${proctoringBuffer.length}`);
  console.log('-'.repeat(60));
  console.log(`  Score Range:          ${minScore} - ${maxScore}`);
  console.log(`  Average Score:        ${avgScore.toFixed(1)}`);
  console.log(
    `  Passing (>=311):      ${passingCount}/${allUserExams.length} (${((passingCount / allUserExams.length) * 100).toFixed(1)}%)`,
  );
  console.log('='.repeat(60));
  console.log('\n  Seeding completed successfully!\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('\n  Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
