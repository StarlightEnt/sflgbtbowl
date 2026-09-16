"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AdminSettingsForm.module.scss";

export default function AdminSettingsForm({ admins, currentEmail }) {
  const router = useRouter();

  const [newEmail, setNewEmail] = useState("");
  const [addStatus, setAddStatus] = useState("idle");
  const [addError, setAddError] = useState("");
  const [removingEmail, setRemovingEmail] = useState(null);
  const [removeError, setRemoveError] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    setAddStatus("adding");
    setAddError("");
    try {
      const res = await fetch("/api/admin/settings/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Add failed");
      setNewEmail("");
      setAddStatus("idle");
      router.refresh();
    } catch (err) {
      setAddError(err.message);
      setAddStatus("error");
    }
  }

  async function handleRemove(email) {
    setRemovingEmail(email);
    setRemoveError("");
    try {
      const res = await fetch("/api/admin/settings/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Remove failed");
      router.refresh();
    } catch (err) {
      setRemoveError(err.message);
    } finally {
      setRemovingEmail(null);
    }
  }

  return (
    <>
      <h1 className={`display ${styles.heading}`}>Admin Settings</h1>
      <p className={styles.sub}>
        Manage who has admin access across the whole site — not scoped to one league.
      </p>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Admins</div>
        <div className={styles.cardSub}>
          Anyone signed in with one of these emails gets full admin access, including season
          setup and weekly uploads.
        </div>

        {admins.map((admin) => {
          const isSelf = admin.email === currentEmail;
          return (
            <div key={admin.email} className={styles.adminRow}>
              <div className={styles.who}>
                <span className={styles.email}>{admin.email}</span>
                {isSelf && <span className={styles.youTag}>You</span>}
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                disabled={isSelf || removingEmail === admin.email}
                title={isSelf ? "You can't remove yourself while signed in" : "Remove admin"}
                onClick={() => handleRemove(admin.email)}
              >
                ×
              </button>
            </div>
          );
        })}

        <form className={styles.addRow} onSubmit={handleAdd}>
          <input
            type="email"
            placeholder="newadmin@example.com"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
          />
          <button type="submit" className={styles.btnAdd} disabled={addStatus === "adding"}>
            {addStatus === "adding" ? "Adding…" : "Add admin"}
          </button>
        </form>
        {addStatus === "error" && <div className={styles.statusError}>✕ {addError}</div>}
        {removeError && <div className={styles.statusError}>✕ {removeError}</div>}

        <div className={styles.note}>
          You can&apos;t remove your own account while signed in — have another admin remove you,
          or add a second admin first as a safety net.
        </div>
      </div>
    </>
  );
}
