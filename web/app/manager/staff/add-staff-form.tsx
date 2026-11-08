'use client';

import { useId, useState, useActionState } from 'react';
import {
  EMPLOYEE_POSITIONS,
  EMPLOYEE_ROLES,
  EMPLOYEE_STATUSES,
} from '@repo/types';
import {
  POSITION_LABEL,
  ROLE_LABEL,
  STATUS_LABEL,
} from '@/lib/employee-labels';
import { createEmployeeAction, type ActionState } from './actions';
import styles from './staff.module.css';

const initialState: ActionState = { ok: false, message: '' };

export function AddStaffForm() {
  const uid = useId();
  const [status, setStatus] = useState('probation');
  const [state, formAction, pending] = useActionState(
    createEmployeeAction,
    initialState,
  );

  // Probation always has an end date; a tetap hire does not need one (F2).
  const onProbation = status === 'probation';

  return (
    <form action={formAction} className={styles.card}>
      <div className={styles.formGrid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-name`}>
            Nama
          </label>
          <input
            className={styles.input}
            id={`${uid}-name`}
            name="name"
            type="text"
            autoComplete="off"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-email`}>
            Email Google
          </label>
          <input
            className={styles.input}
            id={`${uid}-email`}
            name="email"
            type="email"
            autoComplete="off"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-position`}>
            Posisi
          </label>
          <select
            className={styles.select}
            id={`${uid}-position`}
            name="position"
            defaultValue="bar"
          >
            {EMPLOYEE_POSITIONS.map((value) => (
              <option key={value} value={value}>
                {POSITION_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-role`}>
            Peran
          </label>
          <select
            className={styles.select}
            id={`${uid}-role`}
            name="role"
            defaultValue="staff"
          >
            {EMPLOYEE_ROLES.map((value) => (
              <option key={value} value={value}>
                {ROLE_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${uid}-status`}>
            Status
          </label>
          <select
            className={styles.select}
            id={`${uid}-status`}
            name="status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {EMPLOYEE_STATUSES.map((value) => (
              <option key={value} value={value}>
                {STATUS_LABEL[value]}
              </option>
            ))}
          </select>
        </div>

        {onProbation ? (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${uid}-probation`}>
              Selesai probation
            </label>
            <input
              className={styles.input}
              id={`${uid}-probation`}
              name="probationEndDate"
              type="date"
              required
            />
          </div>
        ) : null}
      </div>

      <div className={styles.formActions}>
        <button
          type="submit"
          className="button-primary"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? 'Menyimpan...' : 'Tambah staf'}
        </button>
      </div>

      {state.message ? (
        <p
          className={styles.notice}
          role={state.ok ? 'status' : 'alert'}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
