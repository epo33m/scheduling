import styles from './draft.module.css';

/** The draft is read on every visit, so the wait gets a line of its own. */
export default function Loading() {
  return (
    <main className={styles.page}>
      <p role="status" className={styles.empty}>
        Memuat draft minggu depan.
      </p>
    </main>
  );
}
