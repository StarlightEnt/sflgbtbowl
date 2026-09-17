"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTournamentDateRange } from "@/lib/tournaments/formatDateRange";
import styles from "./TournamentsList.module.scss";

export default function TournamentsList({ tournaments }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function handleDelete(id) {
    if (!window.confirm("Delete this tournament entry?")) return;
    setDeletingId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/tournaments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (tournaments.length === 0) {
    return <p className={styles.emptyNote}>No tournaments yet — create the first one.</p>;
  }

  return (
    <>
      {error && <div className={styles.statusError}>✕ {error}</div>}
      <table className={styles.list}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Dates</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tournaments.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{formatTournamentDateRange(t.start_date, t.end_date)}</td>
              <td>
                <span className={t.is_active ? styles.badgeActive : styles.badgeInactive}>
                  {t.is_active ? "Active" : "Inactive"}
                </span>
              </td>
              <td className={styles.actionsCell}>
                <Link href={`/admin/tournaments/${t.id}/edit`} className={styles.actionLink}>
                  Edit
                </Link>
                <button
                  type="button"
                  className={styles.actionLinkDanger}
                  disabled={deletingId === t.id}
                  onClick={() => handleDelete(t.id)}
                >
                  {deletingId === t.id ? "Deleting…" : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
