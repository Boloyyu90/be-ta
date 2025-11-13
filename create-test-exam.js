#!/usr/bin/env node

/**
 * Create Test Exam with Questions
 * Run this before running test-transaction.js
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function createTestExam() {
  try {
    log('\n🎓 Creating Test Exam with Questions...', colors.blue);
    log('=' .repeat(50) + '\n', colors.blue);

    // Step 1: Find or create admin user
    log('1️⃣  Finding admin user...', colors.yellow);

    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      log('   No admin found. Creating one...', colors.yellow);
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash('Admin123!', 10);

      admin = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          password: hashedPassword,
          name: 'Test Admin',
          role: 'ADMIN',
        }
      });
      log(`   ✅ Admin created: ${admin.email}`, colors.green);
    } else {
      log(`   ✅ Admin found: ${admin.email}`, colors.green);
    }

    // Step 2: Create or find exam
    log('\n2️⃣  Creating exam...', colors.yellow);

    let exam = await prisma.exam.findFirst({
      where: {
        title: 'Test Exam for Transaction Testing',
        createdBy: admin.id
      },
      include: {
        examQuestions: true
      }
    });

    if (exam && exam.examQuestions.length > 0) {
      log(`   ℹ️  Exam already exists with ${exam.examQuestions.length} questions`, colors.blue);
      log(`   Exam ID: ${exam.id}`, colors.green);
      return exam;
    }

    if (!exam) {
      exam = await prisma.exam.create({
        data: {
          title: 'Test Exam for Transaction Testing',
          description: 'This exam is created for testing transaction-protected answer submissions',
          durationMinutes: 60,
          createdBy: admin.id,
        }
      });
      log(`   ✅ Exam created: ${exam.title}`, colors.green);
      log(`   Exam ID: ${exam.id}`, colors.green);
    }

    // Step 3: Create questions
    log('\n3️⃣  Creating 10 test questions...', colors.yellow);

    const questionTypes = ['TIU', 'TWK', 'TKP'];
    const questions = [];

    for (let i = 1; i <= 10; i++) {
      const questionType = questionTypes[i % 3];

      const question = await prisma.questionBank.create({
        data: {
          content: `Test Question ${i}: What is the correct answer for question ${i}?`,
          options: {
            A: `Option A for question ${i}`,
            B: `Option B for question ${i}`,
            C: `Option C for question ${i}`,
            D: `Option D for question ${i}`,
            E: `Option E for question ${i}`,
          },
          correctAnswer: 'A',
          questionType: questionType,
          defaultScore: 5,
        }
      });

      questions.push(question);
    }

    log(`   ✅ Created ${questions.length} questions`, colors.green);

    // Step 4: Attach questions to exam
    log('\n4️⃣  Attaching questions to exam...', colors.yellow);

    for (let i = 0; i < questions.length; i++) {
      await prisma.examQuestion.create({
        data: {
          examId: exam.id,
          questionId: questions[i].id,
          orderNumber: i + 1,
        }
      });
    }

    log(`   ✅ Attached ${questions.length} questions to exam`, colors.green);

    // Step 5: Verify
    const finalExam = await prisma.exam.findUnique({
      where: { id: exam.id },
      include: {
        examQuestions: {
          include: {
            question: true
          }
        }
      }
    });

    log('\n' + '='.repeat(50), colors.blue);
    log('✅ Test exam created successfully!', colors.green);
    log('='.repeat(50), colors.blue);

    log('\n📊 Exam Details:', colors.blue);
    log(`   ID: ${finalExam.id}`, colors.green);
    log(`   Title: ${finalExam.title}`, colors.green);
    log(`   Duration: ${finalExam.durationMinutes} minutes`, colors.green);
    log(`   Questions: ${finalExam.examQuestions.length}`, colors.green);

    log('\n💡 Next step:', colors.yellow);
    log(`   Run: node test-transaction.js`, colors.yellow);
    log(`   (The script will use exam ID ${finalExam.id})`, colors.yellow);

    return finalExam;

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestExam();