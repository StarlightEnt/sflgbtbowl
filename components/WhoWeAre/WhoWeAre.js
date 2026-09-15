import styles from "./WhoWeAre.module.scss";

export default function WhoWeAre() {
  return (
    <section className={styles.who}>
      <div className={styles.whoInner}>
        <h2 className={`display ${styles.heading}`}>Who we are</h2>
        <p>
          We&apos;re a community bowling league that meets every Wednesday
          night in San Francisco. Whether you&apos;ve been bowling for
          decades or you&apos;re picking up a ball for the first time,
          there&apos;s a lane for you here.
        </p>
        <p>
          The league is run entirely by volunteer officers, and every bit
          of dues and fundraising goes back into keeping league nights
          affordable and welcoming.
        </p>
        <div className={styles.scoreboard}>
          <p>Every bowler. Every skill level. Every Wednesday.</p>
        </div>
      </div>
    </section>
  );
}
