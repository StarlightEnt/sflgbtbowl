"use client";

import { useEffect, useRef, useState } from "react";
import { bareDomain, telHref, venueAddress, venueCityState, venueMapsUrl } from "@/lib/venues/format";
import styles from "./VenuesGrid.module.scss";

// Simple bowling-pin silhouette for a venue with no logo.
function PinPlaceholder() {
  return (
    <svg viewBox="0 0 48 48" className={styles.pin} aria-hidden="true">
      <path
        d="M24 4c-3.3 0-5.5 2.6-5.5 6 0 2.6 1.2 4.4 2.6 6.1-1.8 3.1-5.1 6.4-5.1 12 0 4.6 2.2 7.6 3.5 9.1L18.5 44h11l-1-6.8c1.3-1.5 3.5-4.5 3.5-9.1 0-5.6-3.3-8.9-5.1-12 1.4-1.7 2.6-3.5 2.6-6.1 0-3.4-2.2-6-5.5-6z"
        fill="#b874ff"
        opacity="0.55"
      />
      <path d="M19.4 21.5h9.2v3h-9.2z" fill="#ff4d5e" opacity="0.7" />
    </svg>
  );
}

function LogoBox({ venue, large }) {
  return (
    <div className={`${styles.logoBox} ${large ? styles.logoBoxLarge : ""}`}>
      {venue.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={venue.logo_url} alt={`${venue.name} logo`} />
      ) : (
        <PinPlaceholder />
      )}
    </div>
  );
}

export default function VenuesGrid({ venues, initialSlug }) {
  const [openSlug, setOpenSlug] = useState(
    venues.some((v) => v.slug === initialSlug) ? initialSlug : null
  );
  const closeBtnRef = useRef(null);
  const open = venues.find((v) => v.slug === openSlug) ?? null;

  function openVenue(slug) {
    setOpenSlug(slug);
    // Keeps the URL shareable without a navigation — closing returns to
    // the grid on the same page, which is how a deep-link visitor finds
    // the other venues.
    window.history.replaceState(null, "", `/venues?venue=${encodeURIComponent(slug)}`);
  }

  // Closing returns to the plain grid on the same page — never a
  // navigation away.
  function closePopup() {
    setOpenSlug(null);
    window.history.replaceState(null, "", "/venues");
  }

  useEffect(() => {
    if (!openSlug) return;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpenSlug(null);
        window.history.replaceState(null, "", "/venues");
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // preventScroll: the Close button sits at the bottom of the popup, so a
    // plain focus() would open a tall popup (long blurb, short screen)
    // already scrolled to the bottom, hiding the logo, name and blurb.
    closeBtnRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [openSlug]);

  const mapsUrl = open ? venueMapsUrl(open) : null;
  const address = open ? venueAddress(open) : "";

  return (
    <>
      <div className={styles.grid}>
        {venues.map((v) => {
          const cityState = venueCityState(v);
          const tel = v.phone ? telHref(v.phone) : null;
          return (
            <div key={v.id} className={styles.card}>
              <LogoBox venue={v} />
              <div className={styles.cardBody}>
                <button type="button" className={styles.nameLink} onClick={() => openVenue(v.slug)}>
                  {v.name} <span aria-hidden="true">›</span>
                </button>
                {cityState && <div className={styles.line}>{cityState}</div>}
                {v.phone && (
                  <div className={styles.line}>
                    {tel ? <a href={tel}>{v.phone}</a> : v.phone}
                  </div>
                )}
                {v.website && (
                  <div className={styles.line}>
                    <a href={v.website} target="_blank" rel="noopener noreferrer">
                      {bareDomain(v.website)}
                    </a>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div
          className={styles.overlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePopup();
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={open.name}>
            {open.website ? (
              <a
                href={open.website}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.logoLink}
                aria-label={`${open.name} website`}
              >
                <LogoBox venue={open} large />
              </a>
            ) : (
              <LogoBox venue={open} large />
            )}
            <h2 className={`display ${styles.modalName}`}>{open.name}</h2>
            {open.blurb && <p className={styles.blurb}>{open.blurb}</p>}

            <div className={styles.targets}>
              {mapsUrl && (
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={styles.target}>
                  <span className={styles.targetIcon} aria-hidden="true">
                    📍
                  </span>
                  <span>{address}</span>
                </a>
              )}
              {open.phone && telHref(open.phone) && (
                <a href={telHref(open.phone)} className={styles.target}>
                  <span className={styles.targetIcon} aria-hidden="true">
                    📞
                  </span>
                  <span>{open.phone}</span>
                </a>
              )}
              {open.website && (
                <a
                  href={open.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.target}
                >
                  <span className={styles.targetIcon} aria-hidden="true">
                    🌐
                  </span>
                  <span>{bareDomain(open.website)}</span>
                </a>
              )}
            </div>

            <button type="button" ref={closeBtnRef} className={styles.closeBtn} onClick={closePopup}>
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
