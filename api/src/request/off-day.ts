/**
 * Request libur is confined to Senin–Kamis (PRD §Aturan bisnis): Jumat, Sabtu
 * and Minggu are busy days with no leave. ISODOW-style numbering from the UTC
 * weekday: Senin=1 .. Kamis=4, so 1–4 are the requestable days. A `@db.Date`
 * reads back as midnight UTC, keeping the weekday stable regardless of the
 * server's local zone.
 */
export function isOffDayAllowed(tanggal: Date): boolean {
  const weekday = tanggal.getUTCDay(); // Sunday=0, Monday=1, ... Saturday=6
  return weekday >= 1 && weekday <= 4;
}
