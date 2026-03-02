type QuestionType = 'TWK' | 'TIU' | 'TKP';

interface QuestionSeed {
  content: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
    E: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D' | 'E';
  defaultScore: number;
  questionType: QuestionType;
  optionScores: Record<'A' | 'B' | 'C' | 'D' | 'E', number> | null;
}

const tiuQuestions: QuestionSeed[] = [
  // ===================== KEMAMPUAN VERBAL — SINONIM (3 soal) =====================
  {
    content: 'Sinonim dari kata "DISPENSASI" adalah ...',
    options: {
      A: 'Distribusi',
      B: 'Pengecualian',
      C: 'Kompensasi',
      D: 'Delegasi',
      E: 'Disposisi',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'Sinonim dari kata "LATENSI" adalah ...',
    options: {
      A: 'Keterlambatan',
      B: 'Keterbukaan',
      C: 'Ketersembunyian',
      D: 'Kepatuhan',
      E: 'Kelancaran',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'Sinonim dari kata "ELABORASI" adalah ...',
    options: {
      A: 'Penyederhanaan',
      B: 'Penghapusan',
      C: 'Pengurangan',
      D: 'Penguraian secara rinci',
      E: 'Peringkasan',
    },
    correctAnswer: 'D',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN VERBAL — ANTONIM (3 soal) =====================
  {
    content: 'Antonim dari kata "PROLIFERASI" adalah ...',
    options: {
      A: 'Perkembangan',
      B: 'Penyusutan',
      C: 'Peningkatan',
      D: 'Perluasan',
      E: 'Percepatan',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'Antonim dari kata "KONKRET" adalah ...',
    options: {
      A: 'Solid',
      B: 'Nyata',
      C: 'Abstrak',
      D: 'Material',
      E: 'Fisik',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'Antonim dari kata "HETEROGEN" adalah ...',
    options: {
      A: 'Beragam',
      B: 'Campuran',
      C: 'Homogen',
      D: 'Kompleks',
      E: 'Plural',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN VERBAL — ANALOGI (3 soal) =====================
  {
    content: 'HAKIM : PUTUSAN = LEGISLATOR : ...',
    options: {
      A: 'Kebijakan',
      B: 'Peraturan',
      C: 'Undang-undang',
      D: 'Keputusan',
      E: 'Anggaran',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'MIKROSKOP : SEL = TELESKOP : ...',
    options: {
      A: 'Atom',
      B: 'Molekul',
      C: 'Bintang',
      D: 'Virus',
      E: 'Bakteri',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'INFLASI : DAYA BELI = DEFORESTASI : ...',
    options: {
      A: 'Keanekaragaman hayati',
      B: 'Produksi kayu',
      C: 'Luas lahan pertanian',
      D: 'Pendapatan negara',
      E: 'Jumlah penduduk',
    },
    correctAnswer: 'A',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN VERBAL — PENALARAN LOGIS (3 soal) =====================
  {
    content:
      'Semua pegawai yang lulus pelatihan berhak mendapat sertifikasi. Beberapa pegawai yang mendapat sertifikasi dipromosikan. Andi adalah pegawai yang lulus pelatihan. Kesimpulan yang paling tepat adalah ...',
    options: {
      A: 'Andi pasti dipromosikan',
      B: 'Andi berhak mendapat sertifikasi dan mungkin dipromosikan',
      C: 'Andi tidak mungkin dipromosikan',
      D: 'Andi belum tentu mendapat sertifikasi',
      E: 'Andi pasti dipromosikan setelah mendapat sertifikasi',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Jika cuaca cerah, maka pertandingan dilaksanakan. Jika pertandingan dilaksanakan, maka penonton datang. Penonton tidak datang. Kesimpulan yang sah adalah ...',
    options: {
      A: 'Cuaca cerah tetapi pertandingan tidak dilaksanakan',
      B: 'Pertandingan dilaksanakan tetapi penonton tidak datang',
      C: 'Cuaca tidak cerah',
      D: 'Pertandingan mungkin dilaksanakan',
      E: 'Tidak dapat ditarik kesimpulan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Perhatikan pola berikut:\nPernyataan 1: Tidak ada koruptor yang jujur.\nPernyataan 2: Semua pejabat yang jujur dihormati masyarakat.\nPernyataan 3: Sebagian pejabat adalah koruptor.\nKesimpulan yang valid adalah ...',
    options: {
      A: 'Semua pejabat tidak dihormati masyarakat',
      B: 'Sebagian pejabat tidak dihormati masyarakat',
      C: 'Semua koruptor adalah pejabat',
      D: 'Tidak ada pejabat yang dihormati masyarakat',
      E: 'Sebagian pejabat yang koruptor tetap dihormati masyarakat',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN VERBAL — PEMAHAMAN BACAAN (2 soal) =====================
  {
    content:
      'Bacalah paragraf berikut:\n"Revolusi Industri 4.0 membawa transformasi fundamental dalam cara kerja birokrasi. Otomatisasi proses, kecerdasan buatan, dan analisis big data memungkinkan pengambilan keputusan berbasis bukti yang lebih akurat. Namun, transformasi ini juga menuntut ASN untuk terus meningkatkan kompetensi digitalnya agar tidak tergantikan oleh teknologi."\n\nKesimpulan yang paling tepat dari paragraf tersebut adalah ...',
    options: {
      A: 'Teknologi akan menggantikan seluruh ASN di masa depan',
      B: 'Revolusi Industri 4.0 hanya berdampak positif bagi birokrasi',
      C: 'Transformasi digital birokrasi membawa peluang sekaligus tantangan peningkatan kompetensi bagi ASN',
      D: 'ASN tidak perlu khawatir dengan perkembangan teknologi',
      E: 'Big data hanya berguna untuk sektor swasta',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Bacalah paragraf berikut:\n"Stunting merupakan masalah gizi kronis yang disebabkan oleh asupan gizi yang kurang dalam waktu lama, umumnya karena asupan makan yang tidak sesuai kebutuhan gizi. Stunting terjadi mulai dari dalam kandungan dan baru terlihat saat anak berusia dua tahun. Dampaknya tidak hanya pada tinggi badan tetapi juga pada perkembangan otak yang mempengaruhi kemampuan kognitif anak."\n\nPernyataan yang TIDAK sesuai dengan paragraf tersebut adalah ...',
    options: {
      A: 'Stunting disebabkan oleh kekurangan gizi dalam jangka panjang',
      B: 'Stunting mulai terjadi sejak masa kehamilan',
      C: 'Stunting hanya berdampak pada pertumbuhan fisik anak',
      D: 'Stunting baru teridentifikasi saat anak berusia dua tahun',
      E: 'Stunting mempengaruhi perkembangan kognitif anak',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN NUMERIK — DERET ANGKA (3 soal) =====================
  {
    content: 'Tentukan angka berikutnya dari deret: 2, 6, 18, 54, 162, ...',
    options: {
      A: '324',
      B: '486',
      C: '504',
      D: '468',
      E: '526',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'Tentukan angka berikutnya dari deret: 1, 1, 2, 3, 5, 8, 13, 21, ...',
    options: {
      A: '29',
      B: '32',
      C: '34',
      D: '36',
      E: '42',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content: 'Tentukan angka berikutnya dari deret: 3, 7, 15, 31, 63, ...',
    options: {
      A: '121',
      B: '125',
      C: '126',
      D: '127',
      E: '129',
    },
    correctAnswer: 'D',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN NUMERIK — ARITMATIKA & HITUNG CEPAT (3 soal) =====================
  {
    content:
      'Sebuah proyek pemerintah memiliki anggaran Rp 2,4 miliar. Pada tahap pertama telah digunakan 35% anggaran, dan pada tahap kedua digunakan 2/5 dari sisa anggaran tahap pertama. Berapa sisa anggaran yang belum digunakan?',
    options: {
      A: 'Rp 840.000.000',
      B: 'Rp 936.000.000',
      C: 'Rp 960.000.000',
      D: 'Rp 1.020.000.000',
      E: 'Rp 1.080.000.000',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Sebuah dinas memiliki 120 pegawai. Rasio pegawai laki-laki dan perempuan adalah 3:2. Jika 25% pegawai laki-laki dan 30% pegawai perempuan mengikuti pelatihan, berapa total pegawai yang mengikuti pelatihan?',
    options: {
      A: '28',
      B: '30',
      C: '32',
      D: '33',
      E: '36',
    },
    correctAnswer: 'D',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Harga suatu barang naik 20% dari harga awal, kemudian turun 20% dari harga setelah kenaikan. Jika harga akhir barang tersebut adalah Rp 960.000, maka harga awal barang tersebut adalah ...',
    options: {
      A: 'Rp 960.000',
      B: 'Rp 980.000',
      C: 'Rp 1.000.000',
      D: 'Rp 1.020.000',
      E: 'Rp 1.040.000',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN NUMERIK — PERBANDINGAN & RASIO (2 soal) =====================
  {
    content:
      'Tiga orang pegawai A, B, dan C mengerjakan proyek bersama. A dapat menyelesaikan proyek sendiri dalam 12 hari, B dalam 15 hari, dan C dalam 20 hari. Jika ketiganya bekerja bersama, berapa hari proyek tersebut selesai?',
    options: {
      A: '4 hari',
      B: '5 hari',
      C: '6 hari',
      D: '7 hari',
      E: '8 hari',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Perbandingan uang Adi, Budi, dan Citra adalah 3:5:7. Jika selisih uang Citra dan Adi adalah Rp 480.000, maka jumlah uang mereka bertiga adalah ...',
    options: {
      A: 'Rp 1.600.000',
      B: 'Rp 1.680.000',
      C: 'Rp 1.800.000',
      D: 'Rp 1.920.000',
      E: 'Rp 2.100.000',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN NUMERIK — ALJABAR & PERSAMAAN (2 soal) =====================
  {
    content:
      'Usia Pak Rahmat saat ini adalah 4 kali usia anaknya. Lima tahun lagi, usia Pak Rahmat menjadi 3 kali usia anaknya. Berapa usia Pak Rahmat saat ini?',
    options: {
      A: '36 tahun',
      B: '40 tahun',
      C: '44 tahun',
      D: '48 tahun',
      E: '52 tahun',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Sebuah bilangan terdiri dari dua angka. Jumlah kedua angkanya adalah 12. Jika posisi angka-angka tersebut dibalik, bilangan baru yang terbentuk lebih besar 36 dari bilangan semula. Bilangan semula tersebut adalah ...',
    options: {
      A: '39',
      B: '48',
      C: '57',
      D: '66',
      E: '75',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN NUMERIK — GEOMETRI & PENGUKURAN (2 soal) =====================
  {
    content:
      'Sebuah taman berbentuk lingkaran memiliki diameter 28 meter. Di sekeliling taman akan dibuat jalan setapak selebar 3,5 meter. Luas jalan setapak tersebut adalah ... (π = 22/7)',
    options: {
      A: '308 m²',
      B: '346,5 m²',
      C: '385 m²',
      D: '423,5 m²',
      E: '462 m²',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Sebuah bak penampungan air berbentuk balok memiliki ukuran panjang 2 m, lebar 1,5 m, dan tinggi 1 m. Jika bak tersebut telah terisi 3/4 bagian, berapa liter air yang dibutuhkan untuk mengisi bak hingga penuh?',
    options: {
      A: '500 liter',
      B: '600 liter',
      C: '750 liter',
      D: '1.000 liter',
      E: '2.250 liter',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN FIGURAL — POLA GAMBAR / SERI (4 soal) =====================
  {
    content:
      'Perhatikan pola berikut:\nBaris 1: ▲ ○ □\nBaris 2: ○ □ ▲\nBaris 3: □ ▲ ?\n\nBentuk yang tepat untuk menggantikan tanda "?" adalah ...',
    options: {
      A: '▲',
      B: '○',
      C: '□',
      D: '◇',
      E: '★',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Perhatikan pola angka pada matriks 3×3 berikut:\n| 2  | 5  | 8  |\n| 3  | 7  | 11 |\n| 4  | 9  | ?  |\n\nNilai yang tepat untuk menggantikan "?" adalah ...',
    options: {
      A: '12',
      B: '13',
      C: '14',
      D: '15',
      E: '16',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Perhatikan pola berikut:\nLangkah 1: Persegi dengan 1 garis diagonal\nLangkah 2: Persegi dengan 2 garis diagonal (membentuk X)\nLangkah 3: Persegi dengan 2 garis diagonal + 1 garis horizontal di tengah\nLangkah 4: Persegi dengan 2 garis diagonal + 1 garis horizontal + 1 garis vertikal di tengah\n\nBerapa total bagian (area) yang terbentuk di dalam persegi pada langkah 4?',
    options: {
      A: '4',
      B: '6',
      C: '8',
      D: '10',
      E: '12',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Sebuah pola terdiri dari titik-titik yang membentuk segitiga:\nPola 1: 1 titik\nPola 2: 3 titik\nPola 3: 6 titik\nPola 4: 10 titik\n\nBerapa jumlah titik pada Pola 7?',
    options: {
      A: '21',
      B: '24',
      C: '28',
      D: '32',
      E: '36',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN FIGURAL — ROTASI & CERMIN (3 soal) =====================
  {
    content:
      'Jika huruf "R" dicerminkan terhadap sumbu vertikal kemudian dirotasi 180° searah jarum jam, maka hasilnya akan terlihat seperti ...',
    options: {
      A: 'Huruf R tegak normal',
      B: 'Huruf R terbalik horizontal',
      C: 'Huruf R terbalik vertikal (kepala di bawah)',
      D: 'Huruf R terbalik horizontal dan vertikal',
      E: 'Huruf R miring 90°',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Sebuah kubus memiliki enam sisi dengan simbol berbeda: ★, ●, ▲, ■, ◆, ♥. Diketahui:\n- ★ berhadapan dengan ■\n- ● berhadapan dengan ◆\n- ▲ berhadapan dengan ♥\n\nJika sisi atas menunjukkan ★ dan sisi depan menunjukkan ●, maka sisi sebelah kanan adalah ...',
    options: {
      A: '▲ atau ♥',
      B: '■ atau ◆',
      C: '◆ atau ♥',
      D: '▲ atau ◆',
      E: '■ atau ▲',
    },
    correctAnswer: 'A',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Perhatikan pola berikut:\nGambar 1: Panah menunjuk ke ATAS\nGambar 2: Panah menunjuk ke KANAN (rotasi 90° searah jarum jam)\nGambar 3: Panah menunjuk ke BAWAH\nGambar 4: Panah menunjuk ke KIRI\nGambar 5: ?\n\nJika pola berlanjut, Gambar 5 menunjuk ke arah ...',
    options: {
      A: 'Atas',
      B: 'Kanan',
      C: 'Bawah',
      D: 'Kiri',
      E: 'Kanan atas (diagonal)',
    },
    correctAnswer: 'A',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },

  // ===================== KEMAMPUAN FIGURAL — PENALARAN SPASIAL (2 soal) =====================
  {
    content:
      'Sebuah kertas persegi dilipat menjadi dua secara horizontal, kemudian dilipat lagi menjadi dua secara vertikal. Lalu pada sudut yang merupakan titik pusat lipatan, digunting membentuk segitiga kecil. Ketika kertas dibuka kembali sepenuhnya, berapa lubang segitiga yang terbentuk?',
    options: {
      A: '1',
      B: '2',
      C: '3',
      D: '4',
      E: '8',
    },
    correctAnswer: 'D',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
  {
    content:
      'Sebuah jaring-jaring kubus terdiri dari 6 persegi yang disusun membentuk huruf "T" (1 persegi di atas dan 5 persegi berjajar vertikal di bawahnya). Jika persegi paling atas diberi tanda "X", saat jaring-jaring ini dilipat menjadi kubus, sisi yang berhadapan dengan "X" adalah persegi nomor berapa dari bawah?',
    options: {
      A: 'Persegi ke-1 (paling bawah)',
      B: 'Persegi ke-2 dari bawah',
      C: 'Persegi ke-3 dari bawah (tengah)',
      D: 'Persegi ke-4 dari bawah',
      E: 'Persegi ke-5 dari bawah (tepat di bawah X)',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TIU',
    optionScores: null,
  },
];

export default tiuQuestions;
