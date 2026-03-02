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

const tkpQuestions: QuestionSeed[] = [
  // ===================== PELAYANAN PUBLIK (8 soal) =====================
  {
    content:
      'Anda adalah petugas loket pelayanan. Seorang lansia datang mendekati jam tutup loket dengan dokumen yang tidak lengkap dan tampak kebingungan. Langkah yang Anda ambil adalah ...',
    options: {
      A: 'Menolak karena dokumen tidak lengkap dan jam layanan hampir habis',
      B: 'Meminta lansia tersebut datang kembali esok hari dengan dokumen lengkap',
      C: 'Membantu mengidentifikasi dokumen yang kurang, memberikan checklist, lalu menjadwalkan kunjungan ulang dengan prioritas',
      D: 'Menerima dokumen apa adanya dan memprosesnya meskipun tidak lengkap',
      E: 'Membantu mengidentifikasi dokumen yang kurang dan mengarahkan ke petugas informasi',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Instansi Anda menerima banyak keluhan masyarakat tentang lamanya waktu pengurusan dokumen. Sebagai ASN yang bertanggung jawab, tindakan Anda adalah ...',
    options: {
      A: 'Menjelaskan kepada masyarakat bahwa prosedur memang membutuhkan waktu lama',
      B: 'Mengusulkan kajian penyederhanaan prosedur dan digitalisasi layanan kepada atasan disertai data analisis keluhan',
      C: 'Mempercepat proses secara sepihak dengan melewati beberapa tahap verifikasi',
      D: 'Menambah jam kerja lembur untuk mengurangi antrean',
      E: 'Membuat papan informasi estimasi waktu pengurusan agar masyarakat lebih sabar',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 5, C: 2, D: 3, E: 4 },
  },
  {
    content:
      'Seorang warga berkebutuhan khusus (disabilitas) datang untuk mengurus administrasi di kantor Anda, namun fasilitas aksesibilitas belum tersedia. Yang Anda lakukan adalah ...',
    options: {
      A: 'Menyarankan warga tersebut untuk mewakilkan pengurusan kepada keluarganya',
      B: 'Membantu warga tersebut secara langsung dan mengusulkan perbaikan fasilitas aksesibilitas secara resmi kepada pimpinan',
      C: 'Membantu warga tersebut semampunya di tempat yang ada',
      D: 'Mengarahkan warga tersebut ke kantor cabang lain yang memiliki fasilitas aksesibilitas',
      E: 'Mencatat keluhan dan berjanji fasilitas akan segera diperbaiki',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 5, C: 4, D: 2, E: 3 },
  },
  {
    content:
      'Anda bertugas di unit pelayanan publik dan mendapati rekan kerja yang sering bersikap kasar kepada masyarakat. Tindakan yang paling tepat adalah ...',
    options: {
      A: 'Mendiamkan saja karena bukan urusan Anda',
      B: 'Melaporkan langsung ke media sosial agar rekan tersebut jera',
      C: 'Mendiskusikan secara empat mata dengan rekan tersebut tentang pentingnya pelayanan prima, dan jika tidak berubah, melaporkan ke atasan',
      D: 'Memberi contoh pelayanan yang baik tanpa menegur rekan tersebut',
      E: 'Langsung melaporkan ke atasan tanpa berbicara terlebih dahulu dengan rekan tersebut',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 4, E: 3 },
  },
  {
    content:
      'Anda menerima pengaduan masyarakat mengenai layanan di unit kerja yang bukan tanggung jawab Anda. Sikap Anda adalah ...',
    options: {
      A: 'Menolak pengaduan karena bukan wewenang Anda',
      B: 'Menerima pengaduan tersebut dan memprosesnya sendiri meskipun bukan wewenang Anda',
      C: 'Menerima pengaduan dengan baik, mencatat detail permasalahan, lalu mengarahkan ke unit terkait dan memastikan pengaduan ditindaklanjuti',
      D: 'Menyarankan masyarakat untuk datang langsung ke unit kerja yang bersangkutan',
      E: 'Menerima pengaduan dan meneruskannya ke unit terkait tanpa penjelasan lebih lanjut',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Sistem antrean online di instansi Anda mengalami gangguan teknis sehingga banyak masyarakat datang tanpa nomor antrean. Sebagai petugas, tindakan Anda adalah ...',
    options: {
      A: 'Menolak melayani masyarakat yang tidak memiliki nomor antrean karena harus sesuai prosedur',
      B: 'Membuat sistem antrean manual sementara, menginformasikan situasi kepada masyarakat, dan berkoordinasi dengan tim IT untuk pemulihan',
      C: 'Melayani siapa saja yang datang lebih dulu tanpa sistem antrean',
      D: 'Menutup loket pelayanan sampai sistem kembali normal',
      E: 'Meminta masyarakat untuk menunggu sampai sistem pulih',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 5, C: 3, D: 1, E: 4 },
  },
  {
    content:
      'Seorang masyarakat mengajukan keluhan keras dan emosional di loket pelayanan Anda karena merasa dipersulit. Respons terbaik Anda adalah ...',
    options: {
      A: 'Membalas dengan nada tegas agar masyarakat tersebut tidak semena-mena',
      B: 'Mengabaikan keluhan dan meminta masyarakat tersebut menunggu giliran',
      C: 'Memanggil satpam untuk menertibkan masyarakat tersebut',
      D: 'Mendengarkan keluhan dengan tenang, berempati, mengidentifikasi akar masalah, dan menawarkan solusi konkret',
      E: 'Meminta maaf dan langsung mengabulkan semua permintaan masyarakat tersebut',
    },
    correctAnswer: 'D',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 3, D: 5, E: 4 },
  },
  {
    content:
      'Anda ditugaskan membuat inovasi pelayanan publik. Setelah riset, Anda menemukan bahwa mayoritas masyarakat di wilayah kerja Anda adalah lansia yang gagap teknologi. Langkah inovasi yang paling tepat adalah ...',
    options: {
      A: 'Tetap membuat aplikasi digital karena sesuai dengan arahan pemerintah pusat',
      B: 'Tidak membuat inovasi digital karena masyarakat tidak siap',
      C: 'Merancang layanan hybrid: digital untuk yang mampu, dan layanan tatap muka yang disederhanakan untuk lansia, disertai pendampingan',
      D: 'Meminta keluarga lansia untuk mengurus semua administrasi secara digital',
      E: 'Membuat layanan digital dengan panduan manual berbentuk brosur',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 5, D: 3, E: 4 },
  },

  // ===================== JEJARING KERJA (8 soal) =====================
  {
    content:
      'Anda baru saja dipindahtugaskan ke unit kerja baru yang memiliki budaya kerja sangat berbeda dari unit sebelumnya. Langkah pertama yang Anda ambil adalah ...',
    options: {
      A: 'Langsung menerapkan cara kerja dari unit sebelumnya karena terbukti efektif',
      B: 'Mengobservasi budaya kerja baru, membangun relasi dengan rekan, lalu secara bertahap berkontribusi dengan memadukan pengalaman dan budaya setempat',
      C: 'Bekerja secara independen sambil mempelajari situasi',
      D: 'Meminta atasan baru untuk mengubah budaya kerja agar sesuai dengan kebiasaan Anda',
      E: 'Mengikuti semua budaya kerja baru tanpa memberikan masukan apapun',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 5, C: 3, D: 1, E: 4 },
  },
  {
    content:
      'Dalam sebuah rapat lintas unit, terjadi perbedaan pendapat yang tajam antara unit Anda dan unit lain mengenai pembagian anggaran proyek bersama. Sikap Anda adalah ...',
    options: {
      A: 'Mempertahankan posisi unit Anda dengan segala cara',
      B: 'Mengalah sepenuhnya demi menjaga harmoni',
      C: 'Menyajikan data dan fakta secara objektif, mencari titik temu yang menguntungkan kedua belah pihak, dan mengusulkan solusi kolaboratif',
      D: 'Menyerahkan keputusan sepenuhnya kepada pimpinan',
      E: 'Menghindari konflik dengan tidak hadir di rapat berikutnya',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 3, C: 5, D: 4, E: 1 },
  },
  {
    content:
      'Anda diminta memimpin tim lintas bidang untuk proyek strategis, namun beberapa anggota tim memiliki jabatan lebih tinggi dari Anda. Yang Anda lakukan adalah ...',
    options: {
      A: 'Menolak tugas karena merasa tidak layak memimpin orang yang jabatannya lebih tinggi',
      B: 'Memimpin dengan gaya otoriter agar semua anggota patuh',
      C: 'Membangun komunikasi terbuka, menghargai pengalaman setiap anggota, dan memimpin berbasis kompetensi serta pembagian peran yang jelas',
      D: 'Mendelegasikan seluruh pekerjaan kepada anggota yang jabatannya lebih tinggi',
      E: 'Memimpin secara formal tetapi dalam praktik mengikuti arahan anggota yang jabatannya lebih tinggi',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Rekan kerja Anda dari divisi lain meminta bantuan untuk menyelesaikan tugasnya yang mendesak, sementara Anda juga memiliki deadline pekerjaan sendiri. Sikap Anda adalah ...',
    options: {
      A: 'Menolak karena harus fokus pada tugas sendiri',
      B: 'Membantu rekan tersebut dan mengorbankan deadline pekerjaan sendiri',
      C: 'Mengevaluasi prioritas, menawarkan bantuan dalam kapasitas yang tidak mengganggu deadline Anda, dan jika perlu berkoordinasi dengan atasan',
      D: 'Menyarankan rekan tersebut meminta bantuan ke orang lain',
      E: 'Membantu setelah pekerjaan sendiri selesai meskipun mungkin terlambat bagi rekan tersebut',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 3, C: 5, D: 1, E: 4 },
  },
  {
    content:
      'Anda diundang ke forum diskusi kebijakan bersama stakeholder dari sektor swasta, akademisi, dan LSM. Peran terbaik yang Anda ambil dalam forum tersebut adalah ...',
    options: {
      A: 'Hanya mendengarkan karena merasa belum berpengalaman',
      B: 'Mendominasi diskusi untuk menunjukkan kapabilitas instansi Anda',
      C: 'Berpartisipasi aktif dengan menyampaikan perspektif pemerintah, mendengarkan masukan stakeholder, dan membangun jejaring untuk kolaborasi berkelanjutan',
      D: 'Mencatat semua pembahasan untuk dilaporkan ke atasan tanpa memberikan pendapat',
      E: 'Memberikan pendapat hanya jika diminta oleh moderator',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Proyek kolaborasi antara instansi Anda dan instansi lain mengalami hambatan karena perbedaan sistem birokrasi. Tindakan Anda sebagai koordinator proyek adalah ...',
    options: {
      A: 'Menunggu instruksi dari pimpinan kedua instansi',
      B: 'Menyelesaikan proyek secara sepihak tanpa melibatkan instansi partner',
      C: 'Menginisiasi pertemuan koordinasi, mengidentifikasi bottleneck, dan menyusun SOP bersama yang mengakomodasi kedua sistem',
      D: 'Melaporkan hambatan dan meminta proyek dibatalkan',
      E: 'Mengikuti sistem birokrasi instansi partner sepenuhnya untuk menghindari konflik',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 3, B: 1, C: 5, D: 2, E: 4 },
  },
  {
    content:
      'Seorang rekan kerja selalu mengklaim hasil kerja tim sebagai prestasinya sendiri di hadapan pimpinan. Sikap Anda adalah ...',
    options: {
      A: 'Melakukan hal serupa untuk melindungi kontribusi Anda',
      B: 'Membiarkan saja karena yang penting pekerjaan selesai',
      C: 'Mendiskusikan secara terbuka dengan rekan tersebut tentang pentingnya pengakuan kontribusi tim, dan mengusulkan mekanisme pelaporan yang transparan',
      D: 'Melaporkan langsung ke pimpinan bahwa rekan tersebut berbohong',
      E: 'Mengurangi kontribusi Anda dalam tim sebagai bentuk protes',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 3, C: 5, D: 4, E: 2 },
  },
  {
    content:
      'Anda ditunjuk sebagai perwakilan instansi dalam konferensi internasional. Menjelang acara, Anda menyadari kemampuan bahasa Inggris Anda kurang memadai. Langkah yang Anda ambil adalah ...',
    options: {
      A: 'Menolak penunjukan dan merekomendasikan rekan yang lebih fasih berbahasa Inggris',
      B: 'Mengikuti konferensi dan mengandalkan penerjemah yang disediakan panitia',
      C: 'Menerima penunjukan, mempersiapkan materi presentasi dengan matang, berlatih intensif, dan berkoordinasi dengan bagian kerja sama internasional untuk pendampingan',
      D: 'Hadir di konferensi tetapi tidak aktif berpartisipasi',
      E: 'Meminta jadwal konferensi ditunda sampai Anda siap',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 3, B: 4, C: 5, D: 1, E: 2 },
  },

  // ===================== SOSIAL BUDAYA (7 soal) =====================
  {
    content:
      'Anda bertugas di daerah yang memiliki kearifan lokal berupa musyawarah adat sebelum melaksanakan proyek pembangunan. Namun, deadline proyek sangat ketat. Sikap Anda adalah ...',
    options: {
      A: 'Mengabaikan musyawarah adat karena deadline lebih penting',
      B: 'Mengikuti proses musyawarah adat sambil bernegosiasi untuk mempercepat prosesnya, dan menyesuaikan timeline proyek secara realistis',
      C: 'Melaporkan ke pusat bahwa proyek tidak bisa dilaksanakan karena kendala budaya',
      D: 'Meminta pemimpin adat untuk membatalkan musyawarah demi kepentingan proyek',
      E: 'Melaksanakan musyawarah adat secara penuh meskipun deadline terlewati',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 5, C: 2, D: 3, E: 4 },
  },
  {
    content:
      'Di lingkungan kerja Anda, terdapat rekan yang berasal dari berbagai latar belakang suku dan agama. Saat ada perayaan hari besar agama tertentu, sikap Anda adalah ...',
    options: {
      A: 'Tidak peduli karena bukan hari raya agama Anda',
      B: 'Ikut merayakan secara aktif meskipun berbeda agama',
      C: 'Memberikan ucapan selamat, menghormati perayaan tersebut, dan berpartisipasi dalam kegiatan yang bersifat sosial tanpa mencampuri aspek ritual keagamaan',
      D: 'Menghindari rekan yang merayakan agar tidak terjadi kesalahpahaman',
      E: 'Mengucapkan selamat hanya di media sosial tanpa interaksi langsung',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 3, C: 5, D: 2, E: 4 },
  },
  {
    content:
      'Anda ditugaskan membuat kebijakan pelayanan publik di daerah yang masyarakatnya masih kental dengan budaya patriarki. Banyak perempuan yang enggan datang sendiri ke kantor pelayanan. Pendekatan terbaik Anda adalah ...',
    options: {
      A: 'Membuat kebijakan yang mengharuskan perempuan datang sendiri untuk mendorong kesetaraan gender',
      B: 'Mengizinkan perwakilan keluarga laki-laki untuk mengurus semua administrasi perempuan',
      C: 'Merancang layanan jemput bola ke komunitas, menyediakan petugas perempuan, dan secara bertahap mengedukasi tentang kesetaraan akses layanan',
      D: 'Membuat loket terpisah khusus perempuan',
      E: 'Memfasilitasi layanan online agar perempuan tidak perlu datang ke kantor',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Saat bertugas di unit pelayanan, Anda mendengar rekan kerja melontarkan candaan yang bersifat stereotip terhadap suku tertentu. Respons Anda adalah ...',
    options: {
      A: 'Ikut tertawa agar tidak dianggap tidak humoris',
      B: 'Mengabaikan karena hanya candaan',
      C: 'Secara sopan mengingatkan rekan tersebut bahwa candaan stereotip dapat menyakiti dan tidak sesuai dengan nilai-nilai ASN yang menghargai keberagaman',
      D: 'Langsung melaporkan ke atasan sebagai pelanggaran etika',
      E: 'Menasihati rekan tersebut secara diam-diam setelah jam kerja',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Anda memimpin program pemberdayaan masyarakat di desa tertinggal. Masyarakat setempat menolak program karena merasa tidak dilibatkan dalam perencanaan. Langkah terbaik Anda adalah ...',
    options: {
      A: 'Tetap melaksanakan program karena sudah direncanakan dari pusat',
      B: 'Membatalkan program dan mengembalikan anggaran',
      C: 'Menunda program, melakukan musyawarah partisipatif dengan masyarakat untuk merevisi rencana, lalu melaksanakan program yang telah disepakati bersama',
      D: 'Membujuk tokoh masyarakat dengan insentif agar mendukung program',
      E: 'Menjelaskan manfaat program secara intensif melalui sosialisasi',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Anda bertugas di wilayah yang terdapat konflik sosial berkepanjangan antara dua kelompok masyarakat. Sebagai ASN, peran Anda yang paling tepat adalah ...',
    options: {
      A: 'Tidak ikut campur karena bukan domain pekerjaan Anda',
      B: 'Berpihak pada kelompok yang lebih besar agar mendapat dukungan mayoritas',
      C: 'Menjadi mediator netral, memfasilitasi dialog antar kelompok, dan menginisiasi program bersama yang membangun kohesi sosial',
      D: 'Melaporkan konflik ke pihak keamanan dan menyerahkan penanganan sepenuhnya',
      E: 'Membuat program pelayanan terpisah untuk masing-masing kelompok',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 4, E: 3 },
  },
  {
    content:
      'Di kantor Anda, seorang rekan dari suku tertentu merasa terisolasi karena perbedaan bahasa dan budaya sehingga kinerjanya menurun. Sebagai rekan kerja, sikap Anda adalah ...',
    options: {
      A: 'Membiarkan karena ia harus beradaptasi sendiri',
      B: 'Melaporkan penurunan kinerja rekan tersebut kepada atasan',
      C: 'Mengajak rekan tersebut berinteraksi, membantu adaptasi budaya, dan menciptakan lingkungan inklusif yang menghargai perbedaan',
      D: 'Menyarankan rekan tersebut untuk mutasi ke daerah asalnya',
      E: 'Memahami situasinya tetapi menunggu ia yang berinisiatif meminta bantuan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },

  // ===================== TEKNOLOGI INFORMASI DAN KOMUNIKASI (7 soal) =====================
  {
    content:
      'Instansi Anda berencana mengimplementasikan sistem e-government baru, namun banyak pegawai senior yang menolak karena merasa tidak mampu mengoperasikan teknologi baru. Langkah terbaik Anda adalah ...',
    options: {
      A: 'Menunda implementasi sampai pegawai senior pensiun',
      B: 'Memaksa semua pegawai menggunakan sistem baru dengan sanksi bagi yang menolak',
      C: 'Merancang program pelatihan bertahap sesuai kemampuan, menyediakan pendampingan, dan menjalankan sistem paralel selama masa transisi',
      D: 'Mengecualikan pegawai senior dari penggunaan sistem baru',
      E: 'Merekrut pegawai baru yang menguasai teknologi untuk menggantikan pegawai senior',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 3, C: 5, D: 1, E: 4 },
  },
  {
    content:
      'Anda menemukan kerentanan keamanan pada sistem informasi instansi yang berpotensi membocorkan data pribadi masyarakat. Tindakan pertama Anda adalah ...',
    options: {
      A: 'Mengumumkan kerentanan tersebut di media sosial agar masyarakat waspada',
      B: 'Segera melaporkan kerentanan kepada tim keamanan IT dan atasan melalui jalur resmi, serta mendokumentasikan temuan secara detail',
      C: 'Mencoba memperbaiki sendiri karena Anda memiliki pengetahuan IT',
      D: 'Mengabaikan karena bukan tanggung jawab Anda sebagai non-IT',
      E: 'Menunggu sampai ada insiden kebocoran data sebelum melaporkan',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 5, C: 3, D: 1, E: 4 },
  },
  {
    content:
      'Anda menerima email resmi yang meminta Anda mengklik tautan untuk memperbarui data kepegawaian. Tautan mengarah ke situs yang tampak mirip portal resmi instansi tetapi URL-nya sedikit berbeda. Sikap Anda adalah ...',
    options: {
      A: 'Langsung mengklik karena tampilannya sama dengan portal resmi',
      B: 'Mengklik tautan tetapi tidak mengisi data apapun',
      C: 'Tidak mengklik tautan, memverifikasi keaslian email ke bagian IT atau pengirim resmi, dan melaporkan sebagai potensi phishing',
      D: 'Mengabaikan email dan menghapusnya',
      E: 'Menanyakan ke rekan kerja apakah mereka juga menerima email yang sama',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 4, E: 3 },
  },
  {
    content:
      'Atasan Anda meminta analisis data besar (big data) untuk mendukung pengambilan kebijakan, namun Anda belum menguasai tools analitik yang diperlukan. Tindakan Anda adalah ...',
    options: {
      A: 'Menolak tugas dengan alasan di luar kompetensi Anda',
      B: 'Menerima tugas dan mengerjakan analisis secara manual dengan spreadsheet biasa',
      C: 'Menerima tugas, segera mempelajari tools yang diperlukan, berkonsultasi dengan rekan yang ahli, dan menyajikan hasil analisis sesuai deadline',
      D: 'Mendelegasikan seluruh tugas ke rekan yang lebih ahli',
      E: 'Menerima tugas tetapi meminta perpanjangan deadline yang sangat lama',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 3, C: 5, D: 4, E: 2 },
  },
  {
    content:
      'Instansi Anda ingin meningkatkan transparansi pengelolaan anggaran melalui portal data terbuka (open data). Beberapa pejabat keberatan karena khawatir data disalahgunakan. Sikap Anda sebagai pengelola TI adalah ...',
    options: {
      A: 'Membuka semua data tanpa filter karena prinsip transparansi',
      B: 'Menunda open data sampai semua pejabat setuju',
      C: 'Merancang kebijakan klasifikasi data yang memisahkan data publik dan sensitif, menerapkan anonimisasi data personal, dan mengedukasi stakeholder tentang manfaat open data',
      D: 'Membatalkan rencana open data karena risiko terlalu besar',
      E: 'Membuka data dalam format yang sulit diakses sehingga hanya pihak tertentu yang bisa memanfaatkan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 3, C: 5, D: 1, E: 4 },
  },
  {
    content:
      'Anda mengelola media sosial resmi instansi dan menerima komentar viral berisi kritik pedas terhadap kebijakan instansi. Tanggapan terbaik Anda adalah ...',
    options: {
      A: 'Menghapus komentar tersebut untuk menjaga citra instansi',
      B: 'Merespons dengan membantah kritik menggunakan bahasa yang tegas',
      C: 'Merespons secara profesional dengan mengapresiasi masukan, memberikan klarifikasi berbasis data, dan membuka kanal komunikasi lebih lanjut',
      D: 'Mengabaikan komentar dan menunggu sampai tidak viral lagi',
      E: 'Melaporkan akun pemberi komentar ke platform media sosial',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 3, C: 5, D: 1, E: 4 },
  },
  {
    content:
      'Anda diminta mendigitalisasi arsip instansi yang jumlahnya ribuan dokumen. Anggaran terbatas dan waktu mepet. Strategi terbaik Anda adalah ...',
    options: {
      A: 'Mendigitalisasi semua dokumen secara acak tanpa prioritas',
      B: 'Meminta penambahan anggaran dan menunda proyek hingga anggaran cukup',
      C: 'Memprioritaskan dokumen berdasarkan tingkat urgensi dan frekuensi penggunaan, menggunakan teknologi OCR, dan membuat rencana digitalisasi bertahap',
      D: 'Mendigitalisasi hanya dokumen tahun berjalan dan mengabaikan arsip lama',
      E: 'Mengalihdayakan seluruh proses ke vendor tanpa pengawasan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 3, C: 5, D: 4, E: 2 },
  },

  // ===================== PROFESIONALISME (8 soal) =====================
  {
    content:
      'Anda mendapat tugas yang deadlinenya sangat ketat bersamaan dengan tugas rutin harian yang juga harus diselesaikan. Manajemen prioritas terbaik yang Anda lakukan adalah ...',
    options: {
      A: 'Fokus pada tugas baru dan mengabaikan tugas rutin',
      B: 'Lembur setiap hari sampai semua tugas selesai tanpa mempertimbangkan kesehatan',
      C: 'Memetakan semua tugas berdasarkan urgensi dan dampak, mendelegasikan yang bisa didelegasikan, dan berkomunikasi dengan atasan tentang prioritas',
      D: 'Menyelesaikan tugas rutin terlebih dahulu baru mengerjakan tugas baru',
      E: 'Meminta rekan kerja mengerjakan tugas baru karena Anda sudah memiliki tugas rutin',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 3, C: 5, D: 4, E: 1 },
  },
  {
    content:
      'Anda diberikan kesempatan mengikuti pendidikan dan pelatihan (diklat) di luar kota selama 2 minggu, namun saat bersamaan ada proyek penting di kantor. Keputusan terbaik Anda adalah ...',
    options: {
      A: 'Menolak diklat karena proyek kantor lebih penting',
      B: 'Mengikuti diklat dan mengabaikan proyek',
      C: 'Berkoordinasi dengan atasan dan tim untuk menyusun rencana delegasi proyek selama Anda diklat, serta tetap memantau perkembangan proyek secara remote',
      D: 'Meminta penundaan diklat ke periode berikutnya',
      E: 'Mengikuti diklat setengah waktu dan pulang pergi untuk mengurus proyek',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 5, D: 4, E: 3 },
  },
  {
    content:
      'Hasil evaluasi kinerja tahunan Anda menunjukkan nilai di bawah rata-rata pada aspek inovasi. Respons profesional Anda adalah ...',
    options: {
      A: 'Merasa tidak adil karena Anda sudah bekerja keras',
      B: 'Menyalahkan atasan yang tidak memberikan kesempatan berinovasi',
      C: 'Menerima evaluasi secara terbuka, mengidentifikasi area yang perlu diperbaiki, menyusun rencana pengembangan diri, dan proaktif mencari peluang inovasi',
      D: 'Menerima evaluasi dan berjanji akan lebih baik tanpa rencana konkret',
      E: 'Mempertanyakan metodologi evaluasi kepada HRD',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Anda menyadari bahwa kebijakan yang ditetapkan atasan berpotensi merugikan masyarakat, meskipun legal secara hukum. Sikap profesional Anda adalah ...',
    options: {
      A: 'Menjalankan kebijakan tanpa pertanyaan karena itu perintah atasan',
      B: 'Menolak menjalankan kebijakan tersebut secara terbuka',
      C: 'Menyampaikan analisis dampak secara tertulis dan objektif kepada atasan, mengusulkan alternatif kebijakan yang lebih berpihak pada masyarakat',
      D: 'Menjalankan kebijakan sambil diam-diam membocorkan ke media',
      E: 'Mengikuti kebijakan tetapi mencatat keberatan secara pribadi',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 3, B: 2, C: 5, D: 1, E: 4 },
  },
  {
    content:
      'Anda baru saja menyelesaikan gelar magister dan merasa overqualified untuk posisi Anda saat ini. Sikap profesional yang tepat adalah ...',
    options: {
      A: 'Mengajukan resign karena posisi tidak sesuai kualifikasi',
      B: 'Bekerja setengah hati sambil mencari posisi yang lebih tinggi',
      C: 'Menerapkan ilmu baru untuk meningkatkan kualitas kerja di posisi saat ini, sambil berkontribusi lebih dan mempersiapkan diri untuk peluang pengembangan karier',
      D: 'Menuntut promosi jabatan karena kualifikasi sudah meningkat',
      E: 'Menonjolkan gelar baru di setiap kesempatan agar mendapat pengakuan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Dalam rapat tim, ide Anda ditolak oleh mayoritas anggota dan atasan memilih ide rekan kerja lain. Respons Anda adalah ...',
    options: {
      A: 'Merasa kecewa dan tidak aktif berkontribusi di rapat-rapat berikutnya',
      B: 'Memaksakan ide Anda dengan berbagai cara',
      C: 'Menerima keputusan tim dengan lapang dada, mendukung implementasi ide terpilih secara penuh, dan tetap aktif menyampaikan ide di kesempatan lain',
      D: 'Mencari kelemahan ide rekan lain untuk membuktikan ide Anda lebih baik',
      E: 'Mengikuti keputusan tetapi dengan sikap pasif-agresif',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 5, D: 3, E: 4 },
  },
  {
    content:
      'Anda ditawari oleh pihak eksternal untuk menjadi konsultan paruh waktu dengan bayaran tinggi, namun berpotensi menimbulkan konflik kepentingan dengan tugas ASN. Keputusan Anda adalah ...',
    options: {
      A: 'Menerima tawaran secara diam-diam karena bayarannya menggiurkan',
      B: 'Menerima tawaran dan mengatur waktu agar tidak mengganggu jam kerja',
      C: 'Menolak tawaran dengan menjelaskan bahwa sebagai ASN Anda terikat aturan tentang konflik kepentingan, dan merekomendasikan pihak lain yang kompeten',
      D: 'Menerima tawaran setelah meminta izin atasan',
      E: 'Menolak tanpa alasan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 4, E: 3 },
  },
  {
    content:
      'Anda menemukan kesalahan signifikan pada laporan yang sudah Anda serahkan ke pimpinan dan akan dipresentasikan besok. Tindakan Anda adalah ...',
    options: {
      A: 'Berharap kesalahan tidak terdeteksi oleh pimpinan',
      B: 'Menyiapkan penjelasan jika ditanya, tanpa mengoreksi laporan',
      C: 'Segera menghubungi pimpinan, menginformasikan kesalahan, menyiapkan laporan yang sudah dikoreksi, dan meminta maaf atas ketidaktelitian',
      D: 'Menyalahkan rekan kerja yang membantu menyusun data',
      E: 'Memperbaiki laporan dan mengganti versi lama tanpa menginformasikan pimpinan',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 2, C: 5, D: 3, E: 4 },
  },

  // ===================== ANTI-RADIKALISME (7 soal) =====================
  {
    content:
      'Di grup WhatsApp kantor, salah satu rekan menyebarkan konten yang berisi ajakan untuk mendukung gerakan intoleransi terhadap kelompok agama tertentu. Respons Anda yang paling tepat adalah ...',
    options: {
      A: 'Keluar dari grup agar tidak terlibat',
      B: 'Mengabaikan pesan tersebut',
      C: 'Memberikan klarifikasi di grup dengan bijak tentang pentingnya toleransi, menegur rekan secara pribadi, dan jika berlanjut melaporkan ke atasan',
      D: 'Membalas pesan dengan argumen keras yang menyerang rekan tersebut',
      E: 'Menyebarkan konten tandingan yang juga provokatif',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 3, B: 2, C: 5, D: 1, E: 4 },
  },
  {
    content:
      'Anda mengidentifikasi bahwa seorang rekan kerja mulai menunjukkan perubahan perilaku ekstrem: mengisolasi diri, sering mengakses konten radikal, dan menyuarakan kebencian terhadap kelompok tertentu. Langkah Anda adalah ...',
    options: {
      A: 'Menjauhi rekan tersebut agar tidak terpengaruh',
      B: 'Mendekati rekan tersebut dengan empati, membangun dialog terbuka, dan jika indikasi radikalisasi kuat, melaporkan ke pejabat yang berwenang untuk penanganan preventif',
      C: 'Langsung melaporkan ke kepolisian',
      D: 'Menegur keras di hadapan rekan-rekan lain agar jera',
      E: 'Mengabaikan karena itu urusan pribadi',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 3, B: 5, C: 4, D: 1, E: 2 },
  },
  {
    content:
      'Anda diminta menjadi narasumber sosialisasi anti-radikalisme di sekolah. Pendekatan paling efektif untuk generasi muda adalah ...',
    options: {
      A: 'Memberikan ceramah panjang tentang bahaya radikalisme',
      B: 'Menakut-nakuti siswa dengan contoh kasus terorisme yang ekstrem',
      C: 'Menggunakan metode interaktif: diskusi, studi kasus, role-play, dan konten digital yang relevan dengan dunia siswa untuk membangun daya kritis terhadap narasi radikal',
      D: 'Membagikan brosur dan poster anti-radikalisme',
      E: 'Memutarkan film dokumenter tanpa sesi diskusi',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 3, B: 1, C: 5, D: 2, E: 4 },
  },
  {
    content:
      'Sebuah organisasi kemasyarakatan di wilayah kerja Anda kedapatan menyebarkan ideologi yang bertentangan dengan Pancasila. Namun, organisasi tersebut memiliki banyak pengikut dan berpengaruh. Sikap Anda sebagai ASN adalah ...',
    options: {
      A: 'Mengabaikan karena Anda takut menghadapi konflik dengan organisasi berpengaruh',
      B: 'Melaporkan temuan kepada pihak berwenang melalui jalur resmi, sambil terus membangun narasi kebangsaan dan Pancasila melalui program-program di masyarakat',
      C: 'Mengonfrontasi organisasi tersebut secara langsung',
      D: 'Memanfaatkan organisasi tersebut untuk kepentingan politik',
      E: 'Melarang semua kegiatan organisasi tersebut secara sepihak',
    },
    correctAnswer: 'B',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 5, C: 3, D: 1, E: 4 },
  },
  {
    content:
      'Dalam pengelolaan media sosial pribadi, Anda menemukan bahwa algoritma sering menampilkan konten polarisasi dan ujaran kebencian. Sebagai ASN yang memahami bahaya radikalisasi online, tindakan Anda adalah ...',
    options: {
      A: 'Berhenti menggunakan media sosial sama sekali',
      B: 'Mengabaikan konten tersebut tanpa tindakan',
      C: 'Aktif melaporkan konten berbahaya, mengkurasi feed dengan konten positif, dan secara proaktif menyebarkan konten moderasi serta literasi digital',
      D: 'Memblokir semua akun yang menyebarkan konten negatif',
      E: 'Hanya membagikan konten dari akun pemerintah resmi',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 2, B: 1, C: 5, D: 4, E: 3 },
  },
  {
    content:
      'Anda mengetahui bahwa anak remaja di lingkungan tempat tinggal Anda mulai terpapar paham radikal melalui game online dan forum internet. Sebagai warga negara yang baik, langkah paling tepat adalah ...',
    options: {
      A: 'Melarang semua anak di lingkungan dari bermain game online',
      B: 'Menyerahkan sepenuhnya kepada orang tua masing-masing',
      C: 'Menginisiasi program literasi digital untuk remaja dan orang tua, bekerja sama dengan RT/RW dan tokoh masyarakat, serta melaporkan platform yang memuat konten radikal',
      D: 'Melaporkan langsung ke Densus 88',
      E: 'Memperingatkan orang tua secara individu tanpa tindakan sistemik',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 3, C: 5, D: 2, E: 4 },
  },
  {
    content:
      'Dalam sebuah diskusi internal kantor, seorang rekan berpendapat bahwa demokrasi Pancasila sudah gagal dan harus diganti dengan sistem pemerintahan lain yang dianggap lebih "murni." Respons Anda adalah ...',
    options: {
      A: 'Menyetujui karena setiap orang berhak berpendapat',
      B: 'Mengabaikan pernyataan tersebut dan mengalihkan topik',
      C: 'Merespons dengan argumentasi yang konstruktif tentang kelebihan dan mekanisme penyempurnaan demokrasi Pancasila, sambil mengingatkan komitmen ASN pada ideologi negara',
      D: 'Langsung melaporkan rekan tersebut sebagai anti-Pancasila',
      E: 'Meninggalkan ruangan karena tidak nyaman dengan diskusi',
    },
    correctAnswer: 'C',
    defaultScore: 5,
    questionType: 'TKP',
    optionScores: { A: 1, B: 3, C: 5, D: 4, E: 2 },
  },
];

export default tkpQuestions;
