'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import styles from './login.module.css';

/**
 * Starts the PKCE redirect: the browser leaves for Google and comes back to
 * /auth/callback, so the only visible state here is the moment before it does.
 */
export function LoginForm({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void signIn();
      }}
    >
      {failed ? (
        <p role="alert" className={styles.notice}>
          Tidak bisa menghubungi Google. Periksa koneksi lalu coba lagi.
        </p>
      ) : null}
      <button
        type="submit"
        className={`button-primary ${styles.submit}`}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? 'Membuka Google...' : 'Masuk dengan Google'}
      </button>
    </form>
  );
}
