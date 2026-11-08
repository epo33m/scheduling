import type { Metadata } from 'next';
import type { StaffRequests } from '@repo/types';
import { ApiError, getRequests } from '@/lib/api';
import { targetWeekDays } from '@/lib/request-labels';
import { RequestControls } from './request-controls';
import styles from './request.module.css';

export const metadata: Metadata = {
  title: 'Request libur & shift | Kyne',
};

// The window closes on the clock, so the screen is read fresh on every visit:
// a staff member must never see a stale "still open" banner.
export const dynamic = 'force-dynamic';

const WITA = 'Asia/Makassar';

/** "Senin, 16 November 2026" for a target-week Monday (`YYYY-MM-DD`). */
function formatWeek(monday: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monday}T00:00:00.000Z`));
}

/** "Minggu, 15 November 2026, 12.00 WITA" for the window-close instant. */
function formatDeadline(instant: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
}

/**
 * The staff request screen (F3). The api is the only gate: a probation staf is
 * refused (403) and simply sees why the menu is closed rather than a form, and
 * a manager hitting the route gets the same refusal. Everything else renders
 * the open window's two controls.
 */
export default async function RequestPage() {
  let requests: StaffRequests | null = null;
  let loadError: string | null = null;
  let gated = false;

  try {
    requests = await getRequests();
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      gated = true;
      loadError = error.message;
    } else {
      loadError =
        error instanceof ApiError
          ? error.message
          : 'Tidak bisa memuat data request. Coba lagi.';
    }
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Request libur &amp; shift</h1>
      <p className={styles.lead}>
        Ajukan satu hari libur dan preferensi shift untuk minggu berikutnya.
        Manager yang memutuskan permintaan ini.
      </p>

      {gated ? (
        <p role="alert" className={styles.error}>
          {loadError ??
            'Menu request terbuka setelah masa probation selesai.'}
        </p>
      ) : loadError ? (
        <p role="alert" className={styles.error}>
          {loadError}
        </p>
      ) : !requests || !requests.weekStartDate || !requests.requestDeadline ? (
        <p className={styles.empty}>
          Belum ada minggu yang dibuka untuk request. Cek lagi nanti.
        </p>
      ) : (
        <>
          <div className={styles.windowBar}>
            <div>
              <p className={styles.windowLabel}>Minggu target</p>
              <p className={styles.windowValue}>
                {formatWeek(requests.weekStartDate)}
              </p>
            </div>
            <div>
              <p className={styles.windowLabel}>Batas request</p>
              <p className={styles.windowValue}>
                {formatDeadline(requests.requestDeadline)} WITA
              </p>
            </div>
          </div>

          {requests.windowOpen ? null : (
            <p className={styles.locked}>
              Jendela request untuk minggu ini sudah tertutup. Isi di bawah
              hanya bisa dibaca sampai jendela berikutnya dibuka.
            </p>
          )}

          <RequestControls
            weekStartDate={requests.weekStartDate}
            windowOpen={requests.windowOpen}
            offRequest={requests.offRequest}
            shiftRequests={requests.shiftRequests}
            days={targetWeekDays(requests.weekStartDate)}
          />
        </>
      )}
    </main>
  );
}
