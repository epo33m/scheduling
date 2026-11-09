import type { Metadata } from 'next';
import type {
  PublishedAssignment,
  PublishedSchedule,
  PublishedWeek,
} from '@repo/types';
import { ApiError, getPublishedSchedule } from '@/lib/api';
import {
  MIDDLE_CLOSING_NOTICE,
  SHIFT_LABEL,
  formatDayShort,
  formatShiftTime,
  formatTotalHours,
  targetWeekDays,
} from '@/lib/request-labels';
import { formatWeekRange } from '@/lib/share';
import styles from './schedule.module.css';

export const metadata: Metadata = {
  title: 'Jadwal saya | Kyne',
};

// The manager may edit a published week at any moment, so the screen is read
// fresh on every visit instead of served from a cache.
export const dynamic = 'force-dynamic';

/** One day's right-hand column: the shift in words, plus the middle marker. */
interface DayLine {
  main: string;
  notice: string | null;
}

/**
 * One day in the caller's words. A missing placement and a granted libur read
 * differently on purpose: an unpublished gap must not look like a day off.
 * The hours ride along from shift_type, and a kitchen middle day carries the
 * PRD's closing marker because the day revolves around the lone shift.
 */
function dayLine(assignment: PublishedAssignment | undefined): DayLine {
  if (!assignment) {
    return { main: 'Belum diatur', notice: null };
  }
  if (assignment.shiftCode === null) {
    return { main: 'Libur', notice: null };
  }

  const label = SHIFT_LABEL[assignment.shiftCode];
  const time = assignment.time
    ? formatShiftTime(assignment.time.startTime, assignment.time.endTime)
    : null;

  return {
    main: time ? `${label}, ${time}` : label,
    notice: assignment.shiftCode === 'MIDDLE' ? MIDDLE_CLOSING_NOTICE : null,
  };
}

/**
 * The staff schedule screen (F7), and the page the WhatsApp share link opens.
 * Staff see only their own weeks, because the api narrows the published
 * weeks to the caller: the one running today and the minggu target once it is
 * published. Nothing here is editable; a change made by the manager after
 * publish shows up on the next visit.
 */
export default async function SchedulePage() {
  let schedule: PublishedSchedule | null = null;
  let loadError: string | null = null;

  try {
    schedule = await getPublishedSchedule();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : 'Tidak bisa memuat jadwal. Coba lagi.';
  }

  const weeks = schedule?.weeks ?? [];

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
      ) : weeks.length === 0 ? (
        <p className={styles.empty}>
          Belum ada jadwal yang dipublish. Cek lagi setelah manager membagikan
          jadwal.
        </p>
      ) : (
        weeks.map((week) => <WeekList key={week.weekStartDate} week={week} />)
      )}
    </main>
  );
}

/** One published week: its period, the caller's seven days, and the total. */
function WeekList({ week }: { week: PublishedWeek }) {
  const headingId = `week-${week.weekStartDate}`;
  const placements = new Map<string, PublishedAssignment>(
    week.assignments.map((assignment) => [assignment.tanggal, assignment]),
  );

  return (
    <section className={styles.week} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.weekBar}>
        Minggu {formatWeekRange(week.weekStartDate)}
      </h2>

      <ul className={styles.days}>
        {targetWeekDays(week.weekStartDate).map((day) => {
          const line = dayLine(placements.get(day.tanggal));
          return (
            <li key={day.tanggal} className={styles.day}>
              <p className={styles.dayName}>
                {day.name}, {formatDayShort(day.tanggal)}
              </p>
              <div className={styles.dayRight}>
                <p className={styles.dayShift}>{line.main}</p>
                {line.notice ? (
                  <p className={styles.dayNotice}>{line.notice}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <p className={styles.total}>
        Total jam kerja: {formatTotalHours(week.totalHours)}
      </p>
    </section>
  );
}
