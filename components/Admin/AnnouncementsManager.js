"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./AnnouncementsManager.module.scss";

// New announcements start tagged for every league; the admin unchecks
// any it shouldn't show on.
function emptyDraft(leagues) {
  return { title: "", body: "", leagueIds: leagues.map((l) => l.id) };
}

// timeZone: "UTC" is load-bearing, not decorative (see
// lib/tournaments/formatDateRange.js's note on the same issue) — this
// is a "use client" component, so it renders once on the server (in
// whatever timezone that process runs in) and again on the client (in
// the viewer's local timezone) during hydration. Leaving timeZone
// unset lets those two renders disagree, which both displays the
// wrong date for some viewers and can trigger a React hydration
// mismatch warning.
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AnnouncementsManager({ announcements, leagues }) {
  const router = useRouter();

  const [editingId, setEditingId] = useState(null); // null = not editing, "new" = create form
  const [draft, setDraft] = useState(() => emptyDraft(leagues));
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  function startCreate() {
    setEditingId("new");
    setDraft(emptyDraft(leagues));
    setSaveError("");
  }

  function startEdit(a) {
    setEditingId(a.id);
    setDraft({ title: a.title, body: a.body, leagueIds: a.leagues.map((l) => l.id) });
    setSaveError("");
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(emptyDraft(leagues));
    setSaveError("");
  }

  function toggleLeague(leagueId, checked) {
    setDraft((d) => ({
      ...d,
      leagueIds: checked ? [...d.leagueIds, leagueId] : d.leagueIds.filter((id) => id !== leagueId),
    }));
  }

  const noLeaguesSelected = draft.leagueIds.length === 0;

  async function handleSave(e) {
    e.preventDefault();
    setSaveStatus("saving");
    setSaveError("");
    try {
      const isNew = editingId === "new";
      const url = isNew ? "/api/admin/announcements" : `/api/admin/announcements/${editingId}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveStatus("idle");
      setEditingId(null);
      setDraft(emptyDraft(leagues));
      router.refresh();
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus("error");
    }
  }

  async function handleTogglePin(a) {
    setBusyId(a.id);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !a.is_pinned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update pin");
      router.refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(a) {
    if (!window.confirm(`Delete "${a.title}"?`)) return;
    setBusyId(a.id);
    setActionError("");
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      router.refresh();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className={styles.headRow}>
        <div>
          <h1 className={`display ${styles.heading}`}>Announcements</h1>
          <p className={styles.sub}>
            Choose which leagues each announcement shows on. Pinned announcements show first, then
            newest first.
          </p>
        </div>
        {editingId === null && (
          <button type="button" className="btn" onClick={startCreate}>
            + New Announcement
          </button>
        )}
      </div>

      {editingId !== null && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>{editingId === "new" ? "New announcement" : "Edit announcement"}</div>
          <form onSubmit={handleSave}>
            <div className={styles.field}>
              <label>Title</label>
              <input
                type="text"
                value={draft.title}
                maxLength={120}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Body</label>
              <textarea
                value={draft.body}
                onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
                rows={6}
                required
              />
            </div>
            <div className={styles.field}>
              <label>Show on</label>
              <div className={styles.leagueChecks}>
                {leagues.map((l) => (
                  <label key={l.id} className={styles.leagueCheck}>
                    <input
                      type="checkbox"
                      checked={draft.leagueIds.includes(l.id)}
                      onChange={(e) => toggleLeague(l.id, e.target.checked)}
                    />
                    {l.name}
                  </label>
                ))}
              </div>
              {noLeaguesSelected && <div className={styles.fieldNote}>Select at least one league</div>}
            </div>
            {saveStatus === "error" && <div className={styles.statusError}>✕ {saveError}</div>}
            <div className={styles.formActions}>
              <button type="submit" className="btn" disabled={saveStatus === "saving" || noLeaguesSelected}>
                {saveStatus === "saving" ? "Saving…" : "Save"}
              </button>
              <button type="button" className={styles.btnCancel} onClick={cancelEdit}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {actionError && <div className={styles.statusError}>✕ {actionError}</div>}

      {announcements.length === 0 ? (
        <p className={styles.emptyNote}>No announcements yet.</p>
      ) : (
        announcements.map((a) => (
          <div key={a.id} className={`${styles.card} ${a.is_pinned ? styles.pinnedCard : ""}`}>
            <div className={styles.announceHead}>
              <div className={styles.announceTitle}>
                {a.is_pinned && <span className={styles.pinBadge}>📌 Pinned</span>}
                {a.title}
              </div>
              <div className={styles.announceMeta}>
                {a.leagues.map((l) => (
                  <span key={l.id} className={`${styles.pinBadge} ${styles.leagueBadge}`}>
                    {l.name}
                  </span>
                ))}
                <span className={styles.announceDate}>Posted {formatDate(a.created_at)}</span>
              </div>
            </div>
            <p className={styles.announceBody}>{a.body}</p>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.actionLink}
                disabled={busyId === a.id}
                onClick={() => handleTogglePin(a)}
              >
                {a.is_pinned ? "Unpin" : "Pin"}
              </button>
              <button type="button" className={styles.actionLink} onClick={() => startEdit(a)}>
                Edit
              </button>
              <button
                type="button"
                className={styles.actionLinkDanger}
                disabled={busyId === a.id}
                onClick={() => handleDelete(a)}
              >
                Delete
              </button>
            </div>
          </div>
        ))
      )}
    </>
  );
}
