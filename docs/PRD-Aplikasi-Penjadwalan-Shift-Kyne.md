# PRD — Aplikasi Penjadwalan Shift Kyne

Nov 7, 2026 · @Voldy

## Ringkasan & tujuan

MVP ini adalah PWA untuk menyusun jadwal shift mingguan 6 staf Kyne (4 bar, 2 kitchen), dengan target selesai dalam 2–3 minggu. Aplikasi berdiri sendiri, tapi struktur datanya disiapkan untuk pindah ke ERP.

**Masalah yang diselesaikan**

- Jadwal disusun manual setiap Minggu, dan request libur atau shift tersebar di chat dan lisan.
- Bentrok libur kitchen (hanya 2 orang) mudah terlewat dan langsung bikin jadwal bolong.
- Tidak ada catatan siapa sudah request dan siapa belum sebelum jadwal disusun.

**Tujuan MVP**

1. Staf mengajukan request libur dan request shift (pagi/sore) lewat aplikasi, dalam satu jendela waktu mingguan.
2. Manager menyusun jadwal dari salinan minggu lalu, dengan request dan middle kitchen diterapkan otomatis, lalu divalidasi sebelum publish.
3. Staf melihat jadwalnya sendiri di HP setelah jadwal dipublish.

**Metrik keberhasilan**

- Jadwal minggu depan terbit paling lambat Minggu 18.00 WITA, setiap minggu.
- Tidak ada shift Jumat–Minggu yang kurang orang saat jadwal dipublish.
- Semua staf non-probation mengajukan request lewat aplikasi, tidak lewat chat.

## Pengguna & peran

Ada tiga peran. Semua wajib login dengan akun Google yang emailnya sudah didaftarkan manager.

| Peran | Siapa | Hak akses |
| --- | --- | --- |
| Manager | Manager operasional. Owner sementara didaftarkan dengan peran ini (emailnya sendiri, bukan berbagi akun) | Kelola staf, lihat dan putuskan request, susun dan publish jadwal, lihat validasi coverage dan total jam kerja |
| Staf | Staf bar dan kitchen yang sudah lewat masa probation | Lihat jadwal sendiri, ajukan request libur dan request shift |
| Staf probation | Staf yang tanggal selesai probation-nya belum lewat | Lihat jadwal sendiri saja. Menu request muncul otomatis setelah probation selesai |

Setiap staf punya satu posisi tetap, bar atau kitchen. Tidak ada staf yang memegang dua posisi.

## Ruang lingkup MVP

MVP mencakup request staf, penyusunan jadwal oleh manager, dan tampilan jadwal staf. Semua yang lain ditunda.

**Masuk MVP**

- Login Google dengan whitelist email, peran manager dan staf
- Kelola staf: tambah (sekaligus daftar email), nonaktifkan, posisi bar/kitchen, status probation dan tanggal selesainya
- Request libur: Senin–Kamis, 1x per minggu
- Request shift pagi/sore: hari apa saja, sifatnya diusahakan
- Dashboard manager: daftar request, penanda bentrok, daftar staf yang belum request
- Penyusunan jadwal: salin minggu lalu, terapkan libur, terapkan request shift, middle kitchen otomatis, rapikan manual
- Validasi coverage, hanya terlihat oleh manager
- Publish jadwal dan tombol share link ke WhatsApp
- Staf melihat jadwal sendiri, termasuk penanda dapur tutup di hari middle
- Pencatatan total jam kerja per staf per minggu

**Setelah MVP**

- Tukar shift antarstaf
- Alur libur darurat setelah jadwal dipublish (di MVP: lapor ke manager, diubah manual)
- Penanda "jadwal kamu berubah" di aplikasi
- Tombol pengingat deadline otomatis (di MVP: manager mengingatkan manual)
- Push notification
- Flow akses khusus owner
- Aturan staf masuk dan keluar mengikuti siklus mingguan
- Export jadwal (gambar atau Excel)

**Tidak dalam cakupan**

- Jadwal manager
- Hari khusus atau tanggal merah
- Absensi dan payroll (MVP hanya mencatat total jam kerja sebagai bahan nanti)

## Alur utama

Penjadwalan berjalan dalam siklus mingguan (Senin–Minggu). Selama minggu berjalan, staf mengajukan request untuk minggu berikutnya.

**Siklus mingguan**

