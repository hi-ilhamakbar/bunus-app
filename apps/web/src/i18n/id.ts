import type { en } from './en';

// Bahasa Indonesia. Informal-polite ("kamu"), as most consumer apps here do.
export const id: typeof en = {
  tagline: 'Setiap kunjungan, ada yang bertambah.',

  common: {
    skip: 'Langsung ke konten',
    showPassword: 'Tampilkan kata sandi',
    hidePassword: 'Sembunyikan kata sandi',
    language: 'Bahasa',
    home: 'Beranda Bunus',
  },

  notFound: {
    title: 'Halaman tidak ditemukan',
    body: 'Tautannya mungkin sudah lama, atau ada yang salah ketik.',
    home: 'Ke beranda Bunus',
  },

  landing: {
    title: 'Kartu stempel yang selalu ada di ponselmu.',
    body: 'Gabung di tempat-tempat yang sering kamu kunjungi. Dapat satu stempel tiap datang, lihat kartumu terisi, lalu klaim hadiahmu.',
    create: 'Buat akun',
    login: 'Masuk',
    sampleLabel: 'Contoh kartu',
    sampleName: 'ABC Coffee',
    sampleNote: '5 dari 8 stempel',
  },

  register: {
    title: 'Buat akunmu',
    haveAccount: 'Sudah punya akun?',
    login: 'Masuk',
    slotLabels: ['Datamu', 'Verifikasi', 'Kode', 'Member'],
    steps: {
      details: {
        heading: 'Kenalan dulu',
        body: 'Satu akun berlaku di semua bisnis yang memakai Bunus.',
        name: 'Namamu',
        email: 'Email',
        password: 'Kata sandi',
        passwordHint: 'Minimal 8 karakter.',
        next: 'Lanjut',
      },
      channel: {
        heading: 'Kode dikirim ke mana?',
        body: 'Pilih cara yang paling mudah buatmu.',
        email: 'Email',
        emailHint: 'Kami pakai alamat email yang kamu isi.',
        whatsapp: 'WhatsApp',
        sms: 'SMS',
        phoneHint: 'Perlu nomor ponselmu.',
        phone: 'Nomor ponsel',
        phoneHelp: 'Awali dengan 0 atau kode negara, misalnya 0812 3456 7890.',
        send: 'Kirim kode',
        back: 'Kembali',
      },
      code: {
        heading: 'Masukkan kodemu',
        body: 'Kami mengirim kode ke {where}.',
        label: 'Kode',
        submit: 'Buat akun',
        resend: 'Kirim kode baru',
        resendIn: 'Kamu bisa minta kode baru dalam {s} detik.',
        resendsLeft: 'Sisa {n} kali kirim ulang.',
        noResends: 'Tidak ada kiriman ulang lagi untuk pendaftaran ini.',
        startOver: 'Mulai lagi',
        noCodeHelp: 'Belum ada kode setelah semenit? Mungkin kamu sudah punya akun.',
        loginInstead: 'Masuk saja',
        changeWay: 'Pakai cara lain',
      },
      done: {
        heading: 'Selamat datang, {name}.',
        body: 'Akunmu sudah siap. Gabung ke bisnis lewat kode QR atau tautannya, dan stempel pertamamu masuk ke kartu.',
        go: 'Lihat kartuku',
      },
    },
  },

  login: {
    title: 'Selamat datang kembali',
    body: 'Masuk untuk melihat kartumu.',
    email: 'Email',
    password: 'Kata sandi',
    submit: 'Masuk',
    passwordRequired: 'Isi kata sandimu.',
    newHere: 'Baru di Bunus?',
    create: 'Buat akun',
  },

  member: {
    greeting: 'Hai, {name}.',
    emptyTitle: 'Belum ada kartu',
    emptyBody:
      'Kalau bisnis yang kamu kunjungi memakai Bunus, pindai kode QR-nya atau buka tautannya untuk bergabung. Stempelmu akan muncul di sini.',
    logout: 'Keluar',
    signedInAs: 'Masuk sebagai {who}',
  },

  errors: {
    network: 'Bunus tidak bisa dihubungi. Periksa koneksimu lalu coba lagi.',
    generic: 'Ada yang tidak beres. Coba lagi sebentar lagi.',
    nameRequired: 'Isi namamu.',
    emailInvalid: 'Masukkan alamat email yang valid.',
    passwordShort: 'Minimal 8 karakter.',
    phoneRequired: 'Isi nomor ponselmu.',
    codeFormat: 'Masukkan angka dari kodemu.',
  },

  apiErrors: {
    CHANNEL_UNAVAILABLE: 'Cara verifikasi itu sedang tidak tersedia. Pilih yang lain.',
    INVALID_PHONE: 'Nomor ponsel itu tampak salah. Awali dengan kode negara atau angka 0.',
    PHONE_REQUIRED: 'Isi nomor ponsel untuk menerima kode lewat WhatsApp atau SMS.',
    OTP_COOLDOWN: 'Kode baru saja dikirim. Tunggu {s} detik sebelum minta lagi.',
    OTP_UNAVAILABLE: 'Kami belum bisa mengirim kode lewat cara ini. Coba cara verifikasi lain.',
    TRY_AGAIN_LATER: 'Sedang banyak kode yang dikirim. Tunggu sebentar lalu coba lagi.',
    RESEND_LIMIT: 'Kiriman ulang untuk pendaftaran ini sudah habis. Mulai lagi atau pilih cara verifikasi lain.',
    CODE_INVALID: 'Kodenya belum benar. Periksa lagi atau minta kode baru.',
    CODE_EXPIRED: 'Kode sudah kedaluwarsa. Minta kode baru.',
    TOO_MANY_ATTEMPTS: 'Terlalu banyak kode yang salah. Minta kode baru untuk mencoba lagi.',
    CODE_ALREADY_USED: 'Kode itu sudah dipakai. Minta kode baru.',
    CODE_NOT_SENT: 'Belum ada kode yang dikirim. Minta kode baru.',
    SIGNUP_EXPIRED: 'Pendaftaran ini sudah kedaluwarsa. Mulai lagi untuk mendapat kode baru.',
    ALREADY_SUBMITTED: 'Pendaftaran ini sudah selesai. Masuk untuk melanjutkan.',
    ACCOUNT_EXISTS: 'Sudah ada akun dengan data ini. Silakan masuk.',
    INVALID_CREDENTIALS: 'Email atau kata sandi salah. Periksa lagi lalu coba lagi.',
    UNAUTHENTICATED: 'Masuk untuk melanjutkan.',
    FORBIDDEN_ORIGIN: 'Permintaan ini diblokir. Muat ulang halaman lalu coba lagi.',
    VALIDATION_FAILED: 'Periksa kolom yang ditandai lalu coba lagi.',
  },
};
