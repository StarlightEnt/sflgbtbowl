"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./WeeklyStandingSheetForm.module.scss";

// "A" -> "B" -> ... -> "Z" -> "AA" ... same sequence the server-side
// auto-suggest in lib/pdf/publishBylawsRevision.js uses — this is
// just for the placeholder text, the server resolves the real label.
function nextRevisionLabel(label) {
  if (!label) return "A";
  const chars = label.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] === "Z") {
      chars[i] = "A";
      i--;
    } else {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      break;
    }
  }
  if (i < 0) chars.unshift("A");
  return chars.join("");
}

export default function BylawsForm({ seasonId, revisions }) {
  const router = useRouter();

  const [file, setFile] = useState(null);
  const [revisionLabelInput, setRevisionLabelInput] = useState("");
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadError, setUploadError] = useState("");

  const [deleteLabel, setDeleteLabel] = useState(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleteStatus, setDeleteStatus] = useState("idle");
  const [deleteError, setDeleteError] = useState("");

  const current = revisions.find((r) => r.is_current) ?? null;
  const archived = revisions.filter((r) => !r.is_current);
  const suggestedLabel = nextRevisionLabel(revisions.at(-1)?.revision_label ?? null);

  async function handleUpload(e) {
    e.preventDefault();
    setUploadStatus("uploading");
    setUploadError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (revisionLabelInput.trim()) formData.append("revisionLabel", revisionLabelInput.trim());
      const res = await fetch("/api/admin/bylaws/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setUploadStatus("done");
      setFile(null);
      setRevisionLabelInput("");
      router.refresh();
    } catch (err) {
      setUploadError(err.message);
      setUploadStatus("error");
    }
  }

  const effectiveDeleteLabel = archived.some((r) => r.revision_label === deleteLabel)
    ? deleteLabel
    : archived[0]?.revision_label ?? null;
  const expectedConfirm = effectiveDeleteLabel ? `REVISION ${effectiveDeleteLabel}` : "";

  async function handleDelete() {
    setDeleteStatus("deleting");
    setDeleteError("");
    try {
      const res = await fetch("/api/admin/bylaws/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revisionLabel: effectiveDeleteLabel, confirmText }),
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
      <h1 className={`display ${styles.heading}`}>By-Laws</h1>
      <p className={styles.sub}>
        Upload each season&apos;s officer/captain-approved By-Laws PDF. The newest upload is the
        official current version — older ones stay archived and admin-downloadable.
      </p>

      {!seasonId ? (
        <div className={styles.statusError}>No season is set up yet — run Season Setup first.</div>
      ) : (
        <>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Current revision</div>
            {current ? (
              <>
                <div className={styles.cardSub}>
                  Revision {current.revision_label}, uploaded{" "}
                  {new Date(current.uploaded_at).toLocaleDateString("en-US")}.
                </div>
                <a href={current.file_url} target="_blank" rel="noreferrer">
                  View PDF
                </a>
              </>
            ) : (
              <p className={styles.cardSub}>No By-Laws uploaded yet this season.</p>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Upload a revision</div>
            <div className={styles.cardSub}>
              PDF only. Leave the revision label blank to auto-assign the next one.
            </div>
            <form onSubmit={handleUpload}>
              <label className={styles.uploadArea}>
                <div className={styles.icon}>📄</div>
                <div className={styles.text}>
                  {file ? file.name : "Click to browse for the By-Laws PDF"}
                </div>
                <input
                  type="file"
                  accept="application/pdf"
                  hidden
                  disabled={uploadStatus === "uploading"}
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) setFile(selected);
                    e.target.value = "";
                  }}
                />
              </label>

              <div style={{ marginTop: 14 }}>
                <input
                  type="text"
                  className={styles.confirmInput}
                  placeholder={`Revision label (defaults to ${suggestedLabel})`}
                  value={revisionLabelInput}
                  onChange={(e) => setRevisionLabelInput(e.target.value)}
                />
              </div>

              {uploadStatus === "done" && (
                <div className={styles.statusOk}>✓ Revision uploaded and published.</div>
              )}
              {uploadStatus === "error" && <div className={styles.statusError}>✕ {uploadError}</div>}

              <div style={{ marginTop: 14 }}>
                <button
                  type="submit"
                  className={`btn ${styles.btnSave}`}
                  disabled={!file || uploadStatus === "uploading"}
                >
                  {uploadStatus === "uploading" ? "Uploading…" : "Upload revision"}
                </button>
              </div>
            </form>
          </div>

          <div className={styles.card}>
            <div className={styles.cardTitle}>Revision history</div>
            {revisions.length === 0 ? (
              <p className={styles.cardSub}>Nothing uploaded yet.</p>
            ) : (
              <table className={styles.history}>
                <thead>
                  <tr>
                    <th>Revision</th>
                    <th>Uploaded</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {revisions.map((row) => (
                    <tr key={row.revision_label}>
                      <td>Revision {row.revision_label}</td>
                      <td>{new Date(row.uploaded_at).toLocaleDateString("en-US")}</td>
                      <td>{row.is_current ? "Current" : "Archived"}</td>
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

          {archived.length > 0 && (
            <div className={`${styles.card} ${styles.dangerCard}`}>
              <div className={styles.cardTitle} style={{ color: "var(--sflgbtbowl-red)" }}>
                ⚠ Danger zone
              </div>
              <div className={styles.cardSub}>These actions are permanent and can&apos;t be undone.</div>

              <div className={styles.dangerRowStack}>
                <div>
                  <div className={styles.dangerRowTitle}>
                    Delete an archived revision
                    {archived.length > 1 && (
                      <select
                        className={styles.weekPicker}
                        value={effectiveDeleteLabel ?? ""}
                        onChange={(e) => {
                          setDeleteLabel(e.target.value);
                          setConfirmText("");
                        }}
                      >
                        {archived.map((row) => (
                          <option key={row.revision_label} value={row.revision_label}>
                            Revision {row.revision_label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className={styles.dangerRowSub}>
                    Removes this revision and deletes the stored PDF. The current revision can&apos;t
                    be deleted this way — publish a corrected revision instead.
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
