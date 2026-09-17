import TournamentForm from "@/components/Admin/TournamentForm";
import styles from "../page.module.scss";

export default function NewTournamentPage() {
  return (
    <>
      <h1 className={`display ${styles.heading}`}>New Tournament</h1>
      <p className={styles.sub}>Save writes directly — no draft state, no separate publish step.</p>
      <TournamentForm tournament={null} />
    </>
  );
}
