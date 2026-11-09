# Penjadwalan Shift Kyne

Konteks MVP: penjadwalan shift mingguan untuk 6 staf Kyne (4 bar, 2 kitchen) plus satu manager. Aplikasi berdiri sendiri; struktur datanya disiapkan untuk dipindah ke ERP.

## Language

### Siklus & jendela

**Siklus mingguan**:
Satu periode Senin–Minggu yang menjadi irama seluruh aplikasi; jadwal disusun dan dipublish per periode ini.
_Hindari_: minggu kalender, period

**Jendela request**:
Waktu pengajuan request bagi staf untuk minggu target, dihitung dari minggu target: Senin minggu target sampai Minggu 12.00 WITA minggu sebelumnya. Terbuka saat jadwal minggu target dibuat/dipublish, terkunci otomatis oleh deadline.
_Hindari_: periode request, masa request

**Minggu target**:
Minggu yang jadwalnya sedang disusun lewat request dan draft; relatif terhadap jendela request yang berjalan.
_Hindari_: minggu depan (ambigu), minggu berikutnya

**Minggu berjalan**:
Periode Senin–Minggu yang memuat hari ini (WITA) — jadwal yang sedang dijalani staf. Bagi manager ia dapat diedit mulai hari ini dan dipublish terlambat, sebagai lawan dari minggu target (ADR 0005).
_Hindari_: minggu saat ini, minggu aktif, current week

### Request & keputusan

**Request libur**:
Permintaan satu hari libur (Senin–Kamis, maks 1 per minggu per staf non-probation) yang diajukan staf dan diputuskan manager.
_Hindari_: izin, cuti, off request

**Request shift**:
Permintaan shift pagi atau sore per hari yang boleh diajukan untuk hari mana saja; sifatnya diusahakan, tidak dijamin.
_Hindari_: preferensi shift, permintaan jam

**Bentrok**:
Kondisi dua request tidak bisa sama-sama dikabulkan: dua staf posisi sama request libur di hari sama, atau request shift melebihi slot hari itu. Sistem menandai, manager memutuskan.
_Hindari_: konflik, duplikasi

**Hari libur**:
Hari kerja tanpa penugasan shift dalam jadwal sebuah minggu; hanya ada bagi staf non-probation. Bagi staf tetap yang tidak request (atau request-nya ditolak), hari libur ditentukan manager. Staf probation tidak punya hari libur (ADR 0003).
_Hindari_: off, cuti, libur panjang

### Shift & jadwal

**Pagi / Sore**:
Shift standar 07.30–15.30 dan 15.00–23.00 WITA untuk bar dan kitchen; overlap 30 menit untuk serah terima.
_Hindari_: shift 1 / shift 2

**Middle**:
Shift kitchen 11.00–19.00 WITA yang hanya ada di hari rekan kitchen-nya libur; dapur tutup 07.30–11.00 dan 19.00–23.00 di hari itu. Tidak pernah muncul Jumat–Minggu karena hari libur hanya ada Senin–Kamis.
_Hindari_: shift siang, half-day

**Draft**:
Versi jadwal minggu target yang hanya terlihat manager; dihasilkan dari salinan minggu lalu lalu diperbaiki langkah otomatis dan manual.
_Hindari_: draf, preview

**Publish**:
Momen draft minggu target menjadi terlihat oleh staf dan membuka jendela request minggu berikutnya.
_Hindari_: release, submit

### Status staf

**Probation**:
Status staf yang `probation_end_date`-nya belum lewat: masuk setiap hari tanpa hari libur, dan tidak melihat menu request libur maupun request shift. Berubah ke tetap otomatis setelah tanggalnya lewat (ADR 0003).
_Hindari_: percobaan, training

**Tetap**:
Status staf yang sudah lewat probation; berhak mengajukan request libur dan shift.
_Hindari_: aktif (overloaded dengan is_active), senior

**Staf non-probation**:
Sebutan operasional untuk staf tetap dalam alur request dan validasi: hanya mereka yang diminta mengajukan request.
_Hindari_: staf senior, staf penuh
