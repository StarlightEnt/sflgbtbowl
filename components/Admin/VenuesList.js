"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { venueCityState } from "@/lib/venues/format";
import styles from "./VenuesList.module.scss";

export default function VenuesList({ venues }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  async function handleDelete(venue) {
    if (!window.confirm(`Delete ${venue.name}?`)) return;
    setDeletingId(venue.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/venues/${venue.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (venues.length === 0) {
    return <p className={styles.emptyNote}>No venues yet — create the first one.</p>;
  }

  return (
    <>
      {error && <div className={styles.statusError}>✕ {error}</div>}
      <table className={styles.list}>
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>City / State</th>
            <th>League</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {venues.map((v) => {
            const inUse = Boolean(v.league_names);
            return (
              <tr key={v.id}>
                <td>
                  <div className={styles.logoThumb}>
                    {v.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.logo_url} alt="" />
                    ) : (
                      <span className={styles.logoPlaceholder} aria-hidden="true">
                        🎳
                      </span>
                    )}
                  </div>
                </td>
                <td className={styles.nameCell}>{v.name}</td>
                <td className={styles.mutedCell}>{venueCityState(v) || "—"}</td>
                <td className={styles.mutedCell}>{v.league_names || "—"}</td>
                <td>
                  <span className={v.is_visible ? styles.badgeActive : styles.badgeInactive}>
                    {v.is_visible ? "Visible" : "Hidden"}
                  </span>
                </td>
                <td className={styles.actionsCell}>
                  <Link href={`/admin/venues/${v.id}/edit`} className={styles.actionLink}>
                    Edit
                  </Link>
                  <button
                    type="button"
                    className={styles.actionLinkDanger}
                    disabled={inUse || deletingId === v.id}
                    title={
                      inUse
                        ? `Can't delete — used by ${v.league_names}. Change that league's venue in League Setup first.`
                        : undefined
                    }
                    onClick={() => handleDelete(v)}
                  >
                    {deletingId === v.id ? "Deleting…" : "Delete"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
