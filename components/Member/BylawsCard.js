import styles from "./MemberRoster.module.scss";

export default function BylawsCard({ current }) {
  return (
    <section className={styles.section}>
      <h2>League By-Laws</h2>
      <div className={styles.card}>
        {current ? (
          <>
            <p className={styles.sectionSub}>
              Current official version — Revision {current.revision_label},
              uploaded {new Date(current.uploaded_at).toLocaleDateString("en-US")}.
            </p>
            <a
              href={current.file_url}
              target="_blank"
              rel="noreferrer"
              className={styles.btnDownload}
            >
              Download PDF
            </a>
          </>
        ) : (
          <p className={styles.emptyNote}>
            By-Laws haven&apos;t been posted for this season yet.
          </p>
        )}
      </div>
    </section>
  );
}
