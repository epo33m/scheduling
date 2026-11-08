import type { Metadata } from 'next';
import { LOGIN_ERRORS, readLoginError } from '@/lib/login-error';
import { safeNext } from '@/lib/safe-next';
import { LoginForm } from './login-form';
import styles from './login.module.css';

export const metadata: Metadata = {
  title: 'Masuk ke Kyne',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = safeNext(
    typeof params.next === 'string' ? params.next : undefined,
  );
  const error = readLoginError(params.error);

  return (
    <main className={styles.page}>
      <div className={styles.panel}>
        <h1 className={styles.wordmark}>Kyne</h1>
        <p className={styles.lead}>
          Jadwal shift mingguan untuk tim bar dan kitchen. Masuk dengan akun
          Google yang sudah didaftarkan manager.
        </p>
        {error ? (
          <p role="alert" className={styles.notice}>
            {LOGIN_ERRORS[error]}
          </p>
        ) : null}
        <LoginForm next={next} />
      </div>
    </main>
  );
}
