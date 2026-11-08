export default function Home() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 'var(--spacing-xs)',
        padding: 'var(--spacing-lg)',
      }}
    >
      {/* DESIGN.md {typography.display-lg}: 40px / 600 / 1.10 / 0 tracking */}
      <h1
        style={{
          margin: 0,
          fontFamily: 'var(--font-display)',
          fontSize: '40px',
          fontWeight: 600,
          lineHeight: 1.1,
        }}
      >
        Kyne
      </h1>
      {/* DESIGN.md {typography.body}: 17px / 400 / 1.47 / -0.374px */}
      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-text)',
          fontSize: '17px',
          fontWeight: 400,
          lineHeight: 1.47,
          letterSpacing: '-0.374px',
        }}
      >
        Jadwal shift mingguan untuk enam staf bar dan kitchen.
      </p>
    </main>
  );
}
