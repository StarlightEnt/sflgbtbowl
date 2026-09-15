"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./PrebowlForm.module.scss";

const REASON_MAX = 128;

// authState: "signed-out" | "not-captain" | "captain"
// team: { id, name } — only present when authState === "captain"
export default function PrebowlForm({ authState, team, seasonId }) {
  const [requestType, setRequestType] = useState("prebowl");
  const [targetDate, setTargetDate] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  if (authState === "signed-out") {
    return (
      <div className={styles.authError}>
        The Team Captain must be logged in to complete this request.{" "}
        <Link href="/signin">(Member login, top of page)</Link>
      </div>
    );
  }

  if (authState === "not-captain") {
    return (
      <div className={styles.authError}>
        You&apos;re signed in, but you&apos;re not listed as a captain for any
        team in this league — only Team Captains can submit pre-bowl or
        makeup requests.
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className={styles.statusOk}>
        Request submitted — the officers have been notified.
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/scheduling-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId,
          teamId: team.id,
          requestType,
          targetDate,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="teamSelect">Your team</label>
        <select id="teamSelect" value={team.id} disabled>
          <option value={team.id}>{team.name}</option>
        </select>
      </div>

      <div className={styles.field}>
        <label>Request type</label>
        <div className={styles.radioGroup}>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="reqType"
              value="prebowl"
              checked={requestType === "prebowl"}
              onChange={() => setRequestType("prebowl")}
            />
            Pre-Bowl
          </label>
          <label className={styles.radioOption}>
            <input
              type="radio"
              name="reqType"
              value="makeup"
              checked={requestType === "makeup"}
              onChange={() => setRequestType("makeup")}
            />
            Makeup
          </label>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor="completeDate">Date you&apos;ll complete it</label>
        <input
          type="date"
          id="completeDate"
          value={targetDate}
          onChange={(e) => setTargetDate(e.target.value)}
          required
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="reasonText">
          Reason for Pre-Bowl / Makeup{" "}
          <span className={styles.charCount}>
            {REASON_MAX - reason.length} characters left
          </span>
        </label>
        <textarea
          id="reasonText"
          maxLength={REASON_MAX}
          rows={2}
          placeholder="Brief reason (optional context for the officers)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </div>

      {status === "error" && <div className={styles.statusError}>{error}</div>}

      <button className={`btn ${styles.submitBtn}`} type="submit" disabled={status === "saving"}>
        {status === "saving" ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
