// Sample questions untuk testing
// Copy ke prisma/seed.ts atau buat file terpisah

import { PrismaClient, QuestionType } from '@prisma/client';

const prisma = new PrismaClient();

const sampleQuestions = [
  // TWK Questions (Tes Wawasan Kebangsaan)
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

  // TIU Questions (Tes Intelegensia Umum)
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

  // TKP Questions (Tes Karakteristik Pribadi)
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

async function seedQuestions() {
  console.log('🌱 Seeding sample questions...');

  for (const question of sampleQuestions) {
    await prisma.questionBank.create({
      data: question,
    });
  }

  console.log(`✅ Successfully seeded ${sampleQuestions.length} questions`);
  console.log('');
  console.log('📊 Questions by type:');
  console.log(`   - TWK: ${sampleQuestions.filter((q) => q.questionType === QuestionType.TWK).length}`);
  console.log(`   - TIU: ${sampleQuestions.filter((q) => q.questionType === QuestionType.TIU).length}`);
  console.log(`   - TKP: ${sampleQuestions.filter((q) => q.questionType === QuestionType.TKP).length}`);
}
//
// Uncomment to run
seedQuestions()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export { seedQuestions, sampleQuestions };