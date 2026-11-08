'use client';

import { useActionState } from 'react';
import type { OffRequestView, ShiftCode, ShiftRequestView } from '@repo/types';
import {
  REQUESTABLE_SHIFTS,
  REQUEST_STATUS_LABEL,
  SHIFT_LABEL,
  dayName,
  type TargetDay,
} from '@/lib/request-labels';
import {
  setOffAction,
  setShiftAction,
  type RequestActionState,
} from './actions';
import styles from './request.module.css';

const initialState: RequestActionState = { ok: false, message: '' };

interface Props {
  /** Monday of the target week; used to name a requested day. */
  weekStartDate: string;
  /** False once the WITA deadline has passed: every control goes inert. */
  windowOpen: boolean;
  offRequest: OffRequestView | null;
  shiftRequests: ShiftRequestView[];
  days: TargetDay[];
}

/**
 * The two request controls for one staff member's open window. Each is a plain
 * HTML form driving a server action, so it works before hydration; useActionState
 * only adds the "pending" disable and the saved-message notice. The api owns
 * every rule (Senin-Kamis, max 1 libur, one shift per day), so nothing here
 * pre-validates: a rejected pick simply comes back as the api's own message.
 */
export function RequestControls({
  weekStartDate,
  windowOpen,
  offRequest,
  shiftRequests,
  days,
}: Props) {
  const [offState, offFormAction, offPending] = useActionState(
    setOffAction,
    initialState,
  );
  const [shiftState, shiftFormAction, shiftPending] = useActionState(
    setShiftAction,
    initialState,
  );

  const busy = !windowOpen || offPending || shiftPending;
  const liburDays = days.filter((day) => day.offAllowed);

  return (
    <>
      <section className={styles.card} aria-labelledby="libur-heading">
        <h2 id="libur-heading" className={styles.sectionTitle}>
          Request libur
        </h2>
        <p className={styles.current}>
          {offRequest
            ? `Libur: ${dayName(weekStartDate, offRequest.tanggal) ?? offRequest.tanggal}`
            : 'Belum ada request libur.'}
        </p>
        <p className={styles.status}>
          {offRequest ? REQUEST_STATUS_LABEL[offRequest.status] : 'Pilih satu hari.'}
        </p>

        <form action={offFormAction}>
          <div className={styles.picker} role="group" aria-label="Hari libur">
            {liburDays.map((day) => (
              <button
                key={day.tanggal}
                type="submit"
                name="tanggal"
                value={day.tanggal}
                disabled={busy}
                aria-pressed={offRequest?.tanggal === day.tanggal}
                className={
                  offRequest?.tanggal === day.tanggal
                    ? `${styles.choice} ${styles.choiceSelected}`
                    : styles.choice
                }
              >
                {day.name}
              </button>
            ))}
            {offRequest ? (
              <button
                type="submit"
                name="tanggal"
                value=""
                disabled={busy}
                className={styles.choice}
              >
                Batalkan libur
              </button>
            ) : null}
          </div>

          {offState.message ? (
            <p
              className={styles.notice}
              role={offState.ok ? 'status' : 'alert'}
              aria-live="polite"
            >
              {offState.message}
            </p>
          ) : null}
        </form>
      </section>

      <section className={styles.card} aria-labelledby="shift-heading">
        <h2 id="shift-heading" className={styles.sectionTitle}>
          Request shift
        </h2>
        <p className={styles.status}>
          Satu request per hari. Manager akan mengusahakannya, bukan menjamin.
        </p>

        <div>
          {days.map((day) => {
            const current = shiftRequests.find((s) => s.tanggal === day.tanggal);
            return (
              <form
                key={day.tanggal}
                action={shiftFormAction}
                className={styles.dayRow}
              >
                <input type="hidden" name="tanggal" value={day.tanggal} />
                <span className={styles.dayName}>{day.name}</span>
                <span className={styles.dayPickers}>
                  {current ? (
                    <span className={styles.dayStatus}>
                      {SHIFT_LABEL[current.shiftCode]} ·{' '}
                      {REQUEST_STATUS_LABEL[current.status]}
                    </span>
                  ) : null}
                  {REQUESTABLE_SHIFTS.map((code: ShiftCode) => (
                    <button
                      key={code}
                      type="submit"
                      name="shiftCode"
                      value={code}
                      disabled={busy}
                      aria-pressed={current?.shiftCode === code}
                      className={
                        current?.shiftCode === code
                          ? `${styles.choice} ${styles.choiceSmall} ${styles.choiceSelected}`
                          : `${styles.choice} ${styles.choiceSmall}`
                      }
                    >
                      {SHIFT_LABEL[code]}
                    </button>
                  ))}
                  {current ? (
                    <button
                      type="submit"
                      name="shiftCode"
                      value=""
                      disabled={busy}
                      className={`${styles.choice} ${styles.choiceSmall}`}
                    >
                      Hapus
                    </button>
                  ) : null}
                </span>
              </form>
            );
          })}
        </div>

        {shiftState.message ? (
          <p
            className={styles.notice}
            role={shiftState.ok ? 'status' : 'alert'}
            aria-live="polite"
          >
            {shiftState.message}
          </p>
        ) : null}
      </section>
    </>
  );
}
