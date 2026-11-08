import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Placeholder root route: middleware already guarantees a session, so this
 * greets whoever is signed in. The staff view (T9) and manager dashboard (T5)
 * replace it.
 */
export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const body = {
    margin: 'var(--spacing-xs) 0 0',
    fontSize: 'var(--text-body-size)',
    fontWeight: 'var(--text-body-weight)',
    lineHeight: 'var(--text-body-line-height)',
    letterSpacing: 'var(--text-body-tracking)',
  } as const;

  return (
    <main style={{ padding: 'var(--spacing-lg)' }}>
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-display-lg-size)',
          fontWeight: 'var(--text-display-lg-weight)',
          lineHeight: 'var(--text-display-lg-line-height)',
          letterSpacing: 'var(--text-display-lg-tracking)',
        }}
      >
        Kyne
      </h1>
      <p style={body}>Jadwal shift mingguan untuk enam staf bar dan kitchen.</p>
      <p style={{ ...body, marginTop: 'var(--spacing-lg)' }}>
        Masuk sebagai {user?.email ?? 'akun tanpa email'}.
      </p>
      <p style={body}>Dashboard manager dan tampilan jadwal staf menyusul.</p>
    </main>
  );
}
