"use client";

import { useState } from "react";
import Link from "next/link";
import { suggestAbbreviation } from "@/lib/pdf/abbreviate";
import styles from "./SeasonSetupForm.module.scss";

function UploadCard({ title, sub, status, counts, fileName, error, onFile }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{title}</div>
      <div className={styles.cardSub}>{sub}</div>
      <label className={styles.uploadArea}>
        <div className={styles.icon}>📄</div>
        <div className={styles.text}>
          {status === "uploading"
            ? "Parsing…"
            : "Click to browse for your PDF"}
        </div>
        <input
          type="file"
          accept="application/pdf"
          hidden
          disabled={status === "uploading"}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFile(file);
            e.target.value = "";
          }}
        />
      </label>
      {status === "done" && counts && (
        <div className={styles.statusOk}>
          ✓ {fileName} — {counts}
        </div>
      )}
      {status === "error" && <div className={styles.statusError}>✕ {error}</div>}
    </div>
  );
}

export default function SeasonSetupForm() {
  const [seasonName, setSeasonName] = useState("Fall/Winter '26-'27");
  const [startYear, setStartYear] = useState("2026");

  const [standingsStatus, setStandingsStatus] = useState("idle");
  const [standingsError, setStandingsError] = useState("");
  const [standingsData, setStandingsData] = useState(null);

  const [scheduleStatus, setScheduleStatus] = useState("idle");
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleData, setScheduleData] = useState(null);

  const [abbreviations, setAbbreviations] = useState({});
  const [matchDecisions, setMatchDecisions] = useState({});
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");

  async function handleStandingsFile(file) {
    setStandingsStatus("uploading");
    setStandingsError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/season-setup/parse-standings", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");

      setStandingsData(data);
      setMatchDecisions({});
      const suggested = {};
      for (const team of data.result.teams) {
        suggested[team.team_number] = suggestAbbreviation(team.team_name);
      }
      setAbbreviations(suggested);
      setStandingsStatus("done");
    } catch (err) {
      setStandingsError(err.message);
      setStandingsStatus("error");
    }
  }

  async function handleScheduleFile(file) {
    setScheduleStatus("uploading");
    setScheduleError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/season-setup/parse-schedule", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setScheduleData(data);
      setScheduleStatus("done");
    } catch (err) {
      setScheduleError(err.message);
      setScheduleStatus("error");
    }
  }

  function handleAbbrChange(teamNumber, value) {
    setAbbreviations((prev) => ({ ...prev, [teamNumber]: value }));
  }

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const matchedBowlers = [
        ...standingsData.matchedExact,
        ...standingsData.possibleMatches
          .filter((m) => matchDecisions[m.tempId] === "yes")
          .map((m) => ({
            bowlerId: m.existingBowlerId,
            teamNumber: m.teamNumber,
            realAverage: m.realAverage,
            isCaptain: m.isCaptain,
          })),
      ];

      const newBowlers = [
        ...standingsData.newBowlers.map(({ firstName, lastName, teamNumber, realAverage, isCaptain }) => ({
          firstName,
          lastName,
          teamNumber,
          realAverage,
          isCaptain,
        })),
        ...standingsData.possibleMatches
          .filter((m) => matchDecisions[m.tempId] === "no")
          .map(({ firstName, lastName, teamNumber, realAverage, isCaptain }) => ({
            firstName,
            lastName,
            teamNumber,
            realAverage,
            isCaptain,
          })),
      ];

      const res = await fetch("/api/admin/season-setup/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonName,
          startYear,
          standings: standingsData.result,
          standingsFileUrl: standingsData.fileUrl,
          schedule: scheduleData.weeks,
          abbreviations,
          matchedBowlers,
          newBowlers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveStatus("done");
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus("error");
    }
  }

  const matchesResolved =
    !standingsData || standingsData.possibleMatches.every((m) => matchDecisions[m.tempId]);
  const readyToSave = standingsStatus === "done" && scheduleStatus === "done" && matchesResolved;
  const abbrValues = Object.values(abbreviations)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const hasDuplicateAbbr = new Set(abbrValues).size !== abbrValues.length;
  const allAbbrFilled =
    standingsData?.result.teams.every((t) => (abbreviations[t.team_number] ?? "").trim()) ?? false;

  if (saveStatus === "done") {
    return (
      <>
        <h1 className={`display ${styles.heading}`}>Season saved</h1>
        <p className={styles.sub}>
          {seasonName} is set up — {standingsData.counts.teams} teams,{" "}
          {standingsData.counts.bowlers} bowlers, {standingsData.counts.subs} substitutes, and{" "}
          {scheduleData.counts.weeks} weeks of schedule.
        </p>
        <Link href="/" className="btn">
          ← Back to site
        </Link>
      </>
    );
  }

  return (
    <>
      <h1 className={`display ${styles.heading}`}>Season Setup</h1>
      <p className={styles.sub}>
        Upload the League Standings and Schedule PDFs to set up a new season for LGBT Wednesday
        Community.
      </p>

      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label htmlFor="seasonName">Season name</label>
          <input
            type="text"
            id="seasonName"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="startYear">Start year</label>
          <input
            type="text"
            id="startYear"
            value={startYear}
            onChange={(e) => setStartYear(e.target.value)}
          />
        </div>
      </div>

      <UploadCard
        title="Step 1 — League Standings PDF"
        sub="Imports teams, bowlers, and substitutes from the current week's League Standings sheet."
        status={standingsStatus}
        counts={
          standingsData
            ? `Found ${standingsData.counts.teams} teams (${
                standingsData.counts.teams - 1
              } rostered + BYE), ${standingsData.counts.bowlers} bowlers, ${
                standingsData.counts.subs
              } substitutes.`
            : ""
        }
        fileName={standingsData?.fileName}
        error={standingsError}
        onFile={handleStandingsFile}
      />

      <UploadCard
        title="Step 2 — Schedule PDF"
        sub="Imports lane assignments for every week of the season."
        status={scheduleStatus}
        counts={scheduleData ? `Found ${scheduleData.counts.weeks} weeks.` : ""}
        fileName={scheduleData?.fileName}
        error={scheduleError}
        onFile={handleScheduleFile}
      />

      {standingsData && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Review teams &amp; abbreviations</div>
          <div className={styles.cardSub}>
            Auto-suggested from team names — edit any of these before saving. Used across the
            dashboard and results scoreboard.
          </div>
          <table className={styles.review}>
            <thead>
              <tr>
                <th>#</th>
                <th>Team name</th>
                <th>Abbreviation</th>
              </tr>
            </thead>
            <tbody>
              {standingsData.result.teams.map((team) => (
                <tr key={team.team_number}>
                  <td className={styles.num}>{team.team_number}</td>
                  <td>{team.team_name}</td>
                  <td>
                    <input
                      className={styles.abbr}
                      value={abbreviations[team.team_number] ?? ""}
                      onChange={(e) => handleAbbrChange(team.team_number, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasDuplicateAbbr && (
            <div className={styles.statusError}>
              ✕ Abbreviations must be unique (case-insensitive).
            </div>
          )}
        </div>
      )}

      {standingsData && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Bowler identity</div>
          <div className={styles.cardSub}>
            {standingsData.matchedExact.length} name{standingsData.matchedExact.length === 1 ? "" : "s"}{" "}
            matched an existing bowler automatically
            {standingsData.newBowlers.length > 0 &&
              `, ${standingsData.newBowlers.length} ${
                standingsData.newBowlers.length === 1 ? "is" : "are"
              } brand new`}
            .
          </div>

          {standingsData.possibleMatches.length > 0 && (
            <>
              <div className={styles.reviewLabel}>Possible name matches</div>
              {standingsData.possibleMatches.map((m) => (
                <div key={m.tempId} className={`${styles.rosterChangeRow} ${styles.fuzzy}`}>
                  <div className={styles.rosterChangeText}>
                    🔍 <strong>
                      &quot;{m.firstName} {m.lastName}&quot;
                    </strong>{" "}
                    (on this sheet) <span className={styles.arrow}>↔</span>{" "}
                    <strong>
                      {m.existingFirstName} {m.existingLastName}
                    </strong>
                    {m.existingNickname && ` (nickname: ${m.existingNickname})`} (existing) — same
                    person?
                  </div>
                  <div className={styles.rosterChangeActions}>
                    <button
                      type="button"
                      className={`${styles.btnAccept} ${
                        matchDecisions[m.tempId] === "yes" ? styles.selected : ""
                      }`}
                      onClick={() => setMatchDecisions((prev) => ({ ...prev, [m.tempId]: "yes" }))}
                    >
                      Yes, same person
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnIgnore} ${
                        matchDecisions[m.tempId] === "no" ? styles.selected : ""
                      }`}
                      onClick={() => setMatchDecisions((prev) => ({ ...prev, [m.tempId]: "no" }))}
                    >
                      No, create new bowler
                    </button>
                  </div>
                </div>
              ))}
              <p className={styles.helpNote}>
                Each name needs a decision before saving — an unresolved match could otherwise
                silently drop someone&apos;s history, or wrongly merge two different people.
              </p>
            </>
          )}
        </div>
      )}

      {saveStatus === "error" && <div className={styles.statusError}>✕ {saveError}</div>}

      <button
        className={`btn ${styles.btnSave}`}
        disabled={!readyToSave || !allAbbrFilled || hasDuplicateAbbr || saveStatus === "saving"}
        onClick={handleSave}
      >
        {saveStatus === "saving" ? "Saving…" : "Save season setup"}
      </button>
    </>
  );
}
