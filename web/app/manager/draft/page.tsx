import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type {
  AssignmentSource,
  CoverageWarning,
  DraftAssignment,
  DraftSchedule,
  EmployeePosition,
  ShiftCode,
} from '@repo/types';
import { ApiError, getDraft } from '@/lib/api';
import { POSITION_LABEL } from '@/lib/employee-labels';
import { SHIFT_LABEL, targetWeekDays } from '@/lib/request-labels';
import { formatDayMonth, formatInstant, whatsappShareHref } from '@/lib/share';
import {
  AssignmentCell,
  GenerateButton,
  PublishButton,
} from './draft-controls';
import styles from './draft.module.css';

export const metadata: Metadata = {
  title: 'Susun jadwal | Kyne',
};

// The draft changes with every manager edit and every regeneration, so it is
// read fresh on each visit: an edit made on another device must show up here.
export const dynamic = 'force-dynamic';

const WITA = 'Asia/Makassar';

const GENERATE_LABEL = 'Buat draft dari minggu lalu';

/** "Senin, 16 November 2026" for a week's Monday (`YYYY-MM-DD`). */
function formatWeek(monday: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${monday}T00:00:00.000Z`));
}

/**
 * The absolute address of the staff schedule screen. The origin comes from the
 * request itself, so the link works on localhost and on the deployed host
 * without a second environment variable to keep in step.
 */
async function staffScheduleLink(): Promise<string> {
  const incoming = await headers();
  const host =
    incoming.get('x-forwarded-host') ??
    incoming.get('host') ??
    'localhost:3000';
  const proto =
    incoming.get('x-forwarded-proto') ??
    (host.startsWith('localhost') ? 'http' : 'https');

  return `${proto}://${host}/staff/schedule`;
}

