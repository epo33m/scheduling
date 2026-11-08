import type { Metadata } from 'next';
import type { ManagedEmployee } from '@repo/types';
import { ApiError, listEmployees } from '@/lib/api';
import { AddStaffForm } from './add-staff-form';
import { setActiveAction } from './actions';
import styles from './staff.module.css';

export const metadata: Metadata = {
  title: 'Kelola staf | Kyne',
};

// The roster is read straight from the api on every request, so a manager
// always sees the current staff and any probation that has just advanced.
export const dynamic = 'force-dynamic';

const POSITION_LABEL: Record<string, string> = {
  bar: 'Bar',
  kitchen: 'Kitchen',
};
const ROLE_LABEL: Record<string, string> = {
  staff: 'Staf',
  manager: 'Manager',
};
const STATUS_LABEL: Record<string, string> = {
  probation: 'Probation',
  tetap: 'Tetap',
};

/**
 * Manager-only screen for F2: add staff and deactivate/reactivate them. The
 * api enforces the manager role, so a staff member who reaches this route
 * simply gets the "khusus manager" message in the error state instead of a
 * roster.
 */
export default async function StaffPage() {
  let employees: ManagedEmployee[];
  let loadError: string | null = null;

  try {
    employees = await listEmployees();
  } catch (error) {
    employees = [];
    loadError =
      error instanceof ApiError
        ? error.message
        : 'Tidak bisa memuat daftar staf. Coba lagi.';
  }

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>Kelola staf</h1>
      <p className={styles.lead}>
        Tambahkan staf baru atau nonaktifkan akun. Staf yang dinonaktifkan tidak
        bisa masuk, tetapi riwayat jadwalnya tetap tersimpan.
      </p>

      <h2 className={styles.sectionTitle}>Tambah staf</h2>
      <AddStaffForm />

      <h2 className={styles.sectionTitle}>Daftar staf</h2>
      {loadError ? (
        <p role="alert" className={styles.error}>
          {loadError}
        </p>
      ) : employees.length === 0 ? (
        <p className={styles.empty}>
          Belum ada staf. Tambahkan staf pertama di atas.
        </p>
      ) : (
        <ul className={styles.list}>
          {employees.map((employee) => (
            <StaffCard key={employee.id} employee={employee} />
          ))}
        </ul>
      )}
    </main>
  );
}

function StaffCard({ employee }: { employee: ManagedEmployee }) {
  const statusText =
    employee.status === 'probation' && employee.probationEndDate
      ? `Probation hingga ${employee.probationEndDate}`
      : STATUS_LABEL[employee.status];

  return (
    <li
      className={
        employee.isActive
          ? styles.staffCard
          : `${styles.staffCard} ${styles.staffCardInactive}`
      }
    >
      <div className={styles.cardHead}>
        <h3 className={styles.name}>{employee.name}</h3>
        <p className={styles.state}>
          {employee.isActive ? 'Aktif' : 'Nonaktif'}
        </p>
      </div>

      <dl className={styles.details}>
        <div>
          <dt className={styles.detailTerm}>Email</dt>
          <dd className={styles.detailValue}>{employee.email}</dd>
        </div>
        <div>
          <dt className={styles.detailTerm}>Posisi</dt>
          <dd className={styles.detailValue}>
            {POSITION_LABEL[employee.position]}
          </dd>
        </div>
        <div>
          <dt className={styles.detailTerm}>Peran</dt>
          <dd className={styles.detailValue}>{ROLE_LABEL[employee.role]}</dd>
        </div>
        <div>
          <dt className={styles.detailTerm}>Status</dt>
          <dd className={styles.detailValue}>{statusText}</dd>
        </div>
      </dl>

      {/* One toggle per row: deactivate an active staff member, reactivate an
          inactive one. The api reuses the same row, so history is never lost. */}
      <form action={setActiveAction}>
        <input type="hidden" name="id" value={employee.id} />
        <input
          type="hidden"
          name="active"
          value={employee.isActive ? 'false' : 'true'}
        />
        <button type="submit" className="button-secondary">
          {employee.isActive ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      </form>
    </li>
  );
}
