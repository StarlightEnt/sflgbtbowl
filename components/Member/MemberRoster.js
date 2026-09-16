"use client";

import { useState, useEffect } from "react";
import { bowlerDisplayName } from "@/lib/displayName";
import BylawsCard from "./BylawsCard";
import styles from "./MemberRoster.module.scss";

function formatAvg(n) {
  return n > 0 ? String(Math.round(n)) : null;
}

function BowlerModal({ bowlerId, onClose }) {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/member/bowler/${bowlerId}`)
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load");
        if (cancelled) return;
        setData(json);
        setForm({
          firstName: json.firstName ?? "",
          lastName: json.lastName ?? "",
          nickname: json.nickname ?? "",
          nicknameUseInDisplay: json.nicknameUseInDisplay ?? false,
          email: json.email ?? "",
          phone: json.phone ?? "",
          usbcId: json.usbcId ?? "",
        });
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err.message);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [bowlerId]);

  async function handleSave() {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch(`/api/member/bowler/${bowlerId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSaveStatus("done");
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus("error");
    }
  }

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.modalCard}>
        <button type="button" className={styles.modalClose} onClick={onClose}>
          ×
        </button>

        {status === "loading" && <p>Loading…</p>}
        {status === "error" && <p className={styles.statusError}>✕ {loadError}</p>}

        {status === "ready" && data && (
          <>
            <h3>{bowlerDisplayName(data)}</h3>

            {data.editable ? (
              <>
                <div className={styles.modalField}>
                  <label>First name</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Last name</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Nickname</label>
                  <input
                    value={form.nickname}
                    placeholder="Not yet provided — add yours"
                    onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                  />
                  <label className={styles.capCheckbox}>
                    <input
                      type="checkbox"
                      checked={form.nicknameUseInDisplay}
                      disabled={!form.nickname}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, nicknameUseInDisplay: e.target.checked }))
                      }
                    />{" "}
                    Use in Display Name
                  </label>
                  {form.nicknameUseInDisplay && form.nickname && (
                    <div className={styles.helpNote}>
                      Will show as &quot;{form.nickname} {form.lastName}&quot; on the roster and
                      your bowler card.
                    </div>
                  )}
                </div>
                <div className={styles.modalField}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    placeholder="Not yet provided — add yours"
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>Phone number</label>
                  <input
                    type="tel"
                    value={form.phone}
                    placeholder="Not yet provided — add yours"
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className={styles.modalField}>
                  <label>USBC ID number</label>
                  <input
                    value={form.usbcId}
                    placeholder="Not yet provided — add yours"
                    onChange={(e) => setForm((f) => ({ ...f, usbcId: e.target.value }))}
                  />
                </div>

                {saveStatus === "error" && <div className={styles.statusError}>✕ {saveError}</div>}
                {saveStatus === "done" && <div className={styles.statusOk}>✓ Saved.</div>}
                <button
                  type="button"
                  className={styles.btnSaveModal}
                  disabled={saveStatus === "saving"}
                  onClick={handleSave}
                >
                  {saveStatus === "saving" ? "Saving…" : "Save changes"}
                </button>
              </>
            ) : (
              <>
                <div className={styles.modalField}>
                  <label>First name</label>
                  <div className={styles.value}>{data.firstName}</div>
                </div>
                <div className={styles.modalField}>
                  <label>Last name</label>
                  <div className={styles.value}>{data.lastName}</div>
                </div>
                {data.nickname && (
                  <div className={styles.modalField}>
                    <label>Nickname</label>
                    <div className={styles.value}>{data.nickname}</div>
                  </div>
                )}
                {data.canViewContact && (
                  <>
                    <div className={styles.modalField}>
                      <label>Email</label>
                      <div className={styles.value}>{data.email || "—"}</div>
                    </div>
                    <div className={styles.modalField}>
                      <label>Phone number</label>
                      <div className={styles.value}>{data.phone || "—"}</div>
                    </div>
                    <div className={styles.modalField}>
                      <label>USBC ID number</label>
                      <div className={styles.value}>{data.usbcId || "—"}</div>
                    </div>
                  </>
                )}
              </>
            )}

            <div className={styles.leaguesLabel}>Leagues</div>
            {data.leagues.map((l, i) => (
              <div key={i} className={styles.leagueBlock}>
                <div className={styles.lname}>{l.league}</div>
                <div className={styles.lteam}>{l.team}</div>
                <div className={styles.lavg}>Real average: {l.avg ?? "Not yet established"}</div>
                <label className={styles.capCheckbox}>
                  <input type="checkbox" checked={l.captain} disabled readOnly /> Team Captain
                </label>
              </div>
            ))}

            <div className={styles.modalNote}>
              Identity fields (name, email, phone, USBC ID) are shared everywhere. Team Captain is
              set per league/team and controls who can submit pre-bowl/makeup requests for that
              team. Only admins can change the captain flag.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function MemberRoster({ teams, subs, currentBylaws }) {
  const [openBowlerId, setOpenBowlerId] = useState(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sendStatus, setSendStatus] = useState("idle");
  const [sendError, setSendError] = useState("");

  async function handleSend(e) {
    e.preventDefault();
    setSendStatus("sending");
    setSendError("");
    try {
      const res = await fetch("/api/member/message-officers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setSendStatus("done");
      setSubject("");
      setMessage("");
    } catch (err) {
      setSendError(err.message);
      setSendStatus("error");
    }
  }

  return (
    <>
      <div className={styles.pageHead}>
        <h1 className="display">Member Area</h1>
        <p>Team rosters, bowler info, and a direct line to the officers.</p>
      </div>

      <section className={styles.section}>
        <h2>Team roster</h2>
        <p className={styles.sectionSub}>
          Click any bowler to see their info — including every league they bowl in, not just
          this one.
        </p>
        <p className={styles.legendNote}>
          <span className={styles.capStar}>★</span>Team Captain
        </p>
        <div className={styles.rosterGrid}>
          {teams.map((team) => (
            <div key={team.id} className={styles.teamRosterCard}>
              <div className={styles.teamRosterName}>{team.teamName}</div>
              {team.members.map((m) => (
                <div
                  key={m.bowlerId}
                  className={styles.bowlerRow}
                  onClick={() => setOpenBowlerId(m.bowlerId)}
                >
                  <span className={styles.bname}>
                    {bowlerDisplayName(m)}
                    {m.isCaptain && (
                      <span className={styles.capStar} title="Team Captain">
                        {" "}
                        ★
                      </span>
                    )}
                  </span>
                  <span className={styles.bavg}>{formatAvg(m.realAverage) ?? "—"}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Substitutes</h2>
        <p className={styles.sectionSub}>
          Not assigned to a specific team — available to fill in as needed. Most show no average
          yet since they haven&apos;t subbed in this season.
        </p>
        <div className={styles.subsCard}>
          <div className={styles.teamRosterName}>Temporary Substitutes ({subs.length})</div>
          <div className={styles.subsGridInner}>
            {subs.map((m) => (
              <div
                key={m.bowlerId}
                className={styles.bowlerRow}
                onClick={() => setOpenBowlerId(m.bowlerId)}
              >
                <span className={styles.bname}>
                  {bowlerDisplayName(m)}
                  {m.isCaptain && (
                    <span className={styles.capStar} title="Team Captain">
                      {" "}
                      ★
                    </span>
                  )}
                </span>
                <span className={styles.bavg}>{formatAvg(m.realAverage) ?? "—"}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <BylawsCard current={currentBylaws} />

      <section className={styles.section}>
        <h2>Message the officers</h2>
        <p className={styles.sectionSub}>
          Sends privately to officers@sflgbtbowl.com — not posted anywhere public.
        </p>
        <div className={styles.card}>
          {sendStatus === "done" ? (
            <div className={styles.statusOk}>✓ Message sent to the officers.</div>
          ) : (
            <form onSubmit={handleSend}>
              <div className={styles.field}>
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  type="text"
                  placeholder="What's this about?"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="msg">Message</label>
                <textarea
                  id="msg"
                  placeholder="Write your message to the officers here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              {sendStatus === "error" && <div className={styles.statusError}>✕ {sendError}</div>}
              <button type="submit" className={styles.btnSend} disabled={sendStatus === "sending"}>
                {sendStatus === "sending" ? "Sending…" : "Send to officers"}
              </button>
              <div className={styles.privacyNote}>
                Your name and email come from your member sign-in automatically — officers will
                know who sent this.
              </div>
            </form>
          )}
        </div>
      </section>

      {openBowlerId && <BowlerModal bowlerId={openBowlerId} onClose={() => setOpenBowlerId(null)} />}
    </>
  );
}
