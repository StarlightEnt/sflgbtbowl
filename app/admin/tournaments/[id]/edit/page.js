import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import TournamentForm from "@/components/Admin/TournamentForm";
import styles from "../../page.module.scss";

export default async function EditTournamentPage({ params }) {
  const { id } = await params;
  const rows = await sql`SELECT * FROM tournaments WHERE id = ${Number(id)}`;
  const tournament = rows[0];
  if (!tournament) notFound();

  return (
    <>
      <h1 className={`display ${styles.heading}`}>Edit Tournament</h1>
      <p className={styles.sub}>{tournament.name}</p>
      <TournamentForm tournament={tournament} />
    </>
  );
}
