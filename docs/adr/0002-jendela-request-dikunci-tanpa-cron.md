# Jendela request dikunci dengan pemeriksaan deadline, bukan cron job

Lock jendela request (Minggu 12.00 WITA) bisa diimplementasikan sebagai cron yang membuka/menutup status jendela, tapi PRD memilih menegakkannya dengan memeriksa waktu sekarang terhadap `request_deadline` minggu itu saat request masuk (ditolak jika sudah lewat). Konsekuensi yang disengaja: tidak ada job scheduler di VPS, dan status jendela tidak disimpan di `schedule_week` — keterbukaan jendela adalah turunan dari `request_deadline`, satu-satunya status eksplisit minggu adalah draft/published.
