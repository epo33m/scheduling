# Minggu berjalan dibuka untuk manager lewat toggle minggu

Seluruh permukaan draft manager resolve minggu lewat `targetWeek` — Senin berikutnya yang strictly after now (ADR 0004). Konsekuensinya, sejak Senin 00.00 WITA minggu yang baru dipublish dan sedang dijalankan staf tidak lagi terjangkau dari layar draft: emergency edit pasca-publish yang dijanjikan #9 tidak bisa dilakukan, dan panel share (link WhatsApp) hanya hidup antara tombol publish dan Senin itu (issue #20).

Keputusan: layar draft manager menyertakan toggle minggu eksplisit — **minggu berjalan** | **minggu target**, default minggu target — dan semua aksi scoped ke minggu yang dipilih:

- Seleksi minggu memakai alias `running` / `target`; tanggal diturunkan server (running = minggu yang memuat hari ini WITA, Senin minggu ini s.d. Minggu; target tetap aturan ADR 0004). Klien tidak pernah mengirim tanggal.
- Edit hari yang sudah lewat (sebelum hari ini WITA) ditolak; hari ini dan sesudahnya boleh. Minggu target selalu di masa depan, jadi aturan ini hanya aktif di minggu berjalan.
- "Buat draft dari minggu lalu" tetap milik tab minggu target saja: regenerasi massal minggu yang sedang berjalan akan menimpa penugasan yang sudah dipublish — dan inilah yang membuat blokir hari lewat konsisten.
- Publish berlaku juga di minggu berstatus draft pada tab minggu berjalan (publish terlambat); semantics buka jendela sesuai ADR 0004/0002 tidak berubah.
- Panel share tampil untuk setiap minggu berstatus `published`, di tab mana pun minggu itu dilihat.

Alternatif yang ditolak: fallback otomatis ke "minggu published terakhir yang belum berakhir". Publish minggu N+1 sudah membuat baris N+2, jadi aturan satu-minggu mana pun hanya bisa menampilkan salah satu dari dua minggu yang justru dibutuhkan manager sekaligus (emergency edit N+1 dan menyusun N+2 selama request N+1 masuk).

ADR ini melengkapi ADR 0004, tidak mengubahnya: minggu target tetap minggu yang disusun dan dipublish; yang bertambah adalah bahwa minggu yang sedang berjalan kini terjangkau eksplisit. PRD tetap sumber kebenaran dan tidak diedit; keputusan lahir dari grilling triage issue #20 (Q1–Q7).
