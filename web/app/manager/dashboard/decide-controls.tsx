'use client';

import { useActionState } from 'react';
import { decideAction, type DecisionState } from './actions';
import styles from './dashboard.module.css';

const initialState: DecisionState = { ok: false, message: '' };

interface Props {
  /** Which endpoint the decision posts to: a libur row or a shift row. */
  kind: 'off' | 'shift';
  /** The request row id, carried as a hidden field so the action knows the target. */
  id: string;
}

/**
 * The manager's decision on one pending request: a plain HTML form with two
 * submit buttons, so it works before hydration. useActionState only adds the
 * pending disable and the outcome notice. Once a request is decided the
 * dashboard re-renders it as text and drops this control, so the Action Blue
 * accent stays on the choices still open.
 */
export function DecideControls({ kind, id }: Props) {
  const [state, formAction, pending] = useActionState(
    decideAction,
    initialState,
  );

  return (
    <form action={formAction} className={styles.decide}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <div
        className={styles.decideRow}
        role="group"
        aria-label="Keputusan request"
      >
        <button
          type="submit"
          name="decision"
          value="approve"
          disabled={pending}
          className="button-primary"
        >
          Setujui
        </button>
        <button
          type="submit"
          name="decision"
          value="reject"
          disabled={pending}
          className="button-secondary"
        >
          Tolak
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
