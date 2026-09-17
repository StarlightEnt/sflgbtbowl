"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RichTextEditor from "./RichTextEditor";
import { slugify } from "@/lib/tournaments/slugify";
import styles from "./TournamentForm.module.scss";

function emptyOrganizer() {
  return { name: "", email: "" };
}

function toDateInputValue(d) {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export default function TournamentForm({ tournament }) {
  const router = useRouter();
  const isEdit = Boolean(tournament);

  const [name, setName] = useState(tournament?.name ?? "");
  const [slug, setSlug] = useState(tournament?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(false);
  const [startDate, setStartDate] = useState(toDateInputValue(tournament?.start_date));
  const [endDate, setEndDate] = useState(toDateInputValue(tournament?.end_date));
  const [costDisplay, setCostDisplay] = useState(tournament?.cost_display ?? "");
  const [category, setCategory] = useState(tournament?.category ?? "");
  const [venueName, setVenueName] = useState(tournament?.venue_name ?? "");
  const [venueAddress, setVenueAddress] = useState(tournament?.venue_address ?? "");
  const [venuePhone, setVenuePhone] = useState(tournament?.venue_phone ?? "");
  const [venueWebsite, setVenueWebsite] = useState(tournament?.venue_website ?? "");
  const [organizers, setOrganizers] = useState(
    tournament?.organizers?.length ? tournament.organizers : [emptyOrganizer()]
  );
  const [websiteUrl, setWebsiteUrl] = useState(tournament?.website_url ?? "");
  const [body, setBody] = useState(tournament?.body ?? "");
  const [isActive, setIsActive] = useState(tournament?.is_active ?? true);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(tournament?.image_url ?? null);

  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");

  function handleNameChange(value) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function handleOrganizerChange(i, field, value) {
    setOrganizers((prev) => prev.map((o, idx) => (idx === i ? { ...o, [field]: value } : o)));
  }

  function addOrganizer() {
    setOrganizers((prev) => [...prev, emptyOrganizer()]);
  }

  function removeOrganizer(i) {
    setOrganizers((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaveStatus("saving");
    setSaveError("");

    const input = {
      name,
      slug,
      startDate,
      endDate,
      costDisplay,
      category,
      venueName,
      venueAddress,
      venuePhone,
      venueWebsite,
      organizers,
      websiteUrl,
      body,
      isActive,
    };

    const formData = new FormData();
    formData.append("input", JSON.stringify(input));
    if (imageFile) formData.append("image", imageFile);

    try {
      const url = isEdit ? `/api/admin/tournaments/${tournament.id}` : "/api/admin/tournaments";
      const res = await fetch(url, { method: isEdit ? "PUT" : "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaveStatus("done");
      router.push("/admin/tournaments");
      router.refresh();
    } catch (err) {
      setSaveError(err.message);
      setSaveStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Basics</div>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Name</span>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Slug</span>
            <input
              type="text"
              className={styles.input}
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              placeholder={slugify(name)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Start date</span>
            <input
              type="date"
              className={styles.input}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>End date</span>
            <input
              type="date"
              className={styles.input}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Cost</span>
            <input
              type="text"
              className={styles.input}
              value={costDisplay}
              onChange={(e) => setCostDisplay(e.target.value)}
              placeholder="e.g. $124.00, Free, $50–$75"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Category</span>
            <input
              type="text"
              className={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g. West Coast/Pacific Nations"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Tournament website</span>
            <input
              type="url"
              className={styles.input}
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://…"
            />
          </label>
        </div>

        <label className={styles.toggleRow}>
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <span>Active — visible on the public site</span>
        </label>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Venue</div>
        <div className={styles.formGrid}>
          <label className={styles.field}>
            <span className={styles.label}>Venue name</span>
            <input
              type="text"
              className={styles.input}
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Phone</span>
            <input
              type="text"
              className={styles.input}
              value={venuePhone}
              onChange={(e) => setVenuePhone(e.target.value)}
            />
          </label>
          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span className={styles.label}>Address</span>
            <input
              type="text"
              className={styles.input}
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder="Used to build the Google Maps link"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Venue website</span>
            <input
              type="url"
              className={styles.input}
              value={venueWebsite}
              onChange={(e) => setVenueWebsite(e.target.value)}
              placeholder="https://…"
            />
          </label>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Organizers</div>
        <div className={styles.cardSub}>Shown publicly, same as a real tournament flyer.</div>
        {organizers.map((o, i) => (
          <div key={i} className={styles.organizerRow}>
            <input
              type="text"
              className={styles.input}
              placeholder="Name"
              value={o.name}
              onChange={(e) => handleOrganizerChange(i, "name", e.target.value)}
            />
            <input
              type="email"
              className={styles.input}
              placeholder="Email"
              value={o.email}
              onChange={(e) => handleOrganizerChange(i, "email", e.target.value)}
            />
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => removeOrganizer(i)}
              disabled={organizers.length === 1}
              aria-label="Remove organizer"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className={styles.btnSecondary} onClick={addOrganizer}>
          + Add another organizer
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Description</div>
        <RichTextEditor value={body} onChange={setBody} />
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Image</div>
        {imagePreview && (
          <img src={imagePreview} alt="" className={styles.imagePreview} />
        )}
        <label className={styles.uploadArea}>
          <div className={styles.icon}>🖼️</div>
          <div className={styles.text}>{imageFile ? imageFile.name : "Click to browse for an image"}</div>
          <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" hidden onChange={handleImageChange} />
        </label>
      </div>

      {saveStatus === "error" && <div className={styles.statusError}>✕ {saveError}</div>}

      <div className={styles.actions}>
        <button type="submit" className="btn" disabled={saveStatus === "saving"}>
          {saveStatus === "saving" ? "Saving…" : "Save"}
        </button>
        <button type="button" className={styles.btnCancel} onClick={() => router.push("/admin/tournaments")}>
          Cancel
        </button>
      </div>
    </form>
  );
}