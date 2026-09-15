"use client";

import { useState } from "react";
import styles from "./ContactForm.module.scss";

const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbw2KZB0oDTIkh6K-ozE86PDZ8hFnPkfXWcMH0zHfZtIHT--sdU4AX8pX7OWnjGiAcVnow/exec";

export default function ContactForm() {
  const [status, setStatus] = useState({ text: "", color: "" });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = form.elements.namedItem("name").value.trim();
    const email = form.elements.namedItem("email").value.trim();
    const blurb = form.elements.namedItem("message").value.trim();

    setSubmitting(true);
    setStatus({ text: "Sending…", color: "var(--sflgbtbowl-ink-dim)" });

    try {
      await fetch(SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ name, email, blurb }),
      });
      // no-cors gives an opaque response, so a resolved promise is our success signal
      setStatus({ text: "Thanks! We'll be in touch.", color: "var(--sflgbtbowl-green)" });
      form.reset();
    } catch {
      // network-level failure — fall back to opening an email client so nothing gets lost
      setStatus({
        text: "Couldn't reach our form — opening your email app instead…",
        color: "var(--sflgbtbowl-orange)",
      });
      const subject = encodeURIComponent("Interested in SF LGBT Bowlers");
      const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${blurb}`);
      window.location.href = `mailto:officers@sflgbtbowl.com?subject=${subject}&body=${body}`;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.contact} id="contact">
      <h2 className={`display ${styles.heading}`}>Get in touch</h2>
      <p className={styles.intro}>
        Have questions about joining, substituting, or league nights? Reach
        out — an officer will get back to you.
      </p>
      <div className={styles.contactGrid}>
        <form className={styles.sheet} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name">Name</label>
            <input type="text" id="name" name="name" placeholder="Your name" required />
          </div>
          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="message">Message</label>
            <textarea
              id="message"
              name="message"
              placeholder="What's on your mind?"
            ></textarea>
          </div>
          <button type="submit" className="btn" disabled={submitting}>
            Send message
          </button>
          <div className={styles.status} role="status" style={{ color: status.color }}>
            {status.text}
          </div>
        </form>
        <div className={styles.directContact}>
          <h3 className={styles.directHeading}>Prefer email?</h3>
          <p>
            Reach us directly at{" "}
            <a href="mailto:officers@sflgbtbowl.com">officers@sflgbtbowl.com</a> —
            an officer checks this regularly and will get back to you.
          </p>
        </div>
      </div>
    </section>
  );
}
