"use client";
import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./goon.module.css";

export function GoonCase({ opening = false }: { opening?: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current;
    if (
      !el ||
      opening ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    let timer: ReturnType<typeof setTimeout>;
    let animation: Animation | undefined;
    const wander = () => {
      if (!document.hidden)
        animation = el.animate(
          [
            {
              transform: "translateY(0) rotate(0deg)",
              filter: "brightness(1)",
            },
            {
              transform: `translateY(${-3 - Math.random() * 5}px) rotate(${Math.random() * 1.2 - 0.6}deg)`,
              filter: `brightness(${1.05 + Math.random() * 0.1})`,
            },
            {
              transform: "translateY(0) rotate(0deg)",
              filter: "brightness(1)",
            },
          ],
          { duration: 2500 + Math.random() * 2500, easing: "ease-in-out" },
        );
      timer = setTimeout(wander, 5000 + Math.random() * 3500);
    };
    wander();
    return () => {
      clearTimeout(timer);
      animation?.cancel();
    };
  }, [opening]);
  return (
    <div
      className={`${styles.crate} ${opening ? styles.opening : ""}`}
      aria-label="Purple Goon case with a glowing Triple Chin Tart card"
    >
      <div className={styles.crateHalo} />
      <div ref={root} className={styles.crateArt}>
        <Image
          src="public/cases/goon-case.webp"
          alt="The Return of the Goon case"
          width={1200}
          height={800}
          unoptimized
          priority
          sizes="(max-width:700px) 90vw,600px"
        />
      </div>
      <div className={styles.crateFloor} />
      {opening && <div className={styles.shockwave} />}
    </div>
  );
}
