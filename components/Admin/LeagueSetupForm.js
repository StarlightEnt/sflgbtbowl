"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./LeagueSetupForm.module.scss";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const BLANK_FORM = { id: null, name: "", slug: "", dayOfWeek: "", venueId: "", bowlComLssId: "" };

export default function LeagueSetupForm({ initialLeagues, venues = [] }) {
  const [leagues, setLeagues] = useState(initialLeagues);
  const [listStatus, setListStatus] = useState("done");
  const [listError, setListError] = useState("");

  const [form, setForm] = useState(BLANK_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");

  // Called only from the save handler below (a user action, not on
  // mount) — the initial list comes from the server via initialLeagues,
  // this just re-syncs it after a create/edit.
  async function loadLeagues() {
    setListStatus("loading");
    setListError("");
    try {
      const res = await fetch("/api/admin/league-setup");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load leagues");
      setLeagues(data.leagues);
      setListStatus("done");
    } catch (err) {
      setListError(err.message);
      setListStatus("error");
    }
  }

  function startNew() {
    setForm(BLANK_FORM);
    setSlugTouched(false);
    setSaveStatus("idle");
    setSaveError("");
  }

  function startEdit(league) {
    setForm({
      id: league.id,
      name: league.name,
      slug: league.slug,
      dayOfWeek: league.day_of_week ?? "",
      venueId: league.venue_id ?? "",
      bowlComLssId: league.bowl_com_lss_id ?? "",
    });
    setSlugTouched(true);
    setSaveStatus("idle");
    setSaveError("");
  }

  function handleNameChange(value) {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugTouched ? f.slug : slugify(value),
    }));
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/admin/league-setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveStatus("done");
      startNew();
      await loadLeagues();
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus("error");
    }
  }

  const isEditing = form.id !== null;
  const canSave = form.name.trim() && form.slug.trim() && saveStatus !== "saving";

  return (
    <>
      <h1 className={`display ${styles.heading}`}>League Setup</h1>
      <p className={styles.sub}>
        Create and edit the leagues this site runs. Rare, one-time(-ish) setup — done once per
        league, not once per season. Season Setup runs against whichever league you pick here.
      </p>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Leagues on file</div>
        {listStatus === "loading" && <p className={styles.cardSub}>Loading…</p>}
        {listStatus === "error" && <div className={styles.statusError}>✕ {listError}</div>}
        {listStatus === "done" && leagues.length === 0 && (
          <p className={styles.cardSub}>No leagues yet — create the first one below.</p>
        )}
        {listStatus === "done" && leagues.length > 0 && (
          <div className={styles.leagueList}>
            {leagues.map((league) => (
              <div key={league.id} className={styles.leagueRow}>
                <div>
                  <div className={styles.leagueName}>{league.name}</div>
                  <div className={styles.leagueMeta}>
                    /{league.slug} · {league.day_of_week || "no day set"} ·{" "}
                    {league.venue_name || "no venue set"}
                    {league.bowl_com_lss_id ? ` · LSS #${league.bowl_com_lss_id}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.btnEdit}
                  onClick={() => startEdit(league)}
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>{isEditing ? `Edit ${form.name}` : "New league"}</div>
        <div className={styles.cardSub}>
          {isEditing
            ? "Season-scoped data underneath this league is untouched by any of these fields."
            : "The slug is auto-suggested from the name — edit it if you want something different. It becomes part of the league's public URL and can't collide with another league's."}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="leagueName">League name</label>
            <input
              id="leagueName"
              type="text"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="leagueSlug">Slug</label>
            <input
              id="leagueSlug"
              type="text"
              value={form.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setForm((f) => ({ ...f, slug: e.target.value }));
              }}
            />
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="leagueDay">Day of week</label>
            <select
              id="leagueDay"
              value={form.dayOfWeek}
              onChange={(e) => setForm((f) => ({ ...f, dayOfWeek: e.target.value }))}
            >
              <option value="">— Select —</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label htmlFor="leagueVenue">Venue</label>
            {venues.length === 0 ? (
              <div className={styles.cardSub}>
                No venues yet — add one in <Link href="/admin/venues">Venue Setup</Link> first.
              </div>
            ) : (
              <select
                id="leagueVenue"
                value={form.venueId}
                onChange={(e) => setForm((f) => ({ ...f, venueId: e.target.value }))}
              >
                <option value="">— Select —</option>
                {venues.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label htmlFor="leagueLss">Bowl.com League Standing Sheet #</label>
            <input
              id="leagueLss"
              type="number"
              value={form.bowlComLssId}
              onChange={(e) => setForm((f) => ({ ...f, bowlComLssId: e.target.value }))}
            />
          </div>
        </div>

        {saveStatus === "error" && <div className={styles.statusError}>✕ {saveError}</div>}
        {saveStatus === "done" && (
          <div className={styles.statusOk}>✓ Saved. The list above is now current.</div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={`btn ${styles.btnSave}`}
            disabled={!canSave}
            onClick={handleSave}
          >
            {saveStatus === "saving" ? "Saving…" : isEditing ? "Save changes" : "Create league"}
          </button>
          {isEditing && (
            <button type="button" className={styles.btnCancel} onClick={startNew}>
              Cancel, start a new league instead
            </button>
          )}
        </div>
      </div>
    </>
  );
}
