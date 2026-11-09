import type { Metadata } from 'next';
import type { PublishedWeek, ShiftCode } from '@repo/types';
import { ApiError, getPublishedSchedule } from '@/lib/api';
import { SHIFT_LABEL, targetWeekDays } from '@/lib/request-labels';
import { formatWeekRange } from '@/lib/share';
import styles from './schedule.module.css';

export const metadata: Metadata = {
  title: 'Jadwal saya | Kyne',
};

// The manager may edit a published week at any moment, so the screen is read
// fresh on every visit instead of served from a cache.
export const dynamic = 'force-dynamic';

/**
 * One day in the caller's words. A missing placement and a granted libur read
 * differently on purpose: an unpublished gap must not look like a day off.
 */
function shiftLine(
  shifts: Map<string, ShiftCode | null>,
  tanggal: string,
): string {
  if (!shifts.has(tanggal)) {
    return 'Belum diatur';
  }

  const shiftCode = shifts.get(tanggal);
  return shiftCode ? SHIFT_LABEL[shiftCode] : 'Libur';
}

/**
 * The staff schedule screen (F7), and the page the WhatsApp share link opens.
 * Staff see their own week only, because the api narrows the published week to
 * the caller. Nothing here is editable; a change made by the manager after
 * publish shows up on the next visit.
 */
export default async function SchedulePage() {
  let week: PublishedWeek | null = null;
  let loadError: string | null = null;

  try {
    week = await getPublishedSchedule();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : 'Tidak bisa memuat jadwal. Coba lagi.';
  }

  const weekStartDate = week?.weekStartDate ?? null;
  const shifts = new Map<string, ShiftCode | null>(
    (week?.assignments ?? []).map((assignment) => [
      assignment.tanggal,
      assignment.shiftCode,
    ]),
  );

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Jadwal saya</h1>
      <p className={styles.lead}>
        Jadwal yang sudah dipublish manager. Kalau ada perubahan mendadak,
        manager memberi tahu lewat grup WhatsApp.
      </p>

      {loadError ? (
        <p role="alert" className={styles.error}>
          {loadError}
        </p>
      ) : weekStartDate === null ? (
        <p className={styles.empty}>
          Belum ada jadwal yang dipublish. Cek lagi setelah manager membagikan
          jadwal.
        </p>
      ) : (
        <>
          <div className={styles.weekBar}>
            <p className={styles.weekLabel}>Minggu</p>
            <p className={styles.weekValue}>{formatWeekRange(weekStartDate)}</p>
          </div>

          <ul className={styles.days}>
            {targetWeekDays(weekStartDate).map((day) => (
              <li key={day.tanggal} className={styles.day}>
                <p className={styles.dayName}>{day.name}</p>
                <p className={styles.dayShift}>
                  {shiftLine(shifts, day.tanggal)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
