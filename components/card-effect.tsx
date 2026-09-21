import type { Effect } from "@/lib/catalog";
import { MotionCanvas } from "./motion-canvas";
import styles from "./visuals.module.css";

export function CardEffect({ effect = "RAW" }: { effect?: Effect }) {
  if (effect === "RAW" || effect === "NONE") return null;
  return (
    <div
      className={`${styles.cardEffect} ${styles[effect.toLowerCase()]}`}
      aria-hidden="true"
    >
      <div className={styles.materialVeil} />
      <MotionCanvas kind={effect} />
      <div className={styles.cardRim} />
      {effect === "POO" && <span className={styles.pooSeal}>💩</span>}
    </div>
  );
}
