"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./OfficersManager.module.scss";

export default function OfficersManager({ officers, eligibleBowlers }) {
  const router = useRouter();

  const [selectedBowlerId, setSelectedBowlerId] = useState(eligibleBowlers[0]?.id ?? "");
  const [addStatus, setAddStatus] = useState("idle");
  const [addError, setAddError] = useState("");
  const [removingId, setRemovingId] = useState(null);
  const [removeError, setRemoveError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    if (!selectedBowlerId) return;
    setAddStatus("adding");
    setAddError("");
    try {
      const res = await fetch("/api/admin/officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bowlerId: Number(selectedBowlerId) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add failed");
      setAddStatus("idle");
      router.refresh();
    } catch (err) {
      setAddError(err.message);
      setAddStatus("error");
    }
  }

  async function handleRemove(bowlerId, name) {
    if (!window.confirm(`Remove ${name} as an officer?`)) return;
    setRemovingId(bowlerId);
    setRemoveError("");
    try {
      const res = await fetch(`/api/admin/officers/${bowlerId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Remove failed");
      router.refresh();
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <>
      <h1 className={`display ${styles.heading}`}>Officers</h1>
      <p className={styles.sub}>
        Officers can view and edit every bowler&apos;s demographics (including contact info) and
        manage Announcements. They can&apos;t manage other officers or reach Season Setup, Weekly
        uploads, Schedule, By-Laws, Tournaments, or Admin Settings.
      </p>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Current officers</div>

        {officers.length === 0 ? (
          <p className={styles.cardSub}>No officers yet.</p>
        ) : (
          officers.map((o) => {
            const name = `${o.first_name} ${o.last_name}`;
            return (
              <div key={o.bowler_id} className={styles.officerRow}>
                <div className={styles.who}>
                  <span className={styles.name}>{name}</span>
                  <span className={styles.email}>{o.email}</span>
                  <span className={styles.meta}>
                    Added {new Date(o.added_at).toLocaleDateString("en-US")} by {o.added_by}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.removeBtn}
                  disabled={removingId === o.bowler_id}
                  onClick={() => handleRemove(o.bowler_id, name)}
                >
                  {removingId === o.bowler_id ? "Removing…" : "Remove"}
                </button>
              </div>
            );
          })
        )}

        {removeError && <div className={styles.statusError}>✕ {removeError}</div>}

        <form className={styles.addRow} onSubmit={handleAdd}>
          {eligibleBowlers.length === 0 ? (
            <p className={styles.cardSub}>
              No eligible bowlers — a bowler needs a login email on file before they can be made
              an officer.
            </p>
          ) : (
            <>
              <select
                className={styles.picker}
                value={selectedBowlerId}
                onChange={(e) => setSelectedBowlerId(e.target.value)}
              >
                {eligibleBowlers.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.first_name} {b.last_name} ({b.email})
                  </option>
                ))}
              </select>
              <button type="submit" className={styles.btnAdd} disabled={addStatus === "adding"}>
                {addStatus === "adding" ? "Adding…" : "Make officer"}
              </button>
            </>
          )}
        </form>
        {addStatus === "error" && <div className={styles.statusError}>✕ {addError}</div>}
      </div>
    </>
  );
}
