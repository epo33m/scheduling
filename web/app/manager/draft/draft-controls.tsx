'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { ShiftCode, WeekAlias } from '@repo/types';
import { SHIFT_LABEL } from '@/lib/request-labels';
import {
  generateAction,
  publishAction,
  saveAssignmentAction,
  type DraftActionState,
} from './actions';
import styles from './draft.module.css';

const initialState: DraftActionState = { ok: false, message: '' };

/**
 * The one button of the screen. A plain form, so it works before hydration;
 * useActionState adds the pending disable and the outcome notice. It only ever
 * appears on the target tab: "Buat draft dari minggu lalu" has no meaning for
 * the minggu the staff are already living through (issue #20).
 */
export function GenerateButton({ label }: { label: string }) {
  const [state, formAction, pending] = useActionState(
    generateAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.actionForm}>
      <input type="hidden" name="week" value="target" />
      <button type="submit" className="button-primary" disabled={pending}>
        {pending ? 'Menyusun draft...' : label}
      </button>
      {state.message ? (
        <p
          className={styles.cellNotice}
          role={state.ok ? 'status' : 'alert'}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

/**
 * Publish (F6). The press flips the week live and opens the request window of
 * the following week, so the copy says both; the screen then re-reads the week
 * and swaps this for the share panel. The hidden week keeps the press on the
 * tab the manager is looking at, so a still-draft running week can be published
 * late (issue #20).
 */
export function PublishButton({ week }: { week: WeekAlias }) {
  const [state, formAction, pending] = useActionState(
    publishAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.actionForm}>
      <input type="hidden" name="week" value={week} />
      <button type="submit" className="button-primary" disabled={pending}>
        {pending ? 'Mempublish...' : 'Publish jadwal'}
      </button>
      {state.message ? (
        <p
          className={styles.cellNotice}
          role={state.ok ? 'status' : 'alert'}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

interface CellProps {
  employeeId: string;
  /** The day, `YYYY-MM-DD` and uniquely identifies this cell. */
  tanggal: string;
  /** "Senin" and friends, the day the manager reads. */
  dayLabel: string;
  shiftCode: ShiftCode | null;
  /** Pagi and sore for bar; the kitchen adds middle (PRD §Jenis shift). */
  choices: readonly ShiftCode[];
  /** Senin–Kamis only: Jumat–Minggu is busy and everyone works. */
  liburAllowed: boolean;
  /** The minggu this cell belongs to, sent with the edit (issue #20). */
  week: WeekAlias;
  /** A day before today (WITA): read-only, the api refuses the write too. */
  locked: boolean;
}

/**
 * One staff member on one day. Changing the select submits the cell straight
 * away: a day's placement is a complete decision, so it needs no second button.
 * The submit button stays in the form (visually hidden) to keep it a real form
 * with a real submit control. On the running tab a day already past comes back
 * `locked`: its select is disabled so the manager cannot reach a shift staff
 * have already worked.
 */
export function AssignmentCell({
  employeeId,
  tanggal,
  dayLabel,
  shiftCode,
  choices,
  liburAllowed,
  week,
  locked,
}: CellProps) {
  const [state, formAction, pending] = useActionState(
    saveAssignmentAction,
    initialState,
  );
  const selectRef = useRef<HTMLSelectElement>(null);
  const serverValue = shiftCode ?? 'LIBUR';
  const selectId = `assignment-${week}-${employeeId}-${tanggal}`;

  // The select stays uncontrolled so the form works before hydration, but the
  // server is the truth: after a regeneration or a refused edit it must show
  // what the draft holds, not the value the manager last picked.
  useEffect(() => {
    const select = selectRef.current;
    if (select && select.value !== serverValue) {
      select.value = serverValue;
    }
  }, [serverValue, state]);

  return (
    <form action={formAction} className={styles.cell}>
      <input type="hidden" name="week" value={week} />
      <input type="hidden" name="employeeId" value={employeeId} />
      <input type="hidden" name="tanggal" value={tanggal} />
      <label className={styles.cellDay} htmlFor={selectId}>
        {dayLabel}
      </label>
      <select
        ref={selectRef}
        id={selectId}
        name="shiftCode"
        className={styles.select}
        defaultValue={serverValue}
        disabled={pending || locked}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {/* Kept as a disabled option on Jumat–Minggu so a day off written
            before this rule still displays instead of blanking the select. */}
        {liburAllowed || shiftCode === null ? (
          <option value="LIBUR" disabled={!liburAllowed}>
            Libur
          </option>
        ) : null}
        {choices.map((code) => (
          <option key={code} value={code}>
            {SHIFT_LABEL[code]}
          </option>
        ))}
      </select>
      <button type="submit" className={styles.srOnly} disabled={pending}>
        Simpan {dayLabel}
      </button>
      {state.message ? (
        <p
          className={styles.cellNotice}
          role={state.ok ? 'status' : 'alert'}
          aria-live="polite"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
