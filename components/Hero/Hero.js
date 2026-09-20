import styles from "./Hero.module.scss";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <img
        src="/hero-strike.gif"
        alt=""
        aria-hidden="true"
        className={styles.bg}
      />
      <div className={styles.overlay} />
      <div className={styles.content}>
        <h1 className={`display ${styles.heading}`}>
          Wednesday and Sunday night bowling, for everyone.
        </h1>
        <p className={styles.tagline}>
          San Francisco&apos;s LGBTQ+ community bowling leagues — beginners
          welcome, teams forming now, every lane open to you.
        </p>
        <a href="#contact" className="btn">
          Get in touch
        </a>
      </div>
    </section>
  );
}
