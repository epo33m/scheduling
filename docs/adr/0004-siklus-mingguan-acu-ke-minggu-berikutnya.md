# Siklus mingguan: jendela & publish mengacu ke minggu berikutnya

Alur PRD melonggar saat menulis "Minggu sore (sebelumnya): jadwal minggu berjalan dipublish", yang bila dibaca literal menempatkan jendela request di dalam minggu yang sedang berjalan. Metrik keberhasilan PRD ("jadwal minggu depan terbit paling lambat Minggu 18.00 WITA") jadi jangkar dan membatalkan bacaan literal itu. Aturan kanonis:

- Jadwal untuk minggu target N+1 disusun dan dipublish pada Minggu minggu N, paling lambat 18.00 WITA.
- Jendela request untuk N+1 terbuka sejak jadwal N+1 dibuat/dipublish dan ditutup Minggu 12.00 WITA minggu N (turunan dari `request_deadline`; lihat ADR 0002).
- Staff mengajukan, dalam satu jendela, untuk minggu yang BELUM berjalan.

Ini keputusan sulit dibalik (menggerakkan seluruh perhitungan deadline, lock, dan status jendela) dan akan terlihat aneh bagi pembaca baru ("kenapa publish minggu depan, bukan minggu ini?"), karena itu didokumentasikan. PRD tetap sumber kebenaran; kontradiksi internal di Alur langkah 1 dibaca mengikuti metrik keberhasilan PRD, bukan dengan mengubah teks PRD.
