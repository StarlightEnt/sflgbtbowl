"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { suggestPositionRoundPairings } from "@/lib/positionRoundSeeding";
import styles from "./ScheduleEditor.module.scss";

const LANE_ORDER = ["1-2", "3-4", "5-6", "7-8", "9-10", "11-12", "13-14"];

function weekLabel(week) {
  if (week.is_roll_off) return "Roll-Off";
  if (week.is_position_round) return "Position Round";
  return `Week ${week.week_number}`;
}

function dateLabel(date) {
  return new Date(date).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", timeZone: "UTC" });
}

function emptyLaneForm() {
  return Object.fromEntries(LANE_ORDER.map((l) => [l, { a: "", b: "" }]));
}

export default function ScheduleEditor({ seasonId, teams, weeks, rankedTeamNumbers, lastRankedWeek }) {
  const router = useRouter();
  const teamsById = new Map(teams.map((t) => [t.id, t]));
  // suggestPositionRoundPairings is hardcoded to a 14-lane structure
  // (13 real teams + BYE) — it throws for any other length, so this
  // must be checked before calling it, not just truthiness.
  const hasValidRankedTeams = Boolean(rankedTeamNumbers) && rankedTeamNumbers.length === 14;

  const [editingWeek, setEditingWeek] = useState(null);
  const [laneForm, setLaneForm] = useState(emptyLaneForm());
  const [usedAutoSuggest, setUsedAutoSuggest] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");

  function laneNumbersFromPositions(lanePositions) {
    const byLanes = new Map(lanePositions.map((p) => [p.lanes, p]));
    const form = emptyLaneForm();
    for (const lanes of LANE_ORDER) {
      const pos = byLanes.get(lanes);
      if (!pos) continue;
      form[lanes] = {
        a: teamsById.get(pos.team_a_id)?.team_number ?? "",
        b: teamsById.get(pos.team_b_id)?.team_number ?? "",
      };
    }
    return form;
  }

  function laneNumbersFromSuggestion() {
    const suggested = suggestPositionRoundPairings(rankedTeamNumbers);
    const form = emptyLaneForm();
    for (const s of suggested) {
      form[s.lanes] = { a: s.teamANumber, b: s.teamBNumber };
    }
    return form;
  }

  function handleEdit(week) {
    setSaveStatus("idle");
    setSaveError("");
    setEditingWeek(week.week_number);

    if (week.lane_positions) {
      setLaneForm(laneNumbersFromPositions(week.lane_positions));
      setUsedAutoSuggest(false);
    } else if ((week.is_position_round || week.is_roll_off) && hasValidRankedTeams) {
      setLaneForm(laneNumbersFromSuggestion());
      setUsedAutoSuggest(true);
    } else {
      setLaneForm(emptyLaneForm());
      setUsedAutoSuggest(false);
    }
  }

  function setLaneTeam(lanes, side, value) {
    setLaneForm((prev) => ({ ...prev, [lanes]: { ...prev[lanes], [side]: value } }));
  }

  const laneValues = LANE_ORDER.flatMap((l) => [laneForm[l].a, laneForm[l].b]);
  const allFilled = laneValues.every((v) => v !== "" && v !== null && v !== undefined);
  const noDuplicates = new Set(laneValues.map(String)).size === laneValues.length;
  const readyToSave = allFilled && noDuplicates;

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const lanePositions = LANE_ORDER.map((lanes) => ({
        lanes,
        teamANumber: Number(laneForm[lanes].a),
        teamBNumber: Number(laneForm[lanes].b),
      }));
      const res = await fetch("/api/admin/schedule/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonId, weekNumber: editingWeek, lanePositions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveStatus("done");
      setEditingWeek(null);
      router.refresh();
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus("error");
    }
  }

  function handleCancel() {
    setEditingWeek(null);
    setLaneForm(emptyLaneForm());
    setUsedAutoSuggest(false);
    setSaveStatus("idle");
    setSaveError("");
  }

  const editingWeekData = weeks.find((w) => w.week_number === editingWeek);
  const teamOptions = teams
    .filter((t) => !t.is_bye)
    .sort((a, b) => a.team_number - b.team_number);
  const byeTeam = teams.find((t) => t.is_bye);

  return (
    <>
      <h1 className={`display ${styles.heading}`}>Schedule</h1>
      <p className={styles.sub}>
        Lane assignments for all {weeks.length} weeks, by team number — matches the schedule
        PDF&apos;s own format. Regular weeks are set from the PDF and rarely need changes, but
        every week stays editable just in case.
      </p>

      <div className={styles.legend}>
        <span>
          <span className={`${styles.dot} ${styles.needs}`} />
          Needs lane assignments
        </span>
        <span>
          <span className={`${styles.dot} ${styles.set}`} />
          Set from schedule PDF
        </span>
      </div>

      <div className={styles.teamKey}>
        {teams
          .slice()
          .sort((a, b) => a.team_number - b.team_number)
          .map((t) => (
            <span key={t.id}>
              <strong>{t.team_number}</strong> {t.team_name}
              {"  "}
            </span>
          ))}
      </div>

      <div className={styles.card}>
        <table className={styles.sched}>
          <thead>
            <tr>
              <th>Wk</th>
              <th>Date</th>
              {LANE_ORDER.map((l) => (
                <th key={l} className={styles.laneCol}>
                  {l.replace("-", "–")}
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((week) => {
              const isSpecial = week.is_position_round || week.is_roll_off;
              const needsAssignment = isSpecial && !week.lane_positions;
              return (
                <tr key={week.week_number} className={isSpecial ? styles.positionRow : ""}>
                  <td className={styles.wkCell}>{String(week.week_number).padStart(2, "0")}</td>
                  <td>{dateLabel(week.week_date)}</td>
                  {needsAssignment ? (
                    <td colSpan={7} style={{ textAlign: "left" }}>
                      <span className={styles.needsBadge}>
                        ⚠ Needs lane assignments — {week.is_roll_off ? "Roll-Off" : "Position Round"}
                        {week.starting_lane ? `, start lane ${week.starting_lane}` : ""}
                      </span>
                    </td>
                  ) : (
                    LANE_ORDER.map((lanes) => {
                      const pos = week.lane_positions?.find((p) => p.lanes === lanes);
                      const aNum = pos ? teamsById.get(pos.team_a_id)?.team_number : null;
                      const bNum = pos ? teamsById.get(pos.team_b_id)?.team_number : null;
                      return (
                        <td key={lanes} className={styles.laneCol}>
                          {aNum && bNum ? `${aNum}-${bNum}` : "—"}
                        </td>
                      );
                    })
                  )}
                  <td>
                    <button type="button" className={styles.editLink} onClick={() => handleEdit(week)}>
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingWeekData && (
        <div className={styles.card}>
          <div className={styles.editPanelTitle}>
            Editing {weekLabel(editingWeekData)} · {dateLabel(editingWeekData.week_date)}
          </div>
          <div className={styles.editPanelSub}>
            {editingWeekData.is_position_round || editingWeekData.is_roll_off
              ? "Assign teams to each lane pair for the position round."
              : "Adjust lane assignments for this week."}
          </div>

          {usedAutoSuggest && (
            <div className={styles.autoNote}>
              ✓ Pre-filled automatically from current standings
              {lastRankedWeek ? ` (through Week ${lastRankedWeek})` : ""}: top 2 teams seeded to
              the middle lane pair, decreasing by rank outward, BYE always paired in on Lanes
              1–2. Review and adjust before saving — this is a starting point, not final.
            </div>
          )}
          {(editingWeekData.is_position_round || editingWeekData.is_roll_off) &&
            !hasValidRankedTeams &&
            !editingWeekData.lane_positions && (
              <div className={styles.autoNote}>
                {rankedTeamNumbers
                  ? "Standings don't have the expected 13 teams + BYE — nothing to auto-suggest from."
                  : "No completed weeks yet — nothing to auto-suggest from."}{" "}
                Assign manually below.
              </div>
            )}

          {LANE_ORDER.map((lanes) => (
            <div key={lanes} className={styles.laneEditRow}>
              <span className={styles.laneLabel}>Lanes {lanes.replace("-", "–")}</span>
              <select
                value={laneForm[lanes].a}
                onChange={(e) => setLaneTeam(lanes, "a", e.target.value)}
              >
                <option value="">— Select team —</option>
                {byeTeam && (
                  <option value={byeTeam.team_number}>
                    {byeTeam.team_number} — {byeTeam.team_name}
                  </option>
                )}
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.team_number}>
                    {t.team_number} — {t.team_name}
                  </option>
                ))}
              </select>
              <span className={styles.vs}>vs</span>
              <select
                value={laneForm[lanes].b}
                onChange={(e) => setLaneTeam(lanes, "b", e.target.value)}
              >
                <option value="">— Select team —</option>
                {byeTeam && (
                  <option value={byeTeam.team_number}>
                    {byeTeam.team_number} — {byeTeam.team_name}
                  </option>
                )}
                {teamOptions.map((t) => (
                  <option key={t.id} value={t.team_number}>
                    {t.team_number} — {t.team_name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {!noDuplicates && (
            <div className={styles.statusError}>✕ Each team can only be assigned once.</div>
          )}
          {saveStatus === "error" && <div className={styles.statusError}>✕ {saveError}</div>}

          <button
            type="button"
            className={styles.btnSave}
            disabled={!readyToSave || saveStatus === "saving"}
            onClick={handleSave}
          >
            {saveStatus === "saving" ? "Saving…" : `Save Week ${editingWeekData.week_number} lane assignments`}
          </button>
          <button
            type="button"
            className={styles.btnCancel}
            disabled={saveStatus === "saving"}
            onClick={handleCancel}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
