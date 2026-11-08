'use server';

import { revalidatePath } from 'next/cache';
import { ApiError, createEmployee, setEmployeeActive } from '@/lib/api';

const STAFF_PATH = '/manager/staff';

/** What the add-staff form shows back: whether the save worked, and why not. */
export interface ActionState {
  ok: boolean;
  message: string;
}

function field(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

export async function createEmployeeAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const probationEndDate = field(formData, 'probationEndDate');

  // The api owns validation and email normalisation; the web only forwards the
  // form as typed. Empty date becomes null so a tetap row has no stray value.
  try {
    await createEmployee({
      name: field(formData, 'name'),
      email: field(formData, 'email'),
      position: formData.get('position'),
      role: formData.get('role'),
      status: formData.get('status'),
      probationEndDate: probationEndDate || null,
    });
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof ApiError
          ? error.message
          : 'Gagal menyimpan staf. Coba lagi.',
    };
  }

  revalidatePath(STAFF_PATH);
  return { ok: true, message: 'Staf berhasil ditambahkan.' };
}

export async function setActiveAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const activate = formData.get('active') === 'true';

  try {
    await setEmployeeActive(id, activate);
  } catch {
    // A refused or failed toggle still revalidates below, so the row snaps back
    // to the server's truth instead of showing a button that "worked".
  }

  revalidatePath(STAFF_PATH);
}
