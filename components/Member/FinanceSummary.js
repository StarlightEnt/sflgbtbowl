"use client";

import styles from "./FinanceSummary.module.scss";

const money = (n) =>
  Number(n).toLocaleString("en-US", { style: "currency", currency: "USD" });

// API dates arrive as "2026-10-08" or a full ISO string; the calendar
// day is always the first 10 characters.
function parseDay(value) {
  if (!value) return null;
  const [y, m, d] = String(value).slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function formatDay(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Rendered only when the API sent a `finance` object, i.e. the viewer is
// allowed to see it (own card, officer, admin). This component never
// decides visibility — the route does.
export default function FinanceSummary({ finance }) {
  const asOf = parseDay(finance.asOf);
  const deadline = parseDay(finance.final2Deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const overdue = deadline ? today > deadline : false;

  let final2 = null;
  if (finance.final2Applies) {
    if (finance.final2Marked >= 2) {
      final2 = (
        <div className={`${styles.final2} ${styles.ok}`}>✓ Final 2 weeks paid</div>
      );
    } else {
      const partial = finance.final2Marked === 1 ? " (1 of 2 weeks paid)" : "";
      const due = deadline ? ` — due ${formatDay(deadline)}` : "";
      final2 = (
        <div className={`${styles.final2} ${styles.warn}`}>
          ⚠ {overdue ? "OVERDUE: " : ""}Final 2 weeks not paid{partial}
          {due}
        </div>
      );
    }
  }

  return (
    <div className={styles.finance}>
      <div className={styles.moneyRow}>
        <span>
          <span className={styles.moneyLabel}>Paid</span> {money(finance.paid)}
        </span>
        <span>
          <span className={styles.moneyLabel}>Owed</span> {money(finance.owed)}
        </span>
      </div>
      {final2}
      {finance.inArrears && (
        <div className={`${styles.final2} ${styles.warn}`}>
          ⚠ Your team position is behind on payments — check in with an officer
        </div>
      )}
      {asOf && <div className={styles.asOf}>Payments as of {formatDay(asOf)}</div>}
    </div>
  );
}