/** "Jumat, 20 November" for one day of the minggu target. */
function formatDay(tanggal: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: WITA,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${tanggal}T00:00:00.000Z`));
}

/**
 * Where a cell came from, in the manager's words. Read back as text under each
 * select so the draft explains itself: which placements were copied, which
 * honour a request, which the system set automatically.
 */
const SOURCE_LABEL: Record<AssignmentSource, string> = {
  copy: 'Salinan',
  request: 'Request',
  auto_middle: 'Otomatis',
  manual: 'Diedit',
};

/** Middle exists for the kitchen only, so its select is kitchen-only. */
function choicesFor(position: EmployeePosition): readonly ShiftCode[] {
  return position === 'kitchen' ? ['PAGI', 'SORE', 'MIDDLE'] : ['PAGI', 'SORE'];
}

/** One staff member and their seven cells, filled from the flat draft list. */
interface StaffRow {
  employeeId: string;
  employeeName: string;
  position: EmployeePosition;
  cells: Map<string, DraftAssignment>;
}

function groupByStaff(assignments: DraftAssignment[]): StaffRow[] {
  const rows = new Map<string, StaffRow>();

  for (const assignment of assignments) {
    let row = rows.get(assignment.employeeId);
    if (!row) {
      row = {
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        position: assignment.position,
        cells: new Map(),
      };
      rows.set(assignment.employeeId, row);
    }
    row.cells.set(assignment.tanggal, assignment);
  }

  return [...rows.values()].sort((a, b) =>
    a.employeeName.localeCompare(b.employeeName),
  );
}

/**
 * The manager's draft screen (F5). The one button runs alur 4.1–4.4 and every
 * cell below it is an editable day: the manager keeps the placement they agree
 * with and changes the rest. Only the manager sees this; staff read the week
 * once it is published (F6).
 */
export default async function DraftPage() {
  let draft: DraftSchedule | null = null;
  let loadError: string | null = null;

  try {
    draft = await getDraft();
  } catch (error) {
    loadError =
      error instanceof ApiError
        ? error.message
        : 'Tidak bisa memuat draft. Coba lagi.';
  }

  const scheduleLink = await staffScheduleLink();

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Susun jadwal</h1>
      <p className={styles.lead}>
        Draft minggu depan disusun dari minggu lalu, lalu disesuaikan dengan
        request libur dan shift yang Anda setujui. Setiap perubahan langsung
        tersimpan.
      </p>

      {loadError ? (
        <p role="alert" className={styles.error}>
          {loadError}
        </p>
      ) : draft ? (
        <DraftView draft={draft} scheduleLink={scheduleLink} />
      ) : null}
    </main>
  );
}

function DraftView({
  draft,
  scheduleLink,
}: {
  draft: DraftSchedule;
  scheduleLink: string;
}) {
  const weekStartDate = draft.weekStartDate;
  const staff = groupByStaff(draft.assignments);
  const isPublished = draft.status === 'published';

  return (
    <>
      {weekStartDate ? (
        <div className={styles.weekBar}>
          <div>
            <p className={styles.windowLabel}>Minggu target</p>
            <p className={styles.windowValue}>{formatWeek(weekStartDate)}</p>
          </div>
          <div>
            <p className={styles.windowLabel}>Sumber draft</p>
            <p className={styles.windowValue}>
              {draft.copiedFromWeekStartDate
                ? `Salinan ${formatWeek(draft.copiedFromWeekStartDate)}`
                : 'Dientri manual'}
            </p>
          </div>
        </div>
      ) : null}

      <GenerateButton label={GENERATE_LABEL} />

      <p className={styles.note}>
        {isPublished
          ? 'Menyusun ulang mengganti seluruh jadwal, termasuk yang sudah dilihat staf.'
          : 'Menekan tombol menyusun ulang seluruh draft dan menghapus perubahan manual di sini. Draft ini hanya terlihat oleh manager, belum oleh staf.'}
      </p>

      {weekStartDate ? (
        <CoveragePanel warnings={draft.warnings} published={isPublished} />
      ) : null}

      {weekStartDate ? (
        <PublishPanel draft={draft} scheduleLink={scheduleLink} />
      ) : null}

      {!weekStartDate ? (
        <p className={styles.empty}>
          Belum ada draft untuk minggu depan. Tombol di atas membuat minggu
          target dan menyusunnya dari minggu lalu.
        </p>
      ) : (
        <section aria-labelledby="draft-heading">
          <h2 id="draft-heading" className={styles.sectionTitle}>
            Jadwal per staf
          </h2>
          <p className={styles.sectionLead}>
            Middle dipakai otomatis saat hanya satu staf dapur yang masuk, di
            hari rekannya libur. Libur hanya tersedia Senin sampai Kamis.
          </p>

          {staff.length === 0 ? (
            <p className={styles.empty}>
              Belum ada staf aktif yang bisa dijadwalkan.
            </p>
          ) : (
            <ul className={styles.staffGrid}>
              {staff.map((row) => (
                <li key={row.employeeId} className={styles.staffCard}>
                  <div className={styles.cardHead}>
                    <h3 className={styles.name}>{row.employeeName}</h3>
                    <p className={styles.meta}>
                      {POSITION_LABEL[row.position]}
                    </p>
                  </div>

                  <div className={styles.dayGrid}>
                    {targetWeekDays(weekStartDate).map((day) => {
                      const cell = row.cells.get(day.tanggal);
                      return (
                        <div key={day.tanggal} className={styles.cellWrap}>
                          <AssignmentCell
                            employeeId={row.employeeId}
                            tanggal={day.tanggal}
                            dayLabel={day.name}
                            shiftCode={cell?.shiftCode ?? null}
                            choices={choicesFor(row.position)}
                            liburAllowed={day.offAllowed}
                          />
                          <p className={styles.source}>
                            {cell ? SOURCE_LABEL[cell.source] : 'Belum diisi'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </>
  );
}

/** One day's warnings, in the order the api sent them. */
interface WarningDay {
  tanggal: string;
  warnings: CoverageWarning[];
}

function groupByDay(warnings: CoverageWarning[]): WarningDay[] {
  const days = new Map<string, CoverageWarning[]>();

  for (const warning of warnings) {
    const day = days.get(warning.tanggal) ?? [];
    day.push(warning);
    days.set(warning.tanggal, day);
  }

  return [...days].map(([tanggal, rows]) => ({ tanggal, warnings: rows }));
}

/** One warning in the manager's words: which crew is short, and by how much. */
function coverageLine(warning: CoverageWarning): string {
  const position = POSITION_LABEL[warning.position];

  // A quiet day's kitchen is covered by one person on any shift, middle too,
  // so its warning is about the whole day rather than one shift.
  if (warning.shiftCode === null) {
    return `${position} belum ada yang masuk, termasuk middle.`;
  }

  const shift = SHIFT_LABEL[warning.shiftCode].toLowerCase();

  if (warning.headcount === 0) {
    return `${position} ${shift} belum ada yang masuk.`;
  }

  return `${position} ${shift} baru ${warning.headcount} orang, minimal ${warning.minimum}.`;
}

/**
 * Coverage validation (T7, PRD §Aturan bisnis): the manager's pre-publish
 * check, day by day. It warns and never blocks, so publishing still comes down
 * to the manager's call. This screen is manager-only, which is what keeps the
 * markers off the staff surface.
 */
function CoveragePanel({
  warnings,
  published,
}: {
  warnings: CoverageWarning[];
  published: boolean;
}) {
  const days = groupByDay(warnings);

  return (
    <section aria-labelledby="coverage-heading" className={styles.coverage}>
      <h2 id="coverage-heading" className={styles.coverageTitle}>
        Validasi coverage
      </h2>
      <p className={styles.sectionLead}>
        {published
          ? 'Peringatan ini hanya untuk Anda. Jadwal sudah dipublish, jadi perubahan yang Anda simpan langsung terlihat staf.'
          : 'Peringatan ini hanya untuk Anda. Draft tetap bisa diubah dan dipublish meskipun ada yang kurang.'}
      </p>

      {days.length === 0 ? (
        <p className={styles.coverageClear}>
          Setiap shift sudah memenuhi aturan coverage.
        </p>
      ) : (
        <ul className={styles.coverageList}>
          {days.map((day) => (
            <li key={day.tanggal} className={styles.coverageDay}>
              <h3 className={styles.coverageDayName}>
                {formatDay(day.tanggal)}
              </h3>
              <ul className={styles.coverageWarnings}>
                {day.warnings.map((warning) => (
                  <li key={`${warning.position}-${warning.shiftCode ?? 'day'}`}>
                    {coverageLine(warning)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Publish & share (F6). Before the press it is one action and one sentence of
 * what the press does; after it the action is done, so the panel becomes the
 * share link and names the window the publish opened. The link is the only way
 * staff learn the schedule moved, which is why it sits here, not in a menu.
 */
function PublishPanel({
  draft,
  scheduleLink,
}: {
  draft: DraftSchedule;
  scheduleLink: string;
}) {
  const weekStartDate = draft.weekStartDate;
  if (!weekStartDate) {
    return null;
  }

  if (draft.status !== 'published') {
    return (
      <section aria-labelledby="publish-heading" className={styles.publish}>
        <h2 id="publish-heading" className={styles.publishTitle}>
          Bagikan ke staf
        </h2>
        <p className={styles.publishText}>
          Staf baru melihat jadwal ini setelah dipublish. Publish juga membuka
          jendela request untuk minggu setelahnya.
        </p>
        <PublishButton />
      </section>
    );
  }

  const nextWindow = draft.nextWindow;

  return (
    <section aria-labelledby="publish-heading" className={styles.publish}>
      <h2 id="publish-heading" className={styles.publishTitle}>
        Bagikan ke staf
      </h2>
      <p className={styles.publishText}>
        Sudah dipublish
        {draft.publishedAt ? ` ${formatInstant(draft.publishedAt)}` : ''}. Staf
        bisa melihatnya, dan perubahan setelah ini langsung terlihat juga.
      </p>
      {nextWindow ? (
        <p className={styles.publishText}>
          Request untuk minggu {formatDayMonth(nextWindow.weekStartDate)} dibuka
          sampai {formatInstant(nextWindow.requestDeadline)}.
        </p>
      ) : null}
      {nextWindow ? (
        <div className={styles.shareRow}>
          <a
            className="button-primary"
            href={whatsappShareHref(weekStartDate, nextWindow, scheduleLink)}
            target="_blank"
            rel="noreferrer"
          >
            Bagikan ke WhatsApp
          </a>
          <p className={styles.publishNote}>
            Teks WhatsApp sudah berisi periode jadwal, link, dan batas request.
          </p>
        </div>
      ) : null}
    </section>
  );
}