1. **Minggu sore (sebelumnya):** jadwal minggu berjalan dipublish. Jendela request untuk minggu berikutnya otomatis terbuka.
2. **Senin – Minggu 12.00 WITA:** staf mengajukan request libur dan/atau request shift. Request boleh diubah selama jendela masih terbuka.
3. **Minggu 12.00:** jendela request ditutup otomatis.
4. **Minggu siang–sore:** manager menyusun jadwal.
   1. Sistem menyalin jadwal minggu lalu dan menghapus libur minggu lalu. Hari yang kosong diisi shift yang paling sering dipegang staf itu.
   2. Sistem menerapkan request libur. Staf yang tidak request diberi hari libur oleh manager.
   3. Sistem menerapkan request shift.
   4. Sistem mengubah staf kitchen yang masuk menjadi middle di hari rekannya libur. Request shift kitchen di hari itu gugur.
   5. Manager menyelesaikan bentrok dan merapikan pembagian pagi/sore.
   6. Sistem menjalankan validasi coverage.
5. **Minggu paling lambat 18.00:** manager publish dan membagikan link jadwal ke grup WhatsApp.
6. Staf membuka link, login, lalu langsung melihat jadwalnya sendiri.

**Bentrok request**

- Dua staf dari posisi yang sama meminta libur di hari yang sama, atau request shift melebihi slot (misalnya 3 orang bar minta pagi di hari Sabtu).
- Sistem menandai bentrok di dashboard manager. Manager memilih siapa yang dikabulkan.
- Staf yang request liburnya tidak dikabulkan diperlakukan seperti staf yang tidak request: hari liburnya ditentukan manager.

**Perubahan setelah publish (MVP)**

Staf yang butuh libur mendadak melapor ke manager. Manager mengubah jadwal langsung di aplikasi, lalu mengabari staf lewat WhatsApp.

## Kebutuhan fungsional

Ada tujuh modul. Setiap modul punya user story dan kriteria penerimaan.

**F1. Autentikasi**

*Sebagai staf, aku login dengan akun Google supaya tidak perlu mengingat password baru.*

- Hanya email di whitelist yang bisa masuk. Email lain mendapat pesan "akun belum terdaftar".
- Sesi tersimpan 30 hari.
- Link yang dibuka sebelum login tetap jadi tujuan setelah login.

**F2. Kelola staf**

*Sebagai manager, aku mendaftarkan dan menonaktifkan staf supaya hanya tim aktif yang bisa masuk.*

- Data staf: nama, email Google, posisi (bar/kitchen), status (probation/tetap), tanggal selesai probation, aktif/nonaktif.
- Staf nonaktif tidak bisa login, tapi riwayat jadwalnya tetap tersimpan.
- Status probation berubah ke tetap otomatis setelah tanggal selesainya lewat.

**F3. Request libur dan request shift**

*Sebagai staf, aku memilih hari libur dan shift yang kuinginkan untuk minggu depan.*

- Request libur: hanya Senin–Kamis yang bisa dipilih, maksimal 1 hari.
- Request shift: pagi atau sore, per hari, boleh untuk hari mana saja, boleh tidak diisi.
- Request bisa diubah sampai Minggu 12.00 WITA. Setelah itu terkunci.
- Staf melihat status request-nya, misalnya "Libur: Selasa".
- Staf probation tidak melihat menu request.

**F4. Dashboard manager**

*Sebagai manager, aku melihat semua request minggu depan dalam satu layar sebelum menyusun jadwal.*

- Menampilkan request libur dan shift per staf.
- Menandai bentrok libur (2 orang posisi sama di hari sama) dan bentrok shift (melebihi slot).
- Menampilkan daftar staf non-probation yang belum request.

**F5. Penyusunan jadwal**

*Sebagai manager, aku membuat draft jadwal dari minggu lalu supaya tidak mulai dari nol.*

- Tombol "Buat draft dari minggu lalu" menjalankan langkah otomatis di Alur utama (4.1–4.4).
- Manager bisa mengubah shift setiap staf per hari: pagi, sore, middle (kitchen), atau libur.
- Validasi coverage berjalan setiap ada perubahan (lihat Aturan bisnis).
- Draft tidak terlihat oleh staf sebelum dipublish.

**F6. Publish dan share**

*Sebagai manager, aku mempublish jadwal dan membagikannya ke grup WhatsApp.*

- Publish membuat jadwal terlihat oleh staf dan membuka jendela request minggu berikutnya.
- Tombol share membuka WhatsApp dengan teks siap kirim: periode jadwal, link, dan deadline request minggu berikutnya.
- Manager tetap bisa mengubah jadwal setelah publish.

**F7. Tampilan staf**

*Sebagai staf, aku melihat jadwalku minggu ini dan minggu depan di HP.*

- Hanya jadwal sendiri yang tampil: hari, shift, dan jam.
- Di hari middle kitchen, tampil penanda "Dapur tutup 07.30–11.00 & 19.00–23.00".
- Menampilkan total jam kerja minggu itu.

