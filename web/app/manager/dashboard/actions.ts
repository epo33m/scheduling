'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, decideRequest } from '@/lib/api';

const DASHBOARD_PATH = '/manager/dashboard';

/** What a decision control shows back after a submit: did it land, and why not. */
export interface DecisionState {
  ok: boolean;
  message: string;
}

/**
 * One action drives every decision control on the dashboard. The kind, the row
 * id, and the approve/reject choice all come from the submitting form, so the
 * api stays the only gate: it re-checks the manager role and records the
 * decision. A refused or failed submit still revalidates, so the row snaps back
 * to the server's truth instead of showing a button that seemed to work.
 */
export async function decideAction(
  _previous: DecisionState,
  formData: FormData,
): Promise<DecisionState> {
  const kind = String(formData.get('kind') ?? '');
  const id = String(formData.get('id') ?? '');
  const decision = String(formData.get('decision') ?? '');

  const validKind = kind === 'off' || kind === 'shift';
  const validDecision = decision === 'approve' || decision === 'reject';
  if (!id || !validKind || !validDecision) {
    return { ok: false, message: 'Keputusan tidak valid. Setujui atau tolak.' };
  }

  try {
    await decideRequest(kind, id, decision);
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : 'Gagal menyimpan keputusan. Coba lagi.',
    };
  } finally {
    // Revalidate on success and failure alike: the row must snap back to the
    // server's truth, never stay stuck on a button that only seemed to work.
    revalidatePath(DASHBOARD_PATH);
  }

  return {
    ok: true,
    message: decision === 'approve' ? 'Request disetujui.' : 'Request ditolak.',
  };
}
