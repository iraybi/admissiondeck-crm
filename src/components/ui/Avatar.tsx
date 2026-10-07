import styles from "./Avatar.module.css";

const TONES = ["brand", "teal", "orange", "info", "muted"] as const;
type Tone = (typeof TONES)[number];

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function toneFor(seed: string): Tone {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h + seed.charCodeAt(i)) % 997;
  return TONES[h % TONES.length];
}

export function Avatar({
  name,
  size = 32,
  tone,
}: {
  name: string;
  size?: number;
  tone?: Tone;
}) {
  const t = tone ?? toneFor(name);
  return (
    <span
      className={`${styles.avatar} ${styles[t]}`}
      style={{ width: size, height: size, fontSize: Math.round(size / 2.6) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