## Aturan bisnis & validasi

Kafe buka setiap hari. Senin–Kamis dianggap sepi dan boleh ada libur. Jumat–Minggu dianggap ramai dan semua staf masuk.

**Jenis shift**

| Shift | Jam | Berlaku untuk |
| --- | --- | --- |
| Pagi | 07.30–15.30 | Bar dan kitchen |
| Sore | 15.00–23.00 | Bar dan kitchen |
| Middle | 11.00–19.00 | Kitchen, hanya di hari rekan kitchen-nya libur |

Shift pagi dan sore overlap 30 menit (15.00–15.30) untuk serah terima.

**Aturan dan cara penegakannya**

| Aturan | Ketentuan | Penegakan |
| --- | --- | --- |
| Jatah libur | 1 hari per minggu per staf non-probation | Sistem membatasi form |
| Hari libur | Hanya Senin–Kamis | Sistem membatasi form |
| Libur per hari | Maksimal 1 bar dan 1 kitchen | Sistem menandai bentrok, manager memutuskan |
| Request shift | Pagi/sore, hari apa saja, diusahakan (tidak dijamin) | Manager memutuskan |
| Probation | Tidak bisa request libur maupun shift | Sistem menyembunyikan menu request (bisa diubah di pengaturan) |
| Jendela request | Dibuka saat jadwal minggu berjalan dipublish, ditutup Minggu 12.00 WITA | Sistem mengunci otomatis |
| Tidak request | Hari libur ditentukan manager | Manager |
| Kitchen libur | Rekan kitchen yang masuk otomatis middle. Dapur tutup 07.30–11.00 dan 19.00–23.00 | Sistem |
| Coverage Jumat–Minggu | Bar 2 orang per shift, kitchen 1 orang per shift | Peringatan ke manager sebelum publish |
| Coverage Senin–Kamis | Bar minimal 1 orang per shift, kitchen minimal 1 orang (atau middle) | Peringatan ke manager sebelum publish |
| Pembagian bar 2+1 | Saat 1 orang bar libur, manager yang menentukan siapa di pagi atau sore | Manager |

Validasi coverage hanya terlihat oleh manager. Staf tidak melihat penanda apa pun di shift yang diisi 1 orang.

## Model data (draft)

Tujuh entitas sudah cukup untuk MVP. Struktur ini draft awal dan akan dipertajam saat memilih stack.

| Entitas | Field utama | Catatan |
| --- | --- | --- |
| employee | id, nama, email, posisi (bar/kitchen), role (manager/staff), status (probation/tetap), probation\_end\_date, is\_active | Email jadi whitelist login. Dinamai generik supaya mudah dipetakan ke modul HR di ERP |
| shift\_type | id, kode (PAGI/SORE/MIDDLE), jam\_mulai, jam\_selesai, posisi\_berlaku | Jam kerja dihitung dari sini, tidak disimpan ulang |
| schedule\_week | id, start\_date (Senin), status (draft/published), request\_deadline, published\_at, published\_by, copied\_from\_week\_id | Satu baris per minggu |
| shift\_assignment | id, week\_id, employee\_id, tanggal, shift\_type\_id (kosong = libur), source (copy/request/auto\_middle/manual) | Inti jadwal. `source` membantu melacak asal setiap penempatan |
| off\_request | id, week\_id, employee\_id, tanggal, status (pending/approved/rejected), decided\_by, decided\_at | Maksimal 1 per staf per minggu |
| shift\_request | id, week\_id, employee\_id, tanggal, shift\_type\_id, status, decided\_by, decided\_at | Boleh beberapa per staf per minggu, 1 per hari |
| setting | key, value | Misalnya probation\_can\_request = false, deadline\_day = Minggu, deadline\_time = 12.00, timezone = Asia/Makassar |

**Prinsip supaya siap pindah ke ERP**

- ID memakai UUID, bukan angka urut.
- Setiap tabel punya created\_at, updated\_at, dan created\_by.
- Tidak ada hapus permanen. Staf dan data lama cukup dinonaktifkan supaya riwayat tetap utuh.
- Tanggal disimpan sebagai tanggal kalender, jam sebagai jam lokal WITA, dengan zona waktu tercatat di setting.

## Kebutuhan non-fungsional

Aplikasi harus nyaman dipakai di HP Android maupun iPhone, karena staf memakai keduanya.

