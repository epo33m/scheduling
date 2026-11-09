'use client';

import { useActionState, useEffect, useRef } from 'react';
import type { ShiftCode } from '@repo/types';
import { SHIFT_LABEL } from '@/lib/request-labels';
import {
  generateAction,
  saveAssignmentAction,
  type DraftActionState,
} from './actions';
import styles from './draft.module.css';

const initialState: DraftActionState = { ok: false, message: '' };

/**
 * The one button of the screen. A plain form, so it works before hydration;
 * useActionState adds the pending disable and the outcome notice.
 */
export function GenerateButton({ label }: { label: string }) {
  const [state, formAction, pending] = useActionState(
    generateAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.generateForm}>
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
}

/**
 * One staff member on one day. Changing the select submits the cell straight
 * away: a day's placement is a complete decision, so it needs no second button.
 * The submit button stays in the form (visually hidden) to keep it a real form
 * with a real submit control.
 */
export function AssignmentCell({
  employeeId,
  tanggal,
  dayLabel,
  shiftCode,
  choices,
  liburAllowed,
}: CellProps) {
  const [state, formAction, pending] = useActionState(
    saveAssignmentAction,
    initialState,
  );
  const selectRef = useRef<HTMLSelectElement>(null);
  const serverValue = shiftCode ?? 'LIBUR';
  const selectId = `assignment-${employeeId}-${tanggal}`;

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
        disabled={pending}
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
