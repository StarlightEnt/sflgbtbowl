import Link from "next/link";
import { signIn } from "@/lib/auth";
import styles from "./SignInCard.module.scss";

export default function SignInCard() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={`display ${styles.heading}`}>Sign in</h1>
        <p className={styles.sub}>
          Sign in to manage your league or access member tools.
        </p>

        <form
          action={async () => {
            "use server";
            await signIn("google");
          }}
        >
          <button type="submit" className={styles.btnGoogle}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.3 0 10.2-2 13.9-5.4l-6.4-5.4C29.4 34.9 26.8 36 24 36c-5.2 0-9.7-3.4-11.3-8l-6.6 5.1C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.4 5.4C41.5 36 44 30.5 44 24c0-1.3-.1-2.7-.4-3.5z"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <div className={styles.divider}>or</div>

        <form
          action={async (formData) => {
            "use server";
            await signIn("resend", { email: formData.get("email") });
          }}
        >
          <div className={styles.field}>
            <label htmlFor="email">Email address</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="you@example.com"
              required
            />
          </div>
          <button type="submit" className={styles.btnEmail}>
            Send me a sign-in link
          </button>
        </form>

        <p className={styles.finePrint}>
          We&apos;ll email you a secure link — no password needed. Works
          with any email provider.
        </p>
        <Link href="/" className={styles.backLink}>
          ← Back to sflgbtbowl.com
        </Link>
      </div>
    </div>
  );
}
