import styles from "./StripeBar.module.scss";

export default function StripeBar() {
  return (
    <div className={styles.stripeBar}>
      <span className={styles.s1} />
      <span className={styles.s2} />
      <span className={styles.s3} />
      <span className={styles.s4} />
      <span className={styles.s5} />
      <span className={styles.s6} />
    </div>
  );
}
