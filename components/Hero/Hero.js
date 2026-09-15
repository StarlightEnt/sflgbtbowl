import styles from "./Hero.module.scss";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div>
        <h1 className={`display ${styles.heading}`}>
          Wednesday night bowling, for everyone.
        </h1>
        <p className={styles.tagline}>
          San Francisco&apos;s LGBTQ+ community bowling league — beginners
          welcome, teams forming now, every lane open to you.
        </p>
        <a href="#contact" className="btn">
          Get in touch
        </a>
      </div>
      <svg
        className={styles.laneScene}
        viewBox="0 0 400 260"
        xmlns="http://www.w3.org/2000/svg"
      >
        <polygon points="140,240 260,240 300,40 100,40" fill="#171129" />
        <polygon points="150,232 250,232 284,48 116,48" fill="#241a3d" />
        <line
          x1="200"
          y1="60"
          x2="200"
          y2="225"
          stroke="#3a2a5c"
          strokeWidth="2"
          opacity="0.6"
        />

        <g id="pins">
          <ellipse cx="200" cy="55" rx="6" ry="14" fill="var(--sflgbtbowl-yellow)" />
          <ellipse cx="188" cy="60" rx="6" ry="14" fill="var(--sflgbtbowl-orange)" />
          <ellipse cx="212" cy="60" rx="6" ry="14" fill="var(--sflgbtbowl-red)" />
          <ellipse cx="176" cy="66" rx="6" ry="14" fill="var(--sflgbtbowl-green)" />
          <ellipse cx="224" cy="66" rx="6" ry="14" fill="var(--sflgbtbowl-blue)" />
        </g>

        <circle id="ball" cx="200" cy="215" r="13" fill="var(--sflgbtbowl-purple)">
          <animate
            attributeName="cy"
            values="215;70;215"
            dur="3.2s"
            repeatCount="indefinite"
            keyTimes="0;0.65;1"
            calcMode="spline"
            keySplines="0.3 0 0.7 1;0.3 0 0.7 1"
          />
        </circle>
        <animateTransform
          xlinkHref="#pins"
          attributeName="transform"
          type="translate"
          values="0,0; 0,0; -2,-6; 6,4; -8,10; 4,-8; -2,-6"
          dur="3.2s"
          begin="0s"
          repeatCount="indefinite"
          keyTimes="0;0.6;0.68;0.75;0.82;0.9;1"
        />
      </svg>
    </section>
  );
}
