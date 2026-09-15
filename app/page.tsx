"use client";

import { useState } from "react";

const SHEET_ENDPOINT =
  "https://script.google.com/macros/s/AKfycbw2KZB0oDTIkh6K-ozE86PDZ8hFnPkfXWcMH0zHfZtIHT--sdU4AX8pX7OWnjGiAcVnow/exec";

export default function Home() {
  const [status, setStatus] = useState<{ text: string; color: string }>({
    text: "",
    color: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const blurb = (form.elements.namedItem("blurb") as HTMLTextAreaElement).value.trim();

    setSubmitting(true);
    setStatus({ text: "Sending…", color: "var(--ink-dim)" });

    try {
      await fetch(SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ name, email, blurb }),
      });
      // no-cors gives an opaque response, so a resolved promise is our success signal
      setStatus({ text: "Thanks! We'll be in touch.", color: "var(--green)" });
      form.reset();
    } catch {
      // network-level failure — fall back to opening an email client so nothing gets lost
      setStatus({
        text: "Couldn't reach our form — opening your email app instead…",
        color: "#ff9838",
      });
      const subject = encodeURIComponent("Interested in SF LGBT Wednesday Bowling");
      const body = encodeURIComponent(
        `Name: ${name}\nEmail: ${email}\n\nAbout me:\n${blurb}`
      );
      window.location.href = `mailto:officers@sflgbtbowl.com?subject=${subject}&body=${body}`;
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="hero">
        <div className="lane-bg">
          <svg
            viewBox="0 0 400 460"
            width="800"
            height="920"
            preserveAspectRatio="xMidYMax meet"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="laneGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#241a3d" />
                <stop offset="100%" stopColor="#0b0a14" />
              </linearGradient>
              <linearGradient id="gutterGlow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#b874ff" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#3fa8ff" stopOpacity="0.15" />
              </linearGradient>
            </defs>

            {/* lane surface */}
            <polygon points="140,60 260,60 380,440 20,440" fill="url(#laneGrad)" />
            {/* gutters */}
            <polygon points="140,60 150,60 55,440 20,440" fill="url(#gutterGlow)" opacity="0.55" />
            <polygon points="250,60 260,60 380,440 345,440" fill="url(#gutterGlow)" opacity="0.55" />
            {/* lane arrows */}
            <g fill="#f4f1fb" opacity="0.15">
              <polygon points="200,300 194,314 206,314" />
              <polygon points="175,310 169,324 181,324" />
              <polygon points="225,310 219,324 231,324" />
              <polygon points="150,324 144,338 156,338" />
              <polygon points="250,324 244,338 256,338" />
            </g>

            {/* pins (triangle, pride colors) */}
            <g className="pin p1"><ellipse cx="180" cy="86" rx="7" ry="18" fill="#ff4d5e" /></g>
            <g className="pin p2"><ellipse cx="220" cy="86" rx="7" ry="18" fill="#3fa8ff" /></g>
            <g className="pin p3"><ellipse cx="163" cy="66" rx="6" ry="15" fill="#ff9838" /></g>
            <g className="pin p4"><ellipse cx="200" cy="66" rx="6" ry="15" fill="#ffd54a" /></g>
            <g className="pin p5"><ellipse cx="237" cy="66" rx="6" ry="15" fill="#35d68f" /></g>
            <g className="pin p6"><ellipse cx="200" cy="50" rx="5" ry="13" fill="#b874ff" /></g>

            {/* ball */}
            <g className="ball-group">
              <circle cx="200" cy="0" r="16" fill="#f4f1fb" />
              <circle cx="196" cy="-5" r="1.6" fill="#241a3d" />
              <circle cx="204" cy="-5" r="1.6" fill="#241a3d" />
              <circle cx="200" cy="1" r="1.6" fill="#241a3d" />
            </g>

            {/* impact flash */}
            <circle className="reset-flash" cx="200" cy="66" r="46" fill="#ffffff" opacity="0" />
          </svg>
        </div>

        <div className="hero-content">
          <img
            className="logo"
            src="/logo.png"
            alt="LGBT Wednesday Community bowling league logo"
          />
          <h1>Every Wednesday, we roll as one.</h1>
          <p>
            San Francisco&apos;s LGBT bowling community — open lanes, open
            hearts, and a strike or two along the way. All identities, all
            skill levels, every Wednesday night.
          </p>
          <div className="cta-row">
            <a className="btn btn-primary" href="#contact">Say hello</a>
            <a className="btn btn-ghost" href="mailto:officers@sflgbtbowl.com">
              Email the officers
            </a>
          </div>
        </div>

        <div className="scroll-cue">
          <span className="dot"></span>scroll
        </div>
      </header>

      <section className="about">
        <h2>A lane for everyone</h2>
        <p>
          We&apos;re a Wednesday-night bowling community built by and for San
          Francisco&apos;s LGBT community. No experience needed, no team
          required — just show up, grab a pair of shoes, and find your
          people.
        </p>
        <p>
          New to town, new to bowling, or just looking for your Wednesday
          plans? This is it.
        </p>
        <div className="strip">
          <div className="item"><span className="swatch" style={{ background: "#ff4d5e" }}></span><span>All welcome</span></div>
          <div className="item"><span className="swatch" style={{ background: "#ff9838" }}></span><span>Beginners fine</span></div>
          <div className="item"><span className="swatch" style={{ background: "#ffd54a" }}></span><span>Every Wednesday</span></div>
          <div className="item"><span className="swatch" style={{ background: "#35d68f" }}></span><span>San Francisco</span></div>
          <div className="item"><span className="swatch" style={{ background: "#3fa8ff" }}></span><span>Rentals on site</span></div>
          <div className="item"><span className="swatch" style={{ background: "#b874ff" }}></span><span>No commitment</span></div>
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="contact-inner">
          <h2>Come meet the league</h2>
          <p>Tell us a little about yourself and we&apos;ll get back to you with the details.</p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Name</label>
              <input type="text" id="name" name="name" required />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" required />
            </div>
            <div className="field">
              <label htmlFor="blurb">A little about you</label>
              <textarea
                id="blurb"
                name="blurb"
                rows={4}
                placeholder="Bowling experience (or none at all), what brings you here, anything you'd like us to know."
              ></textarea>
            </div>
            <div className="form-footer">
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center" }}
                disabled={submitting}
              >
                Send it over
              </button>
              <div className="status" role="status" style={{ color: status.color }}>
                {status.text}
              </div>
              <p className="direct-email">
                Prefer to just write us?{" "}
                <a href="mailto:officers@sflgbtbowl.com">officers@sflgbtbowl.com</a>
              </p>
            </div>
          </form>
        </div>
      </section>

      <footer>sflgbtbowl.com · officers@sflgbtbowl.com</footer>
    </>
  );
}
