"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./VenueForm.module.scss";

const BLURB_MAX = 150;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

export default function VenueForm({ venue }) {
  const router = useRouter();
  const isEdit = Boolean(venue);

  const [name, setName] = useState(venue?.name ?? "");
  const [street, setStreet] = useState(venue?.street ?? "");
  const [city, setCity] = useState(venue?.city ?? "");
  const [state, setState] = useState(venue?.state ?? "");
  const [zip, setZip] = useState(venue?.zip ?? "");
  const [phone, setPhone] = useState(venue?.phone ?? "");
  const [website, setWebsite] = useState(venue?.website ?? "");
  const [blurb, setBlurb] = useState(venue?.blurb ?? "");
  const [isVisible, setIsVisible] = useState(venue?.is_visible ?? true);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(venue?.logo_url ?? null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState("");

  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");

  function handleLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
      setLogoError("Logo must be a PNG, JPG, SVG, or WebP file");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be 2MB or smaller");
      return;
    }
    setLogoError("");
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setLogoError("");
    setRemoveLogo(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveStatus("saving");
    setSaveError("");

    const input = { name, street, city, state, zip, phone, website, blurb, isVisible, removeLogo };

    const formData = new FormData();
    formData.append("input", JSON.stringify(input));
    if (logoFile) formData.append("logo", logoFile);

    try {
      const url = isEdit ? `/api/admin/venues/${venue.id}` : "/api/admin/venues";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveStatus("done");
      router.push("/admin/venues");
      router.refresh();
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus("error");
    }
  }

  const blurbAtLimit = blurb.length >= BLURB_MAX;

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Basics</div>
        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Venue name</span>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Phone</span>
            <input
              type="text"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(415) 555-0100"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Website</span>
            <input
              type="text"
              className={styles.input}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="classicbowling.com"
            />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Blurb</span>
            <textarea
              className={styles.input}
              value={blurb}
              maxLength={BLURB_MAX}
              onChange={(e) => setBlurb(e.target.value)}
              placeholder="A sentence or two shown in the venue popup"
            />
            <span className={`${styles.counter} ${blurbAtLimit ? styles.counterAtLimit : ""}`}>
              {blurb.length} / {BLURB_MAX}
            </span>
          </label>
        </div>

        <label className={styles.toggleRow}>
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setIsVisible(e.target.checked)}
          />
          <span>Show on public Venues page</span>
        </label>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Address</div>
        <div className={styles.cardSub}>
          Entered as separate fields — the Google Maps link is generated from them, never typed.
        </div>
        <div className={styles.formGrid}>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Street</span>
            <input
              type="text"
              className={styles.input}
              value={street}
              onChange={(e) => setStreet(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>City</span>
            <input
              type="text"
              className={styles.input}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>State</span>
            <input
              type="text"
              className={styles.input}
              value={state}
              onChange={(e) => setState(e.target.value)}
              placeholder="CA"
              maxLength={2}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>ZIP</span>
            <input
              type="text"
              className={styles.input}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Logo</div>
        <div className={styles.cardSub}>PNG, JPG, SVG, or WebP — 2MB maximum.</div>
        {logoPreview && (
          <div className={styles.logoPreviewBox}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoPreview} alt="" />
          </div>
        )}
        <label className={styles.uploadArea}>
          <div className={styles.icon}>🖼️</div>
          <div className={styles.text}>
            {logoFile
              ? logoFile.name
              : logoPreview
                ? "Click to replace the logo"
                : "Click to browse for a logo"}
          </div>
          <input
            type="file"
            accept="image/png,image/jpeg,image/svg+xml,image/webp"
            hidden
            onChange={handleLogoChange}
          />
        </label>
        {logoError && <div className={styles.statusError}>✕ {logoError}</div>}
        {logoPreview && (
          <button type="button" className={styles.btnSecondary} onClick={handleRemoveLogo}>
            Remove logo
          </button>
        )}
      </div>

      {saveStatus === "error" && <div className={styles.statusError}>✕ {saveError}</div>}

      <div className={styles.actions}>
        <button type="submit" className="btn" disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className={styles.btnCancel}
          onClick={() => router.push("/admin/venues")}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
