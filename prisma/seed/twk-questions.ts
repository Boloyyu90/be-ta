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

const twkQuestions: QuestionSeed[] = [
  // ===================== NASIONALISME (6 soal) =====================
  {
    content:
      'Seorang kepala daerah menolak menggunakan produk lokal dalam proyek pengadaan pemerintah dengan alasan produk impor lebih murah dan berkualitas. Ditinjau dari perspektif nasionalisme ekonomi, tindakan tersebut bertentangan dengan prinsip ...',
    options: {
      A: 'Efisiensi anggaran negara',
      B: 'Kemandirian dan kedaulatan ekonomi bangsa',
      C: 'Kebebasan perdagangan internasional',
      D: 'Prinsip good governance',
      E: 'Transparansi pengadaan barang dan jasa',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Dalam konteks masyarakat multikultural Indonesia, seorang ASN ditempatkan di daerah yang mayoritas penduduknya berbeda suku dan agama dengannya. Sikap yang paling mencerminkan semangat nasionalisme Pancasila adalah ...',
    options: {
      A: 'Membentuk komunitas eksklusif sesama suku asal untuk menjaga identitas budaya',
      B: 'Menghindari interaksi mendalam dengan masyarakat lokal untuk mencegah konflik',
      C: 'Beradaptasi dan berpartisipasi aktif dalam kegiatan masyarakat setempat tanpa meninggalkan jati diri',
      D: 'Mengajukan mutasi ke daerah yang memiliki kesamaan latar belakang budaya',
      E: 'Menjalankan tugas secara formal tanpa perlu memahami budaya lokal',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Pasal 33 UUD 1945 menyatakan bahwa bumi, air, dan kekayaan alam yang terkandung di dalamnya dikuasai oleh negara dan dipergunakan untuk sebesar-besar kemakmuran rakyat. Jika sebuah perusahaan asing menguasai 80% tambang strategis di suatu provinsi, maka hal ini bertentangan dengan prinsip ...',
    options: {
      A: 'Liberalisme ekonomi',
      B: 'Demokrasi ekonomi dan kedaulatan sumber daya nasional',
      C: 'Hak asasi manusia di bidang ekonomi',
      D: 'Otonomi daerah dalam pengelolaan sumber daya',
      E: 'Prinsip persaingan usaha yang sehat',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Fenomena meningkatnya penggunaan bahasa asing dalam ruang publik dan media sosial oleh generasi muda Indonesia sering dianggap sebagai ancaman terhadap identitas nasional. Analisis yang paling tepat terhadap fenomena ini dari sudut pandang nasionalisme budaya adalah ...',
    options: {
      A: 'Harus dilarang total karena merusak jati diri bangsa',
      B: 'Merupakan hal wajar karena globalisasi tidak dapat dihindari',
      C: 'Perlu keseimbangan antara keterbukaan global dan pelestarian bahasa serta budaya nasional sebagai identitas bangsa',
      D: 'Tidak perlu dikhawatirkan selama pertumbuhan ekonomi tetap baik',
      E: 'Sepenuhnya tanggung jawab Kementerian Pendidikan dan Kebudayaan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Sumpah Pemuda 1928 merupakan tonggak sejarah yang menegaskan persatuan bangsa Indonesia. Relevansi nilai Sumpah Pemuda dalam konteks era digital saat ini yang paling tepat adalah ...',
    options: {
      A: 'Menggunakan media sosial untuk mempromosikan suku dan daerah masing-masing',
      B: 'Menolak segala bentuk teknologi asing demi menjaga persatuan',
      C: 'Memanfaatkan teknologi digital untuk memperkuat kohesi sosial dan identitas nasional di tengah keberagaman',
      D: 'Membatasi akses internet agar tidak terjadi perpecahan',
      E: 'Membuat regulasi ketat tentang konten berbahasa daerah di media sosial',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Wawasan Nusantara memandang wilayah Indonesia sebagai satu kesatuan politik, ekonomi, sosial-budaya, dan pertahanan keamanan. Implementasi Wawasan Nusantara yang paling tepat dalam mengatasi disparitas pembangunan antara wilayah barat dan timur Indonesia adalah ...',
    options: {
      A: 'Memusatkan pembangunan di Pulau Jawa karena memiliki infrastruktur terbaik',
      B: 'Membangun konektivitas dan pemerataan infrastruktur strategis ke seluruh wilayah sebagai satu kesatuan ruang hidup bangsa',
      C: 'Memberikan otonomi penuh kepada setiap provinsi untuk membangun sendiri',
      D: 'Memindahkan seluruh industri ke wilayah timur Indonesia',
      E: 'Mengurangi anggaran pembangunan wilayah barat untuk dialihkan ke timur',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },

  // ===================== INTEGRITAS (6 soal) =====================
  {
    content:
      'Seorang ASN mengetahui bahwa atasannya melakukan mark-up anggaran proyek. Atasan tersebut menjanjikan promosi jabatan jika ASN tersebut bersedia menutup informasi ini. Berdasarkan prinsip integritas ASN, tindakan yang paling tepat adalah ...',
    options: {
      A: 'Menerima tawaran promosi karena merupakan hak karier',
      B: 'Mengabaikan karena bukan tanggung jawab langsung',
      C: 'Melaporkan melalui mekanisme Whistle Blowing System yang tersedia',
      D: 'Menyebarkan informasi ke media sosial agar publik mengetahui',
      E: 'Mengumpulkan bukti untuk digunakan sebagai alat negosiasi jabatan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Dalam pelaksanaan ujian CPNS, seorang peserta menemukan kunci jawaban yang bocor di media sosial. Tindakan yang mencerminkan integritas tertinggi adalah ...',
    options: {
      A: 'Menggunakan kunci jawaban tersebut karena semua peserta lain juga menggunakannya',
      B: 'Mengabaikan kunci jawaban dan melaporkan kebocoran tersebut kepada panitia penyelenggara',
      C: 'Menyimpan informasi tersebut untuk berjaga-jaga',
      D: 'Membagikan kunci jawaban kepada teman terdekat saja',
      E: 'Menunggu konfirmasi resmi apakah kunci jawaban tersebut benar atau tidak',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Seorang pejabat pengadaan barang mengetahui bahwa perusahaan milik saudaranya ikut dalam tender proyek pemerintah yang dia tangani. Menurut prinsip integritas dan conflict of interest, langkah yang paling tepat adalah ...',
    options: {
      A: 'Tetap menjalankan tugas secara profesional karena yakin bisa berlaku adil',
      B: 'Mengundurkan diri dari panitia pengadaan tersebut dan melaporkan potensi konflik kepentingan kepada atasan',
      C: 'Meminta saudaranya untuk mengundurkan diri dari tender',
      D: 'Mendiskualifikasi perusahaan saudaranya secara sepihak',
      E: 'Menjalankan tugas seperti biasa asalkan tidak ada bukti keberpihakan',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Nilai-nilai dasar ASN yang dikenal dengan BerAKHLAK mencakup Berorientasi Pelayanan, Akuntabel, Kompeten, Harmonis, Loyal, Adaptif, dan Kolaboratif. Seorang ASN yang menolak gratifikasi dari masyarakat saat memberikan pelayanan publik sedang mengimplementasikan nilai ...',
    options: {
      A: 'Berorientasi Pelayanan',
      B: 'Kompeten',
      C: 'Akuntabel',
      D: 'Harmonis',
      E: 'Loyal',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Seorang pegawai negeri diminta menandatangani dokumen laporan keuangan yang diketahuinya mengandung data fiktif. Atasannya mengancam akan memberikan penilaian kinerja buruk jika menolak. Prinsip integritas menuntut pegawai tersebut untuk ...',
    options: {
      A: 'Menandatangani dokumen demi menjaga hubungan baik dengan atasan',
      B: 'Menandatangani dengan catatan keberatan tertulis',
      C: 'Menolak menandatangani dan melaporkan melalui saluran resmi yang tersedia',
      D: 'Menunda penandatanganan sambil mencari posisi di instansi lain',
      E: 'Menandatangani kemudian melaporkan secara anonim setelahnya',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Transparency International secara rutin merilis Indeks Persepsi Korupsi (IPK). Jika Indonesia ingin meningkatkan peringkat IPK-nya, upaya yang paling fundamental dan berkelanjutan adalah ...',
    options: {
      A: 'Menambah jumlah lembaga pengawas anti-korupsi',
      B: 'Memperberat hukuman pidana bagi koruptor',
      C: 'Membangun budaya integritas dan sistem pencegahan korupsi yang terintegrasi di seluruh lini birokrasi',
      D: 'Membatasi kewenangan pejabat publik dalam mengelola anggaran',
      E: 'Meningkatkan gaji ASN secara signifikan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },

  // ===================== BELA NEGARA (6 soal) =====================
  {
    content:
      'Undang-Undang Nomor 23 Tahun 2019 tentang Pengelolaan Sumber Daya Nasional untuk Pertahanan Negara mengatur bahwa bela negara merupakan hak dan kewajiban setiap warga negara. Bentuk bela negara yang paling relevan bagi seorang ASN di era modern adalah ...',
    options: {
      A: 'Mengikuti wajib militer secara rutin',
      B: 'Melaksanakan tugas pelayanan publik secara profesional, inovatif, dan berorientasi pada kepentingan nasional',
      C: 'Bergabung dengan organisasi paramiliter',
      D: 'Menolak segala bentuk kerja sama internasional',
      E: 'Mengutamakan penggunaan kekerasan dalam menyelesaikan konflik',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Ancaman non-militer seperti serangan siber, hoaks, dan perang informasi semakin meningkat di era digital. Dalam konteks bela negara, peran strategis ASN menghadapi ancaman ini adalah ...',
    options: {
      A: 'Menghindari penggunaan media sosial sama sekali',
      B: 'Menjadi agen literasi digital dan kontra-narasi yang menyebarkan informasi akurat berbasis data',
      C: 'Membuat regulasi untuk menutup seluruh platform media sosial',
      D: 'Menyerahkan sepenuhnya kepada TNI dan Polri',
      E: 'Membuat akun anonim untuk melawan hoaks',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Pasal 27 ayat (3) UUD 1945 menyatakan bahwa setiap warga negara berhak dan wajib ikut serta dalam upaya pembelaan negara. Perwujudan bela negara dalam bidang ekonomi yang paling tepat adalah ...',
    options: {
      A: 'Menolak seluruh produk impor tanpa terkecuali',
      B: 'Mendukung dan mengembangkan UMKM serta produk dalam negeri untuk memperkuat kemandirian ekonomi nasional',
      C: 'Menerapkan proteksionisme ekonomi secara total',
      D: 'Menasionalisasi seluruh perusahaan asing',
      E: 'Memberikan subsidi tidak terbatas kepada semua sektor industri',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Kesadaran bela negara mencakup lima nilai dasar: cinta tanah air, kesadaran berbangsa dan bernegara, yakin Pancasila sebagai ideologi negara, rela berkorban, serta memiliki kemampuan awal bela negara. Seorang guru PNS di daerah terpencil yang tetap mengajar meski fasilitas minim paling mencerminkan nilai ...',
    options: {
      A: 'Memiliki kemampuan awal bela negara',
      B: 'Kesadaran berbangsa dan bernegara',
      C: 'Rela berkorban untuk bangsa dan negara',
      D: 'Cinta tanah air',
      E: 'Yakin Pancasila sebagai ideologi negara',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Indonesia memiliki wilayah perbatasan yang berbatasan langsung dengan beberapa negara tetangga. Permasalahan yang sering terjadi di wilayah perbatasan adalah rendahnya kesejahteraan masyarakat yang berpotensi mengikis nasionalisme. Strategi bela negara yang paling komprehensif untuk mengatasi hal ini adalah ...',
    options: {
      A: 'Menambah jumlah pos militer di seluruh perbatasan',
      B: 'Membangun infrastruktur, meningkatkan pelayanan publik, dan memperkuat ekonomi masyarakat perbatasan secara terpadu',
      C: 'Merelokasi penduduk perbatasan ke kota-kota besar',
      D: 'Menutup akses perdagangan lintas batas',
      E: 'Memberikan insentif finansial bulanan kepada semua penduduk perbatasan',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Konsep pertahanan semesta (total defense) menekankan keterlibatan seluruh komponen bangsa dalam sistem pertahanan negara. Dalam sistem pertahanan semesta, peran komponen cadangan dan komponen pendukung dibedakan berdasarkan ...',
    options: {
      A: 'Usia dan jenis kelamin warga negara',
      B: 'Tingkat pendidikan formal yang dimiliki',
      C: 'Fungsi dan kesiapan untuk dikerahkan dalam menghadapi ancaman militer dan non-militer',
      D: 'Domisili dan kedekatan dengan wilayah perbatasan',
      E: 'Status kepegawaian sebagai ASN atau non-ASN',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },

  // ===================== PILAR NEGARA (6 soal) =====================
  {
    content:
      'Pancasila sebagai dasar negara memiliki sifat hierarkis-piramidal, artinya sila-sila di dalamnya memiliki urutan yang berjenjang. Implikasi dari sifat ini dalam praktik bernegara adalah ...',
    options: {
      A: 'Sila kelima dapat mengesampingkan sila pertama dalam kondisi tertentu',
      B: 'Setiap sila yang lebih tinggi menjiwai sila di bawahnya, dan sila di bawah merupakan penjabaran sila di atasnya',
      C: 'Kelima sila bersifat independen dan dapat diterapkan secara terpisah',
      D: 'Sila pertama hanya berlaku dalam konteks keagamaan',
      E: 'Urutan sila dapat diubah sesuai kebutuhan zaman',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Pembukaan UUD 1945 alinea keempat memuat empat pokok pikiran yang menjadi landasan konstitusional negara Indonesia. Pokok pikiran yang menyatakan bahwa negara hendak mewujudkan keadilan sosial bagi seluruh rakyat Indonesia merupakan penjabaran dari ...',
    options: {
      A: 'Pokok pikiran pertama: Negara persatuan',
      B: 'Pokok pikiran kedua: Keadilan sosial',
      C: 'Pokok pikiran ketiga: Kedaulatan rakyat',
      D: 'Pokok pikiran keempat: Ketuhanan Yang Maha Esa',
      E: 'Pokok pikiran kelima: Kemanusiaan yang adil dan beradab',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'NKRI sebagai bentuk negara kesatuan menerapkan prinsip otonomi daerah. Jika suatu peraturan daerah (Perda) bertentangan dengan peraturan perundang-undangan yang lebih tinggi, maka berdasarkan hierarki perundang-undangan sesuai UU No. 12 Tahun 2011, mekanisme yang tepat adalah ...',
    options: {
      A: 'Perda tetap berlaku karena merupakan produk hukum daerah yang otonom',
      B: 'Perda dapat dibatalkan melalui mekanisme judicial review di Mahkamah Agung',
      C: 'Perda secara otomatis batal demi hukum tanpa proses apapun',
      D: 'Perda hanya dapat dibatalkan melalui referendum daerah',
      E: 'Perda dibekukan sementara sampai dilakukan amandemen',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Bhinneka Tunggal Ika sebagai semboyan negara mengandung makna filosofis yang mendalam. Perbedaan mendasar antara konsep "pluralisme" dalam Bhinneka Tunggal Ika dengan konsep "multikulturalisme" ala Barat adalah ...',
    options: {
      A: 'Tidak ada perbedaan, keduanya identik',
      B: 'Bhinneka Tunggal Ika menekankan keberagaman yang bermuara pada persatuan dengan Pancasila sebagai titik temu, sedangkan multikulturalisme Barat menekankan koeksistensi tanpa titik temu ideologis',
      C: 'Multikulturalisme Barat lebih menghargai perbedaan',
      D: 'Bhinneka Tunggal Ika menolak keberagaman budaya asing',
      E: 'Multikulturalisme Barat lebih cocok diterapkan di Indonesia',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Dalam sistem ketatanegaraan Indonesia pasca-amandemen UUD 1945, tidak ada lagi lembaga tertinggi negara. Semua lembaga negara memiliki kedudukan yang sejajar dengan fungsi checks and balances. Jika DPR mengesahkan RUU yang dinilai bertentangan dengan UUD 1945, lembaga yang berwenang mengujinya adalah ...',
    options: {
      A: 'Mahkamah Agung',
      B: 'Komisi Yudisial',
      C: 'Mahkamah Konstitusi',
      D: 'Dewan Perwakilan Daerah',
      E: 'Badan Pemeriksa Keuangan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Tap MPRS No. XXV/MPRS/1966 tentang pembubaran PKI dan pelarangan paham komunisme/Marxisme-Leninisme di Indonesia merupakan bagian dari upaya menjaga Pancasila sebagai ideologi negara. Dari perspektif ketatanegaraan, alasan fundamental pelarangan tersebut adalah ...',
    options: {
      A: 'Komunisme merupakan ideologi yang secara historis pernah melakukan pemberontakan terhadap NKRI',
      B: 'Komunisme bertentangan secara diametral dengan sila pertama Pancasila yaitu Ketuhanan Yang Maha Esa',
      C: 'Komunisme hanya merugikan kelompok tertentu dalam masyarakat',
      D: 'Pelarangan dilakukan semata-mata karena tekanan internasional',
      E: 'Komunisme tidak sesuai dengan sistem ekonomi pasar',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },

  // ===================== BAHASA INDONESIA (6 soal) =====================
  {
    content:
      'Perhatikan kalimat berikut: "Berdasarkan data yang dihimpun, pertumbuhan ekonomi kuartal ketiga mengalami peningkatan yang signifikan, sehingga pemerintah optimis target pertumbuhan tahunan dapat tercapai." Kalimat tersebut termasuk jenis kalimat ...',
    options: {
      A: 'Kalimat tunggal',
      B: 'Kalimat majemuk setara',
      C: 'Kalimat majemuk bertingkat',
      D: 'Kalimat majemuk campuran',
      E: 'Kalimat pasif intransitif',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Dalam penulisan karya ilmiah, penggunaan ejaan yang tepat sangat penting. Manakah penulisan yang sesuai dengan PUEBI (Pedoman Umum Ejaan Bahasa Indonesia) yang benar?',
    options: {
      A: 'Surat Keterangan tersebut di tanda tangani oleh Kepala Dinas.',
      B: 'Surat keterangan tersebut ditandatangani oleh kepala dinas.',
      C: 'surat keterangan tersebut ditandatangani oleh Kepala Dinas.',
      D: 'Surat keterangan tersebut ditanda-tangani oleh kepala dinas.',
      E: 'Surat keterangan tersebut di-tandatangani oleh Kepala Dinas.',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Perhatikan paragraf berikut: "Digitalisasi pelayanan publik merupakan langkah strategis dalam reformasi birokrasi. ________ Dengan sistem yang terintegrasi, masyarakat dapat mengakses layanan pemerintah kapan saja dan di mana saja tanpa harus mengunjungi kantor secara fisik." Kalimat yang paling tepat untuk mengisi bagian rumpang tersebut adalah ...',
    options: {
      A: 'Namun, tidak semua masyarakat memiliki akses internet.',
      B: 'Hal ini bertujuan untuk meningkatkan efisiensi, transparansi, dan aksesibilitas layanan bagi seluruh masyarakat.',
      C: 'Selain itu, anggaran pemerintah juga harus ditingkatkan.',
      D: 'Akan tetapi, banyak ASN yang belum menguasai teknologi informasi.',
      E: 'Di sisi lain, pelayanan manual tetap harus dipertahankan.',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Perhatikan kalimat-kalimat berikut:\n1. Ia berhasil meraih juara pertama di antara 500 peserta.\n2. Diantara semua peserta, ia yang paling menonjol.\n3. Di antara banyak pilihan, kebijakan ini yang paling tepat.\n4. Kejadian itu terjadi diantara tahun 2020 dan 2023.\n\nKalimat yang menggunakan penulisan "di antara" secara tepat terdapat pada nomor ...',
    options: {
      A: '1 dan 2',
      B: '2 dan 3',
      C: '1 dan 3',
      D: '3 dan 4',
      E: '1 dan 4',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Seorang ASN harus mampu menyusun naskah dinas yang baik dan benar. Perhatikan penggalan surat dinas berikut: "Sehubungan dengan hal tersebut di atas, kami bermaksud mengundang Bapak/Ibu untuk menghadiri rapat koordinasi yang akan dilaksanakan pada:" Kesalahan penggunaan bahasa dalam penggalan surat tersebut adalah ...',
    options: {
      A: 'Penggunaan kata "sehubungan"',
      B: 'Penggunaan frasa "tersebut di atas" yang seharusnya "tersebut"',
      C: 'Penggunaan kata "bermaksud"',
      D: 'Penggunaan kata "menghadiri"',
      E: 'Penggunaan tanda titik dua (:) di akhir kalimat',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
  {
    content:
      'Bacalah paragraf berikut dengan cermat: "Pemerintah telah mencanangkan program pembangunan infrastruktur secara masif di berbagai wilayah Indonesia. Program ini diharapkan mampu mempercepat konektivitas antardaerah, mengurangi disparitas ekonomi, serta meningkatkan daya saing nasional di kancah global." Gagasan utama paragraf tersebut adalah ...',
    options: {
      A: 'Konektivitas antardaerah di Indonesia masih rendah',
      B: 'Program pembangunan infrastruktur masif pemerintah untuk memperkuat konektivitas, pemerataan, dan daya saing nasional',
      C: 'Disparitas ekonomi antarwilayah harus segera diatasi',
      D: 'Daya saing nasional Indonesia di kancah global menurun',
      E: 'Pembangunan hanya difokuskan pada sektor infrastruktur',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TWK',
    optionScores: null,
  },
];

export default twkQuestions;
