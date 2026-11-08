'use server';

import { revalidatePath } from 'next/cache';
import {
  ApiError,
  cancelOffRequest,
  cancelShiftRequest,
  setOffRequest,
  setShiftRequest,
} from '@/lib/api';

const REQUEST_PATH = '/staff/request';

/** What a control shows back after a save: did it work, and the human reason. */
export interface RequestActionState {
  ok: boolean;
  message: string;
}

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function failure(error: unknown, fallback: string): RequestActionState {
  return {
    ok: false,
    message: error instanceof ApiError ? error.message : fallback,
  };
}

/**
 * One action drives the whole libur control: a day value submits or replaces
 * the request, an empty value (the "Batalkan" button) withdraws it. The api
 * owns the Senin-Kamis and max-1 rules, so the web never pre-validates.
 */
export async function setOffAction(
  _previous: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const tanggal = field(formData, 'tanggal');

  try {
    if (tanggal) {
      await setOffRequest(tanggal);
      return { ok: true, message: 'Request libur tersimpan.' };
    }
    await cancelOffRequest();
    return { ok: true, message: 'Request libur dibatalkan.' };
  } catch (error) {
    return failure(error, 'Gagal menyimpan request libur. Coba lagi.');
  } finally {
    revalidatePath(REQUEST_PATH);
  }
}

/**
 * The shift control per day: a shift code submits or replaces that day's
 * preference, an empty code withdraws it. Best-effort, so a save only confirms
 * capture, never approval.
 */
export async function setShiftAction(
  _previous: RequestActionState,
  formData: FormData,
): Promise<RequestActionState> {
  const tanggal = field(formData, 'tanggal');
  const shiftCode = field(formData, 'shiftCode');

  try {
    if (shiftCode) {
      await setShiftRequest(tanggal, shiftCode);
      return { ok: true, message: 'Request shift tersimpan.' };
    }
    await cancelShiftRequest(tanggal);
    return { ok: true, message: 'Request shift hari itu dihapus.' };
  } catch (error) {
    return failure(error, 'Gagal menyimpan request shift. Coba lagi.');
  } finally {
    revalidatePath(REQUEST_PATH);
  }
}
