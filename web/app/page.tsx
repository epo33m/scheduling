/**
 * Placeholder root route: proves the app renders and the DESIGN.md token layer
 * loads. The staff view (T9) and manager dashboard (T5) replace it.
 */
export default function Home() {
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
      <p
        style={{
          margin: 'var(--spacing-xs) 0 0',
          fontSize: 'var(--text-body-size)',
          fontWeight: 'var(--text-body-weight)',
          lineHeight: 'var(--text-body-line-height)',
          letterSpacing: 'var(--text-body-tracking)',
        }}
      >
        Jadwal shift mingguan untuk enam staf bar dan kitchen.
      </p>
    </main>
  );
}
