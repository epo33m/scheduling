import { redirect } from 'next/navigation';
import type { SessionEmployee } from '@repo/types';
import { ApiError, getMe } from '@/lib/api';
import { homeRouteForRole } from '@/lib/home-route';
import styles from './home.module.css';

/**
 * The root route is a router, not a screen. The request gate has already
 * confirmed a live session, so the only thing left to resolve is which role the
 * signed-in account carries and which screen that role owns. Reading the profile
 * is a server call, hence dynamic: it must run against the caller's own session,
 * never a prerendered snapshot.
 */
export const dynamic = 'force-dynamic';

export default async function Home() {
  let me: SessionEmployee;
  try {
    me = await getMe();
  } catch (error) {
    // Only the fetch is wrapped. `redirect` throws NEXT_REDIRECT on purpose, so
    // it stays outside this try to avoid being swallowed as a failure.
    return <HomeFallback error={error} />;
  }

  redirect(homeRouteForRole(me.role));
}

/**
 * Shown when the profile cannot be resolved. Three real outcomes, each with a
 * working escape hatch: not whitelisted (403, switch account), session ended
 * (401, sign in again), or the api is unreachable (retry). The api message is
 * already safe to show, so it carries the specific detail.
 */
function HomeFallback({ error }: { error: unknown }) {
  const status = error instanceof ApiError ? error.status : undefined;
  const detail =
    error instanceof ApiError
      ? error.message
      : 'Terjadi kesalahan tak terduga.';

  let title: string;
  let action: { href: string; label: string };

  if (status === 403) {
    title = 'Akun kamu belum bisa masuk.';
    action = { href: '/login', label: 'Masuk dengan akun lain' };
  } else if (status === 401) {
    title = 'Sesi kamu sudah berakhir.';
    action = { href: '/login', label: 'Masuk lagi' };
  } else {
    title = 'Jadwal belum bisa dimuat.';
    action = { href: '/', label: 'Coba lagi' };
  }

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <h1 className={styles.wordmark}>Kyne</h1>
        <p className={styles.title} role="alert">
          {title}
        </p>
        <p className={styles.body}>{detail}</p>
        <a href={action.href} className={`button-secondary ${styles.action}`}>
          {action.label}
        </a>
      </div>
    </main>
  );
}
