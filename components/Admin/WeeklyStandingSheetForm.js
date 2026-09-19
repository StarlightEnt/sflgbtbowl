"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatPoints } from "@/lib/formatPoints";
import styles from "./WeeklyStandingSheetForm.module.scss";

function resetReviewState(setters) {
  setters.setFile(null);
  setters.setParseData(null);
  setters.setRosterDecisions({});
  setters.setMatchDecisions({});
  setters.setUploadStatus("idle");
  setters.setUploadError("");
  setters.setPublishStatus("idle");
  setters.setPublishError("");
}

export default function WeeklyStandingSheetForm({ seasonId, history, leagueSlug, leagueName }) {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [parseData, setParseData] = useState(null);
  const [rosterDecisions, setRosterDecisions] = useState({});
  const [matchDecisions, setMatchDecisions] = useState({});
  const [publishStatus, setPublishStatus] = useState("idle");
  const [publishError, setPublishError] = useState("");

  const [deleteWeek, setDeleteWeek] = useState(history[0]?.week_number ?? null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("idle");
  const [deleteError, setDeleteError] = useState("");

  const setters = {
    setFile,
    setParseData,
    setRosterDecisions,
    setMatchDecisions,
    setUploadStatus,
    setUploadError,
    setPublishStatus,
    setPublishError,
  };

  async function handleFile(selectedFile) {
    resetReviewState(setters);
    setFile(selectedFile);
    setUploadStatus("uploading");
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("leagueSlug", leagueSlug);
      const res = await fetch("/api/admin/weekly/parse", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Parse failed");
      setParseData(data);
      setUploadStatus("done");
    } catch (err) {
      setUploadError(err.message);
      setUploadStatus("error");
    }
  }

  function handleDiscard() {
    resetReviewState(setters);
  }

  const rosterResolved =
    !parseData || parseData.rosterChanges.every((c) => rosterDecisions[c.bowlerId]);
  const matchesResolved =
    !parseData || parseData.possibleMatches.every((m) => matchDecisions[m.tempId]);
  const readyToPublish = parseData && rosterResolved && matchesResolved;

  async function handlePublish() {
    setPublishStatus("publishing");
    setPublishError("");
    try {
      const matchedBowlers = [
        ...parseData.matchedNoChange,
        ...parseData.rosterChanges.map((c) => ({
          bowlerId: c.bowlerId,
          teamId: rosterDecisions[c.bowlerId] === "accept" ? c.toTeamId : c.fromTeamId,
          realAverage: c.realAverage,
          isCaptain: c.isCaptain,
        })),
        ...parseData.possibleMatches
          .filter((m) => matchDecisions[m.tempId] === "yes")
          .map((m) => ({
            bowlerId: m.existingBowlerId,
            teamId: m.teamId,
            realAverage: m.realAverage,
            isCaptain: m.isCaptain,
          })),
      ];

      const newBowlers = [
        ...parseData.newBowlers.map(({ firstName, lastName, teamId, realAverage, isCaptain }) => ({
          firstName,
          lastName,
          teamId,
          realAverage,
          isCaptain,
        })),
        ...parseData.possibleMatches
          .filter((m) => matchDecisions[m.tempId] === "no")
          .map(({ firstName, lastName, teamId, realAverage, isCaptain }) => ({
            firstName,
            lastName,
            teamId,
            realAverage,
            isCaptain,
          })),
      ];

      const payload = {
        weekNumber: parseData.weekNumber,
        teamStandings: parseData.teamStandings.map(({ teamId, pointsWon, pointsLost, pctWon }) => ({
          teamId,
          pointsWon,
          pointsLost,
          pctWon,
        })),
        weeklyResults: parseData.weeklyResults.map(
          ({ lanePair, teamAId, teamAPoints, teamBId, teamBPoints }) => ({
            lanePair,
            teamAId,
            teamAPoints,
            teamBId,
            teamBPoints,
          })
        ),
        matchedBowlers,
        newBowlers,
        capturesCaptainData: parseData.capturesCaptainData,
      };

      const formData = new FormData();
      formData.append("file", file);
      formData.append("data", JSON.stringify(payload));
      formData.append("leagueSlug", leagueSlug);

      const res = await fetch("/api/admin/weekly/publish", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Publish failed");
      setPublishStatus("done");
      router.refresh();
    } catch (err) {
      setPublishError(err.message);
      setPublishStatus("error");
    }
  }

  const effectiveDeleteWeek = history.some((h) => h.week_number === deleteWeek)
    ? deleteWeek
    : history[0]?.week_number ?? null;
  const expectedConfirm = effectiveDeleteWeek ? `WEEK ${effectiveDeleteWeek}` : "";

  async function handleDelete() {
    setDeleteStatus("deleting");
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/weekly/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekNumber: effectiveDeleteWeek, confirmText, leagueSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setConfirmText("");
      setDeleteStatus("idle");
      router.refresh();
    } catch (err) {
      setDeleteError(err.message);
      setDeleteStatus("error");
    }
  }

  return (
    <>
      <h1 className={`display ${styles.heading}`}>Weekly Standing Sheet</h1>
      <p className={styles.sub}>
        {leagueName ? `For ${leagueName}. ` : ""}Upload this week&apos;s League Standings PDF to
        update the dashboard — standings, last week&apos;s results, and bowler averages.
      </p>

      {!seasonId ? (
        <div className={styles.statusError}>No season is set up yet — run Season Setup first.</div>
      ) : (
        <>
            <div className={styles.card}>
              <div className={styles.cardTitle}>Upload standing sheet</div>
              <div className={styles.cardSub}>
                Same PDF format as Season Setup — the current week&apos;s League Standings sheet
                from BLS software.
              </div>
              <label className={styles.uploadArea}>
                <div className={styles.icon}>📄</div>
                <div className={styles.text}>
                  {uploadStatus === "uploading" ? "Parsing…" : "Click to browse for this week's PDF"}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  disabled={uploadStatus === "uploading"}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) handleFile(selected);
                    e.target.value = "";
                  }}
                />
              </label>
              {uploadStatus === "done" && (
                <div className={styles.statusOk}>✓ {file.name} uploaded and parsed successfully.</div>
              )}
              {uploadStatus === "error" && <div className={styles.statusError}>✕ {uploadError}</div>}
            </div>

            {parseData && (
              <div className={styles.card}>
                <div className={styles.detectedWeek}>
                  DETECTED: WEEK {parseData.weekNumber}
                  {parseData.totalWeeks ? ` OF ${parseData.totalWeeks}` : ""} · {parseData.weekDateRaw}
                </div>

                <div className={styles.parseSummary}>
                  <div className={styles.stat}>
                    <div className={styles.n}>{parseData.counts.teamRecords}</div>
                    <div className={styles.l}>Team records updated</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.n}>{parseData.counts.matchups}</div>
                    <div className={styles.l}>Matchup results found</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.n}>{parseData.counts.bowlerAverages}</div>
                    <div className={styles.l}>Bowler averages updated</div>
                  </div>
                </div>

                <div className={styles.reviewLabel}>Last week&apos;s results — review before publishing</div>
                <div className={styles.scoreboardRow}>
                  {parseData.weeklyResults.map((row) => {
                    const aHalf = Number(row.teamAPoints) % 1 !== 0;
                    const bHalf = Number(row.teamBPoints) % 1 !== 0;
                    const aWin = Number(row.teamAPoints) > Number(row.teamBPoints);
                    const bWin = Number(row.teamBPoints) > Number(row.teamAPoints);
                    const rowClass = (half, win) =>
                      `${styles.row} ${half ? styles.half : win ? styles.win : ""}`;
                    return (
                      <div key={row.lanePair} className={styles.scoreBox}>
                        <div className={rowClass(aHalf, aWin)}>
                          <span className={styles.code}>{row.teamAAbbr}</span>
                          <span className={styles.pts}>{formatPoints(row.teamAPoints)}</span>
                        </div>
                        <div className={rowClass(bHalf, bWin)}>
                          <span className={styles.code}>{row.teamBAbbr}</span>
                          <span className={styles.pts}>{formatPoints(row.teamBPoints)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className={styles.helpNote}>
                  Yellow row = half-point split detected. Green row = winner. Doesn&apos;t match what
                  actually happened? Don&apos;t publish — fix the PDF at the source and re-upload.
                </p>

                {parseData.rosterChanges.length > 0 && (
                  <>
                    <div className={styles.reviewLabel}>Roster changes detected</div>
                    {parseData.rosterChanges.map((c) => (
                      <div key={c.bowlerId} className={styles.rosterChangeRow}>
                        <div className={styles.rosterChangeText}>
                          <strong>
                            {c.firstName} {c.lastName}
                          </strong>{" "}
                          — {c.fromTeamId ? c.fromTeamName : "substitute"}{" "}
                          <span className={styles.arrow}>→</span>{" "}
                          {c.toTeamId
                            ? c.fromTeamId
                              ? c.toTeamName
                              : `now rostered on ${c.toTeamName}`
                            : "now a substitute"}
                        </div>
                        <div className={styles.rosterChangeActions}>
                          <button
                            type="button"
                            className={`${styles.btnAccept} ${
                              rosterDecisions[c.bowlerId] === "accept" ? styles.selected : ""
                            }`}
                            onClick={() =>
                              setRosterDecisions((prev) => ({ ...prev, [c.bowlerId]: "accept" }))
                            }
                          >
                            Accept move
                          </button>
                          <button
                            type="button"
                            className={`${styles.btnIgnore} ${
                              rosterDecisions[c.bowlerId] === "keep" ? styles.selected : ""
                            }`}
                            onClick={() =>
                              setRosterDecisions((prev) => ({ ...prev, [c.bowlerId]: "keep" }))
                            }
                          >
                            {c.fromTeamId ? `Keep on ${c.fromTeamName}` : "Keep as substitute"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                {parseData.possibleMatches.length > 0 && (
                  <>
                    <div className={styles.reviewLabel}>Possible name matches</div>
                    {parseData.possibleMatches.map((m) => (
                      <div key={m.tempId} className={`${styles.rosterChangeRow} ${styles.fuzzy}`}>
                        <div className={styles.rosterChangeText}>
                          🔍 <strong>
                            &quot;{m.firstName} {m.lastName}&quot;
                          </strong>{" "}
                          (new on this sheet) <span className={styles.arrow}>↔</span>{" "}
                          <strong>
                            {m.existingFirstName} {m.existingLastName}
                          </strong>{" "}
                          (existing) — same person?
                        </div>
                        <div className={styles.rosterChangeActions}>
                          <button
                            type="button"
                            className={`${styles.btnAccept} ${
                              matchDecisions[m.tempId] === "yes" ? styles.selected : ""
                            }`}
                            onClick={() =>
                              setMatchDecisions((prev) => ({ ...prev, [m.tempId]: "yes" }))
                            }
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
                      Each change needs a decision before publishing — an unresolved name match could
                      otherwise silently reassign someone to the wrong team, or silently split one
                      person into two records.
                    </p>
                  </>
                )}

                {publishStatus === "error" && <div className={styles.statusError}>✕ {publishError}</div>}
                {publishStatus === "done" ? (
                  <div className={styles.statusOk}>
                    ✓ Week {parseData.weekNumber} published to the dashboard.
                  </div>
                ) : (
                  <div style={{ marginTop: 22 }}>
                    <button
                      type="button"
                      className={`btn ${styles.btnSave}`}
                      disabled={!readyToPublish || publishStatus === "publishing"}
                      onClick={handlePublish}
                    >
                      {publishStatus === "publishing" ? "Publishing…" : "Publish to dashboard"}
                    </button>
                    <button type="button" className={styles.btnSecondary} onClick={handleDiscard}>
                      Discard this upload
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className={styles.card}>
              <div className={styles.cardTitle}>Previously uploaded</div>
              {history.length === 0 ? (
                <p className={styles.cardSub}>Nothing uploaded yet.</p>
              ) : (
                <table className={styles.history}>
                  <thead>
                    <tr>
                      <th>Week</th>
                      <th>Date</th>
                      <th>Uploaded</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((row) => (
                      <tr key={row.id}>
                        <td>Week {row.week_number}</td>
                        <td>{row.week_date ? new Date(row.week_date).toLocaleDateString("en-US", { timeZone: "UTC" }) : "—"}</td>
                        <td>{new Date(row.uploaded_at).toLocaleDateString("en-US")}</td>
                        <td>
                          <a href={row.file_url} target="_blank" rel="noreferrer">
                            View PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {history.length > 0 && (
              <div className={`${styles.card} ${styles.dangerCard}`}>
                <div className={styles.cardTitle} style={{ color: "var(--sflgbtbowl-red)" }}>
                  ⚠ Danger zone
                </div>
                <div className={styles.cardSub}>These actions are permanent and can&apos;t be undone.</div>

                <div className={styles.dangerRowStack}>
                  <div>
                    <div className={styles.dangerRowTitle}>
                      Delete a week&apos;s standing sheet
                      {history.length > 1 && (
                        <select
                          className={styles.weekPicker}
                          value={effectiveDeleteWeek ?? ""}
                          onChange={(e) => {
                            setDeleteWeek(Number(e.target.value));
                            setConfirmText("");
                          }}
                        >
                          {history.map((row) => (
                            <option key={row.id} value={row.week_number}>
                              Week {row.week_number}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div className={styles.dangerRowSub}>
                      Removes this week&apos;s standings, results, and bowler averages from the
                      dashboard, and deletes the stored PDF. You&apos;ll need to re-upload a corrected
                      sheet afterward.
                    </div>
                  </div>
                  <div className={styles.confirmBox}>
                    <label className={styles.confirmLabel}>
                      Type <strong>{expectedConfirm}</strong> to confirm:
                    </label>
                    <div className={styles.confirmControls}>
                      <input
                        type="text"
                        className={styles.confirmInput}
                        placeholder={expectedConfirm}
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                      />
                      <button
                        type="button"
                        className={styles.btnDanger}
                        disabled={confirmText !== expectedConfirm || deleteStatus === "deleting"}
                        onClick={handleDelete}
                      >
                        {deleteStatus === "deleting" ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button type="button" className={styles.btnCancel} onClick={() => setConfirmText("")}>
                        Cancel
                      </button>
                    </div>
                    {deleteStatus === "error" && (
                      <div className={styles.statusError} style={{ marginTop: 10 }}>
                        ✕ {deleteError}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
    </>
  );
}
