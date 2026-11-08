import type { Metadata } from 'next';
import type {
  DashboardOffRequest,
  DashboardShiftRequest,
  EmployeePosition,
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

/** One staff member and everything they asked for this minggu. */
interface StaffGroup {
  employeeId: string;
  employeeName: string;
  position: EmployeePosition;
  /** Their request libur, if any; the schema caps it at one per week. */
  off: DashboardOffRequest | null;
  /** Their shift preferences, ordered by day. */
  shifts: DashboardShiftRequest[];
}

/**
 * Fold the flat request lists into one entry per staff member, which is how
 * F4 words it ("semua request libur dan shift per staf"). Only staff who
 * asked for something appear; the silent ones live in the reminder list.
 */
function groupByStaff(dashboard: RequestsDashboard): StaffGroup[] {
  const groups = new Map<string, StaffGroup>();
  const touch = (request: {
    employeeId: string;
    employeeName: string;
    position: EmployeePosition;
  }): StaffGroup => {
    const existing = groups.get(request.employeeId);
    if (existing) return existing;
    const created: StaffGroup = {
      employeeId: request.employeeId,
      employeeName: request.employeeName,
      position: request.position,
      off: null,
      shifts: [],
    };
    groups.set(request.employeeId, created);
    return created;
  };

  for (const off of dashboard.offRequests) {
    touch(off).off = off;
  }
  for (const shift of dashboard.shiftRequests) {
    touch(shift).shifts.push(shift);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      shifts: group.shifts.sort((a, b) => a.tanggal.localeCompare(b.tanggal)),
    }))
    .sort((a, b) => a.employeeName.localeCompare(b.employeeName));
}

/**
 * The manager dashboard (F4). Every read here goes through the api, which
 * enforces the manager role: a staff caller gets the "khusus manager" refusal
 * in the error state instead of the list. The screen groups every request of
 * the minggu target per staff member, marks the ones the system flags bentrok,
 * lets the manager approve or reject each pending request, and reminds them of
 * the staff who have not requested yet.
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
        Semua request libur dan shift untuk minggu target, dikelompokkan per
        staf dan ditandai saat bentrok, siap Anda setujui atau tolak.
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
  const staff = groupByStaff(dashboard);

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

      <section aria-labelledby="request-heading">
        <h2 id="request-heading" className={styles.sectionTitle}>
          Request staf
        </h2>
        <p className={styles.sectionLead}>
          Bentrok muncul saat dua permintaan tidak bisa sama-sama dikabulkan.
          Setujui atau tolak salah satunya untuk melepaskannya.
        </p>
        {staff.length === 0 ? (
          <p className={styles.empty}>Belum ada request dari staf.</p>
        ) : (
          <ul className={styles.list}>
            {staff.map((group) => (
              <StaffCard
                key={group.employeeId}
                group={group}
                weekStartDate={weekStartDate}
                offConflicted={offConflicted}
                shiftConflicted={shiftConflicted}
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

function StaffCard({
  group,
  weekStartDate,
  offConflicted,
  shiftConflicted,
}: {
  group: StaffGroup;
  weekStartDate: string;
  offConflicted: Set<string>;
  shiftConflicted: Set<string>;
}) {
  const lines: {
    key: string;
    kind: 'off' | 'shift';
    text: string;
    conflicted: boolean;
    request: DashboardOffRequest | DashboardShiftRequest;
  }[] = [];

  if (group.off) {
    const day = dayName(weekStartDate, group.off.tanggal) ?? group.off.tanggal;
    lines.push({
      key: group.off.id,
      kind: 'off',
      text: `Libur ${day}`,
      conflicted: offConflicted.has(group.off.id),
      request: group.off,
    });
  }
  for (const shift of group.shifts) {
    const day = dayName(weekStartDate, shift.tanggal) ?? shift.tanggal;
    lines.push({
      key: shift.id,
      kind: 'shift',
      text: `Shift ${SHIFT_LABEL[shift.shiftCode]} · ${day}`,
      conflicted: shiftConflicted.has(shift.id),
      request: shift,
    });
  }

  return (
    <li className={styles.requestCard}>
      <div className={styles.cardHead}>
        <h3 className={styles.name}>{group.employeeName}</h3>
        <p className={styles.meta}>{POSITION_LABEL[group.position]}</p>
      </div>

      <div className={styles.lines}>
        {lines.map((line) => (
          <div key={line.key} className={styles.line}>
            <p className={styles.lineText}>
              {line.text}
              {line.conflicted ? (
                <span className={styles.bentrok}>Bentrok</span>
              ) : null}
            </p>
            {line.request.status === 'pending' ? (
              <DecideControls kind={line.kind} id={line.request.id} />
            ) : (
              <p className={styles.outcome}>
                {OUTCOME_LABEL[line.request.status]}
              </p>
            )}
          </div>
        ))}
      </div>
    </li>
  );
}
