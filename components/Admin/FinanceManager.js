"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./FinanceManager.module.scss";

const money = (n) => Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

function day(value) {
  if (!value) return "—";
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function final2Label(r) {
  if (!r.final2Applies) return { text: "n/a", cls: "" };
  if (r.final2Marked >= 2) return { text: "✓ Paid", cls: styles.good };
  if (r.final2Marked === 1) return { text: "⚠ 1 of 2", cls: styles.warn };
  return { text: "⚠ Unpaid", cls: styles.warn };
}

async function post(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Request failed");
  }
}

function Section({ section }) {
  const router = useRouter();
  const [sortBy, setSortBy] = useState("team");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState({});
  const [reasonDraft, setReasonDraft] = useState({});

  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      router.refresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const sorted = useMemo(() => {
    const rows = [...section.rows];
    if (sortBy === "name") {
      const label = (r) => (r.siteName ?? r.sheetName).toLowerCase();
      rows.sort((a, b) => label(a).localeCompare(label(b)));
    }
    return rows;
  }, [section.rows, sortBy]);

  const flagsByTeam = useMemo(() => {
    const m = new Map();
    for (const f of section.flags) {
      if (!m.has(f.teamId)) m.set(f.teamId, []);
      m.get(f.teamId).push(f);
    }
    return m;
  }, [section.flags]);

  const teams = useMemo(() => {
    const seen = new Map();
    for (const r of section.rows) {
      if (r.teamId && !seen.has(r.teamId)) {
        seen.set(r.teamId, { id: r.teamId, number: r.teamNumber, name: r.teamName });
      }
    }
    return [...seen.values()].sort((a, b) => a.number - b.number);
  }, [section.rows]);

  const needsLinking = section.rows.filter((r) => !r.bowlerId);
  const final2Open = section.rows.filter((r) => r.final2Applies && r.final2Marked < 2).length;
  const arrears = section.rows.filter((r) => r.inArrears).length;

  const autoCount = section.rows.filter((r) => r.linkStatus === "auto").length;
  const confirmAll = () =>
    run(() => post("/api/admin/finance/link", "POST", { confirmAllSeasonId: section.id }));

  const link = (rowId, bowlerId) => run(() => post("/api/admin/finance/link", "POST", { rowId, bowlerId }));

  return (
    <div className={styles.card}>
      <div className={styles.cardTitle}>{section.title}</div>
      <div className={styles.cardSub}>
        Payments as of <strong>{day(section.asOf)}</strong> · last synced{" "}
        {new Date(section.syncedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
        {section.final2Deadline ? ` · Final 2 weeks due ${day(section.final2Deadline)}` : ""}
      </div>

      <div className={styles.stats}>
        <span>{section.rows.length} bowlers</span>
        <span className={final2Open ? styles.warnText : ""}>⚠ {final2Open} final-2 not complete</span>
        <span className={arrears ? styles.warnText : ""}>⚠ {arrears} in arrears</span>
        <span className={needsLinking.length ? styles.warnText : ""}>
          {needsLinking.length} not linked to a site bowler
        </span>
      </div>

      {error && <div className={styles.error}>✕ {error}</div>}

      <h3 className={styles.subhead}>Teams</h3>
      <div className={styles.teamGrid}>
        {teams.map((t) => {
          const flags = flagsByTeam.get(t.id) ?? [];
          const manual = flags.find((f) => f.source === "admin");
          return (
            <div key={t.id} className={`${styles.teamBox} ${flags.length ? styles.teamFlagged : ""}`}>
              <div className={styles.teamName}>
                {t.number}. {t.name}
                {flags.length > 0 && <span aria-label="flagged"> *</span>}
              </div>
              {flags.map((f) => (
                <div key={f.source} className={styles.flagReason}>
                  <strong>{f.source}:</strong> {f.reason || "(no reason given)"}
                </div>
              ))}
              {manual ? (
                <button
                  className={styles.smallBtn}
                  disabled={busy}
                  onClick={() => run(() => post("/api/admin/team-flags", "DELETE", { teamId: t.id }))}
                >
                  Clear manual flag
                </button>
              ) : (
                <div className={styles.flagForm}>
                  <input
                    className={styles.input}
                    placeholder="Private reason (officers only)"
                    value={reasonDraft[t.id] ?? ""}
                    onChange={(e) => setReasonDraft({ ...reasonDraft, [t.id]: e.target.value })}
                  />
                  <button
                    className={styles.smallBtn}
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        post("/api/admin/team-flags", "POST", {
                          teamId: t.id,
                          reason: reasonDraft[t.id] ?? "",
                        }),
                      )
                    }
                  >
                    Flag team
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h3 className={styles.subhead}>Bowlers</h3>
      {autoCount > 0 && (
        <div className={styles.confirmBar}>
          {autoCount} names were matched automatically. Rows where the sheet name differs from the
          site name show a Confirm button; otherwise confirm them all at once.
          <button className={styles.smallBtn} disabled={busy} onClick={confirmAll}>
            Confirm all {autoCount}
          </button>
        </div>
      )}
      <div className={styles.sortRow}>
        Sort by{" "}
        <button
          className={`${styles.smallBtn} ${sortBy === "team" ? styles.active : ""}`}
          onClick={() => setSortBy("team")}
        >
          Team
        </button>
        <button
          className={`${styles.smallBtn} ${sortBy === "name" ? styles.active : ""}`}
          onClick={() => setSortBy("name")}
        >
          Name
        </button>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Team</th>
              <th>Bowler</th>
              <th className={styles.num}>Weeks</th>
              <th className={styles.num}>Paid</th>
              <th className={styles.num}>Owed</th>
              <th>Final 2 wks</th>
              <th>Arrears</th>
              <th>Link</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const f2 = final2Label(r);
              return (
                <tr key={r.id} className={r.inArrears ? styles.rowArrears : ""}>
                  <td>
                    {r.teamNumber}. {r.teamName}
                  </td>
                  <td>
                    {r.siteName ?? r.sheetName}
                    {r.siteName && r.siteName !== r.sheetName && (
                      <span className={styles.sheetName}> (sheet: {r.sheetName})</span>
                    )}
                  </td>
                  <td className={styles.num}>{r.weeks}</td>
                  <td className={styles.num}>{money(r.paid)}</td>
                  <td className={styles.num}>{money(r.owed)}</td>
                  <td className={f2.cls}>{f2.text}</td>
                  <td>{r.inArrears ? <span className={styles.warn}>⚠ Yes</span> : "—"}</td>
                  <td>
                    {r.linkStatus === "approved" && <span className={styles.good}>✓ Linked</span>}
                    {r.linkStatus === "auto" &&
                      (r.siteName && r.siteName !== r.sheetName ? (
                        <button className={styles.smallBtn} disabled={busy} onClick={() => link(r.id, r.bowlerId)}>
                          Confirm match
                        </button>
                      ) : (
                        <span className={styles.sheetName}>Auto (same name)</span>
                      ))}
                    {r.linkStatus === "unmatched" && <span className={styles.warn}>⚠ Not linked</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {needsLinking.length > 0 && (
        <>
          <h3 className={styles.subhead}>Link sheet names to site bowlers</h3>
          <p className={styles.cardSub}>
            These names on the treasurer&apos;s sheet couldn&apos;t be matched automatically. Until
            they&apos;re linked, nobody sees finance details for them.
          </p>
          {needsLinking.map((r) => (
            <div key={r.id} className={styles.linkRow}>
              <span>
                {r.sheetName} <span className={styles.sheetName}>(team {r.teamNumber})</span>
              </span>
              <select
                className={styles.input}
                value={pick[r.id] ?? ""}
                onChange={(e) => setPick({ ...pick, [r.id]: e.target.value })}
              >
                <option value="">Choose site bowler…</option>
                {section.roster.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                className={styles.smallBtn}
                disabled={busy || !pick[r.id]}
                onClick={() => link(r.id, Number(pick[r.id]))}
              >
                Link
              </button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function FinanceManager({ leagueName, sections }) {
  return (
    <>
      <h1 className={`display ${styles.heading}`}>{leagueName} — Finances</h1>
      <p className={styles.sub}>
        Payments, balances, and the final-two-weeks tracker for every team, from the treasurer&apos;s
        spreadsheet. Visible to officers and admins only.
      </p>
      {sections.length === 0 ? (
        <div className={styles.card}>No finance data has been loaded yet.</div>
      ) : (
        sections.map((s) => <Section key={s.id} section={s} />)
      )}
    </>
  );
}
