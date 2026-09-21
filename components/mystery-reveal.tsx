"use client";
import { useEffect, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { cardValue, type Item } from "@/lib/catalog";
import { mysteryArt } from "@/lib/goon-catalog";
import { ItemArt } from "./item-card";
import styles from "./goon.module.css";
export function MysteryReveal({
  item,
  onClose,
}: {
  item: Item;
  onClose: () => void;
}) {
  const [stage, setStage] = useState(0);
  const [sparks, setSparks] = useState<
    { x: number; y: number; delay: number; size: number }[]
  >([]);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSparks(
      Array.from({ length: 42 }, () => ({
        x: Math.random() * 100,
        y: Math.random() * 85,
        delay: Math.random() * 1.5,
        size: 2 + Math.random() * 5,
      })),
    );
    if (reduced) {
      setStage(2);
      return;
    }
    const crack = setTimeout(() => setStage(1), 1000);
    const reveal = setTimeout(() => setStage(2), 2000);
    return () => {
      clearTimeout(crack);
      clearTimeout(reveal);
    };
  }, []);
  const token: Item = {
    id: "mystery-token",
    name: "Mystery Item",
    rarity: "MYTHIC",
    image: mysteryArt,
  };
  return (
    <div className={`modal-backdrop ${styles.heavenBackdrop}`}>
      <section
        className={`${styles.mysteryReveal} ${stage > 0 ? styles.broken : ""} ${stage === 2 ? styles.revealed : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mystery-title"
        data-reveal-stage={stage}
      >
        <div className={styles.heavenRays} />
        <div className={styles.heavenClouds} />
        <span className="eyebrow">
          {stage === 2 ? "THE SEAL HAS CHOSEN" : "SOMETHING IMPOSSIBLE…"}
        </span>
        <div className={styles.revealStage}>
          <div className={`${styles.seal} ${styles.sealLeft}`}>
            <ItemArt item={token} large eager />
          </div>
          <div className={`${styles.seal} ${styles.sealRight}`}>
            <ItemArt item={token} large eager />
          </div>
          {stage > 0 && <div className={styles.sealFlash} />}
          {stage === 2 && (
            <div className={styles.ascendedCard}>
              <ItemArt item={item} large eager />
              <span>MYSTERY COLLECTION</span>
            </div>
          )}
          <div className={styles.goldSparks} aria-hidden="true">
            {sparks.map((p, i) => (
              <i
                key={i}
                style={{
                  left: p.x + "%",
                  top: p.y + "%",
                  width: p.size,
                  height: p.size,
                  animationDelay: p.delay + "s",
                }}
              />
            ))}
          </div>
        </div>
        <div className={styles.revealCopy} aria-live="polite">
          <h2 id="mystery-title">{stage === 2 ? item.name : "MYSTERY ITEM"}</h2>
          <p>
            {stage === 2
              ? `${cardValue(item).toLocaleString("en-GB")} SPUNK NUGGETS`
              : "The mystery is about to break open."}
          </p>
        </div>
        {stage === 2 && (
          <>
            <p className="micro">✓ SAVED TO YOUR COLLECTION</p>
            <button className="primary full" autoFocus onClick={onClose}>
              Collect mystery item <ArrowUpRight size={18} />
            </button>
          </>
        )}
      </section>
    </div>
  );
}
