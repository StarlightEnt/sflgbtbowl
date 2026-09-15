"use client";

import { useState } from "react";
import { formatWeekDate } from "@/lib/formatWeekDate";
import styles from "./StandingSheetsDownload.module.scss";

export default function StandingSheetsDownload({ sheets }) {
  const latest = sheets[sheets.length - 1];
  const [selectedId, setSelectedId] = useState(latest?.id ?? null);

  if (sheets.length === 0) {
    return <p className={styles.emptyNote}>No standing sheets uploaded yet.</p>;
  }

  const selected = sheets.find((s) => s.id === selectedId) ?? latest;

  return (
    <>
      <div className={styles.downloadRow}>
        <select
          className={styles.weekSelect}
          value={selectedId}
          onChange={(e) => setSelectedId(Number(e.target.value))}
        >
          {sheets.map((sheet) => (
            <option key={sheet.id} value={sheet.id}>
              Week {sheet.week_number}
              {sheet.week_date ? ` — ${formatWeekDate(sheet.week_date)}` : ""}
            </option>
          ))}
        </select>
        <a href={selected.file_url} className={styles.btnDownload} target="_blank" rel="noreferrer">
          Download PDF
        </a>
      </div>
      <div className={styles.emptyNote}>More weeks appear here as sheets are uploaded</div>
    </>
  );
}