- **PWA, mobile-first:** bisa di-install ke home screen dan tampilan utama dirancang untuk layar HP. Dashboard manager tetap nyaman di laptop.
- **Login Google:** pakai alur redirect, bukan popup, karena popup sering bermasalah di PWA iPhone mode standalone.
- **In-app browser:** Google memblokir login di webview (error `disallowed_useragent`). Buka link dari WhatsApp perlu dites di Android dan iPhone. Kalau terblokir, arahkan staf membuka di Chrome/Safari atau lewat PWA yang sudah di-install.
- **Privasi:** semua halaman wajib login, termasuk link jadwal yang dibagikan. Staf hanya bisa mengakses data jadwalnya sendiri, dan pembatasan ini ditegakkan di server, bukan hanya di tampilan.
- **Zona waktu:** deadline dan jam shift dihitung dalam WITA (Asia/Makassar).
- **Notifikasi:** MVP tanpa push notification. Komunikasi lewat share link ke WhatsApp dan status di dalam aplikasi.
- **Data:** backup otomatis harian.

## Arsitektur & stack

Stack-nya sama dengan ERP, supaya modul NestJS aplikasi ini nanti bisa dipindah hampir utuh ke repo ERP.

| Lapisan | Teknologi | Peran |
| --- | --- | --- |
| Repo | Monorepo, mengikuti struktur dan tool monorepo ERP | `web` (Next.js), `api` (NestJS), paket bersama untuk tipe dan validasi |
| Frontend | Next.js sebagai PWA | Tampilan staf (mobile-first) dan dashboard manager. Supabase dipakai di sini hanya untuk login |
| Backend | NestJS | Semua aturan bisnis, RBAC, dan validasi. Modul: Auth, Employee, Request, Schedule, Publish |
| Database | PostgreSQL di Supabase, diakses lewat Prisma | Skema mengikuti bagian Model data |
| Auth | Supabase Auth (Google, alur PKCE redirect) | Menerbitkan JWT. NestJS memverifikasi JWT di setiap request |
| Hosting | Vercel (web), Supabase (database dan auth), VPS (NestJS) | NestJS di VPS memakai Docker atau PM2 (restart otomatis), reverse proxy dengan HTTPS (Caddy/Nginx), dan uptime monitor |

**Aturan keamanan**

- **Whitelist dicek di NestJS.** Supabase Auth mengizinkan akun Google mana pun login, jadi NestJS menolak (403) email yang tidak ada di tabel `employee`. Auth Hook Supabase untuk menolak email asing sejak awal bersifat opsional.
- **Peran diambil dari tabel `employee`**, tidak dari `user_metadata` di JWT, karena field itu bisa diubah user dari client.
- **RLS deny-all di semua tabel.** Frontend tidak pernah membaca tabel langsung, sehingga satu-satunya jalan ke data adalah NestJS.
- **Deadline tanpa cron job.** Request ditolak kalau waktu sekarang sudah melewati `request_deadline` minggu itu (WITA).

## Timeline (usulan)

Tiga minggu pengembangan, lalu satu siklus uji coba nyata. Risiko teknis terbesar (login Google dari link WhatsApp) dites di minggu pertama.

1. **Minggu 1, fondasi:** setup proyek dan database, login Google dengan whitelist (F1), kelola staf (F2), data shift\_type. Tes login dari link WhatsApp di Android dan iPhone.
2. **Minggu 2, request dan penyusunan:** request libur dan shift (F3), dashboard manager (F4), draft dari minggu lalu dan validasi coverage (F5).
3. **Minggu 3, publish dan staf:** publish dan share ke WhatsApp (F6), tampilan staf (F7), install PWA, perbaikan bug.
4. **Siklus uji coba:** satu minggu penuh dengan data nyata 6 staf. Cara lama tetap disiapkan sebagai cadangan sampai siklus pertama berjalan lancar.

## Pertanyaan terbuka

- [x] Kebijakan probation tanpa libur sudah dikonfirmasi langsung dari owner. Tersisa catatan risiko: UU Ketenagakerjaan (diubah UU Cipta Kerja) mewajibkan istirahat mingguan minimal 1 hari untuk 6 hari kerja, dan tidak ditemukan pengecualian untuk masa percobaan.
- [x] Pastikan semua staf, terutama pengguna iPhone, punya akun Google.
- [x] Setujui metrik keberhasilan di bagian Ringkasan & tujuan.
- [x] Konfirmasi aturan maksimal 1 bar dan 1 kitchen libur per hari (diusulkan, belum dikonfirmasi eksplisit).
- [x] Hosting backend NestJS: VPS (diputuskan).
- [ ] Saat implementasi (minggu pertama pakai data dummy), kumpulkan data awal: nama, email Google, posisi, status probation, dan tanggal selesai probation untuk 6 staf, plus jadwal minggu terakhir sebagai bahan salinan pertama.
