import styles from "./PrivacyPolicy.module.scss";

export default function PrivacyPolicy() {
  return (
    <section className={styles.section}>
      <h1 className="display">Privacy Policy — SF LGBT Bowlers</h1>
      <p className={styles.intro}>
        This page describes what information sflgbtbowl.com collects, how it&apos;s used, and
        who can see it. We&apos;ve kept this plain and accurate rather than full of legal
        boilerplate — if anything here is unclear, reach out to{" "}
        <a href="mailto:officers@sflgbtbowl.com">officers@sflgbtbowl.com</a>.
      </p>

      <h2>What we collect</h2>
      <p>
        <strong>When you sign in:</strong> We use Google Sign-In or a one-time email link (sent
        via Resend) to verify who you are. We receive your email address, and if you sign in
        with Google, your name as it appears on your Google account.
      </p>
      <p>
        <strong>League roster information:</strong> If you bowl in one of our leagues, your
        name, nickname, bowling average, team assignment, and USBC ID number are recorded from
        league standing sheets. Your phone number and email address may also be on file if you
        or a league officer added them.
      </p>
      <p>
        <strong>Pre-bowl and makeup requests:</strong> If you&apos;re a team captain, requests
        you submit (team, date, reason) are recorded and emailed to the league officers.
      </p>
      <p>
        <strong>Messages to officers:</strong> Messages sent through the &quot;Message the
        Officers&quot; form are emailed directly to the officers; they aren&apos;t stored
        elsewhere on the site.
      </p>
      <p>
        <strong>Contact form submissions:</strong> Messages sent through the general contact
        form on our homepage go to a Google Sheet managed by league officers.
      </p>

      <h2>Who can see your information</h2>
      <ul>
        <li>Your name, team, and bowling average are visible to any signed-in member of the league.</li>
        <li>
          Your contact information (email, phone, USBC ID) is visible to your own teammates,
          and, if you&apos;re a team captain, to other team captains — not to the wider
          membership.
        </li>
        <li>League admins can see and edit anyone&apos;s information.</li>
        <li>
          If you&apos;re a substitute not currently assigned to a team, your contact information
          is visible only to you and league admins.
        </li>
      </ul>

      <h2>Third-party services we use</h2>
      <ul>
        <li>
          <strong>Google</strong> — for sign-in, if you choose that option.
        </li>
        <li>
          <strong>Resend</strong> — to send sign-in links and league-related emails.
        </li>
        <li>
          <strong>Vercel</strong> and <strong>Neon</strong> — host the website and its database.
        </li>
      </ul>
      <p>We don&apos;t sell your information or use it for advertising.</p>

      <h2>Your choices</h2>
      <p>
        You can edit your own contact information any time you&apos;re signed in. To request a
        correction or removal of your information, contact{" "}
        <a href="mailto:officers@sflgbtbowl.com">officers@sflgbtbowl.com</a>.
      </p>
    </section>
  );
}
