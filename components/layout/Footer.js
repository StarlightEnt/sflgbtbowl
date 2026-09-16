import Link from "next/link";
import styles from "./Footer.module.scss";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      SF LGBT Bowlers · <Link href="/privacy">Privacy Policy</Link>
    </footer>
  );
}
