'use server';

import { revalidatePath } from 'next/cache';
import type { WeekAlias } from '@repo/types';
import {
  ApiError,
  generateDraft,
  publishSchedule,
  saveAssignment,
} from '@/lib/api';

const DRAFT_PATH = '/manager/draft';

/** What a draft control shows back after submitting: did it land, and why not. */
export interface DraftActionState {
  ok: boolean;
  message: string;
}

/**
 * The tab the submitting control belongs to (issue #20). Each draft form
 * carries its week in a hidden field, so the mutation lands on the minggu the
 * manager is looking at rather than always the target.
 */
function weekFrom(formData: FormData): WeekAlias {
  return formData.get('week') === 'running' ? 'running' : 'target';
}

/**
 * "Buat draft dari minggu lalu". The api runs alur 4.1–4.4 and replaces the
 * draft, so a failed press still revalidates: the screen must show what the
 * server actually holds, never a draft that only seemed to be built. The api
 * refuses this on the running week, and the running view hides the button.
 */
export async function generateAction(
  _previous: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  try {
    await generateDraft(weekFrom(formData));
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  } finally {
    revalidatePath(DRAFT_PATH);
  }

  return { ok: true, message: 'Draft dibuat dari minggu lalu.' };
}

/**
 * Publish (F6). The api flips the week and opens the next request window in one
 * call, so a failure must still revalidate: the screen has to show whether the
 * week is live, never the state it had before the press. The selected week may
 * be a still-draft running week, which the same call publishes late.
 */
export async function publishAction(
  _previous: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  try {
    await publishSchedule(weekFrom(formData));
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  } finally {
    revalidatePath(DRAFT_PATH);
  }

  return { ok: true, message: 'Jadwal sudah dipublish.' };
}

/**
 * One cell of the draft. "LIBUR" is the select's value for a day off, which the
 * api stores as a null shift; everything else is a shift code the api checks
 * against the staff member's position and the day. The api also refuses a day
 * already past (WITA) on the running week.
 */
export async function saveAssignmentAction(
  _previous: DraftActionState,
  formData: FormData,
): Promise<DraftActionState> {
  const employeeId = String(formData.get('employeeId') ?? '');
  const tanggal = String(formData.get('tanggal') ?? '');
  const picked = String(formData.get('shiftCode') ?? '');

  const shiftCode =
    picked === 'LIBUR'
      ? null
      : picked === 'PAGI' || picked === 'SORE' || picked === 'MIDDLE'
        ? picked
        : undefined;

  if (!employeeId || !tanggal || shiftCode === undefined) {
    return { ok: false, message: 'Perubahan jadwal tidak valid.' };
  }

  try {
    await saveAssignment(employeeId, tanggal, shiftCode, weekFrom(formData));
  } catch (error) {
    return { ok: false, message: failureMessage(error) };
  } finally {
    revalidatePath(DRAFT_PATH);
  }

  return { ok: true, message: 'Tersimpan.' };
}

function failureMessage(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : 'Gagal menyimpan jadwal. Coba lagi.';
}
