import type { Metadata } from 'next';
import type {
  DashboardOffRequest,
  DashboardShiftRequest,
  RequestsDashboard,
} from '@repo/types';
import { ApiError, getRequestsDashboard } from '@/lib/api';
import { POSITION_LABEL } from '@/lib/employee-labels';
import { SHIFT_LABEL, dayName } from '@/lib/request-labels';
import { DecideControls } from './decide-controls';
import styles from './dashboard.module.css';

export const metadata: Metadata = {
  title: 'Dashboard manager | Kyne',
};

// The dashboard reflects requests and decisions made minutes apart, so it is
// read fresh on every visit; a manager must never decide against a stale list.
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

/** The manager's own words for a decided request; pending rows show controls. */
const OUTCOME_LABEL = {
  approved: 'Disetujui',
  rejected: 'Ditolak',
} as const;

function byDayThenName(
  a: { tanggal: string; employeeName: string },
  b: { tanggal: string; employeeName: string },
): number {
  return (
    a.tanggal.localeCompare(b.tanggal) ||
    a.employeeName.localeCompare(b.employeeName)
  );
}

/**
 * The manager dashboard (F4). Every read here goes through the api, which
 * enforces the manager role: a staff caller gets the "khusus manager" refusal
 * in the error state instead of the list. The screen shows all libur and shift
 * requests of the minggu target with the system's bentrok marks, lets the
 * manager approve or reject each pending request, and reminds them of the
 * staff who have not requested yet.
 */
export default async function DashboardPage() {
  let dashboard: RequestsDashboard | null = null;
  let loadError: string | null = null;

  try {
    dashboard = await getRequestsDashboard();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : 'Tidak bisa memuat dashboard. Coba lagi.';
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Dashboard manager</h1>
      <p className={styles.lead}>
        Semua request libur dan shift untuk minggu target, ditandai saat
        bentrok, siap Anda setujui atau tolak.
      </p>

      {loadError ? (
        <p role="alert" className={styles.error}>
          {loadError}
        </p>
      ) : !dashboard || !dashboard.weekStartDate ? (
        <p className={styles.empty}>
          Belum ada minggu yang dibuka untuk request.
        </p>
      ) : (
        <Dashboard dashboard={dashboard} />
      )}
    </main>
  );
}

function Dashboard({ dashboard }: { dashboard: RequestsDashboard }) {
  const weekStartDate = dashboard.weekStartDate;
  // The page only renders this when a target week exists; re-narrow so the
  // day-name lookups below get a plain string.
  if (!weekStartDate) return null;

  const offConflicted = new Set(dashboard.offConflicted);
  const shiftConflicted = new Set(dashboard.shiftConflicted);

  return (
    <>
      <div className={styles.windowBar}>
        <div>
          <p className={styles.windowLabel}>Minggu target</p>
          <p className={styles.windowValue}>{formatWeek(weekStartDate)}</p>
        </div>
        <div>
          <p className={styles.windowLabel}>Batas request</p>
          <p className={styles.windowValue}>
            {dashboard.requestDeadline
              ? `${formatDeadline(dashboard.requestDeadline)} WITA`
              : '-'}
          </p>
        </div>
      </div>

      {dashboard.windowOpen ? null : (
        <p className={styles.locked}>
          Jendela request sudah tertutup. Staf tidak bisa mengubah permintaannya
          lagi, dan keputusan Anda di sini berlaku untuk penyusunan jadwal.
        </p>
      )}

      <section aria-labelledby="libur-heading">
        <h2 id="libur-heading" className={styles.sectionTitle}>
          Request libur
        </h2>
        <p className={styles.sectionLead}>
          Bentrok bila dua staf posisi sama mengambil hari libur yang sama.
        </p>
        {dashboard.offRequests.length === 0 ? (
          <p className={styles.empty}>Belum ada request libur.</p>
        ) : (
          <ul className={styles.list}>
            {[...dashboard.offRequests].sort(byDayThenName).map((request) => (
              <OffCard
                key={request.id}
                request={request}
                weekStartDate={weekStartDate}
                conflicted={offConflicted.has(request.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="shift-heading">
        <h2 id="shift-heading" className={styles.sectionTitle}>
          Request shift
        </h2>
        <p className={styles.sectionLead}>
          Bentrok bila request untuk satu shift melebihi slot yang tersedia hari
          itu.
        </p>
        {dashboard.shiftRequests.length === 0 ? (
          <p className={styles.empty}>Belum ada request shift.</p>
        ) : (
          <ul className={styles.list}>
            {[...dashboard.shiftRequests].sort(byDayThenName).map((request) => (
              <ShiftCard
                key={request.id}
                request={request}
                weekStartDate={weekStartDate}
                conflicted={shiftConflicted.has(request.id)}
              />
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="belum-heading">
        <h2 id="belum-heading" className={styles.sectionTitle}>
          Belum mengirim request
        </h2>
        {dashboard.staffWithoutRequest.length === 0 ? (
          <p className={styles.empty}>Semua staf sudah mengirim request.</p>
        ) : (
          <ul className={styles.reminder}>
            {dashboard.staffWithoutRequest.map((staff) => (
              <li key={staff.id} className={styles.reminderItem}>
                <span className={styles.reminderName}>{staff.name}</span>
                <span className={styles.reminderPosition}>
                  {POSITION_LABEL[staff.position]}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function OffCard({
  request,
  weekStartDate,
  conflicted,
}: {
  request: DashboardOffRequest;
  weekStartDate: string;
  conflicted: boolean;
}) {
  const day = dayName(weekStartDate, request.tanggal) ?? request.tanggal;

  return (
    <li
      className={
        conflicted
          ? `${styles.requestCard} ${styles.conflicted}`
          : styles.requestCard
      }
    >
      <div className={styles.cardHead}>
        <h3 className={styles.name}>{request.employeeName}</h3>
        {conflicted ? <p className={styles.bentrok}>Bentrok</p> : null}
      </div>
      <p className={styles.meta}>
        {POSITION_LABEL[request.position]} · Libur {day}
      </p>
      <RequestDecision kind="off" request={request} />
    </li>
  );
}

function ShiftCard({
  request,
  weekStartDate,
  conflicted,
}: {
  request: DashboardShiftRequest;
  weekStartDate: string;
  conflicted: boolean;
}) {
  const day = dayName(weekStartDate, request.tanggal) ?? request.tanggal;

  return (
    <li
      className={
        conflicted
          ? `${styles.requestCard} ${styles.conflicted}`
          : styles.requestCard
      }
    >
      <div className={styles.cardHead}>
        <h3 className={styles.name}>{request.employeeName}</h3>
        {conflicted ? <p className={styles.bentrok}>Bentrok</p> : null}
      </div>
      <p className={styles.meta}>
        {POSITION_LABEL[request.position]} · Shift{' '}
        {SHIFT_LABEL[request.shiftCode]} · {day}
      </p>
      <RequestDecision kind="shift" request={request} />
    </li>
  );
}

/**
 * Pending requests get the decision controls; a decided one collapses to its
 * outcome so the manager sees at a glance what is still open. The api holds
 * the truth, so this only chooses between the control and the label.
 */
function RequestDecision({
  kind,
  request,
}: {
  kind: 'off' | 'shift';
  request: DashboardOffRequest | DashboardShiftRequest;
}) {
  if (request.status === 'pending') {
    return <DecideControls kind={kind} id={request.id} />;
  }
  return <p className={styles.outcome}>{OUTCOME_LABEL[request.status]}</p>;
}
