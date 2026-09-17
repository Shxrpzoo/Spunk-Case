"use client";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { animateVisual, visualRandom } from "@/lib/visual-clock";
import { MotionCanvas } from "./motion-canvas";
import styles from "./visuals.module.css";

export function PremiumCase({
  satchel,
  opening,
}: {
  satchel: boolean;
  opening: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = root.current!;
    const scene = element.querySelector<HTMLElement>("[data-case-scene]")!;
    const creature = element.querySelector<HTMLElement>("[data-creature]");
    const interference = element.querySelector<HTMLElement>("[data-glitch]");
    const random = visualRandom();
    const between = (a: number, b: number) => a + random() * (b - a);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let visible = false,
      stop: (() => void) | undefined;
    let t = 0,
      x = 0,
      y = 0,
      angle = 0,
      tx = 0,
      ty = 0,
      ta = 0,
      change = 0;
    let glitchAt = between(2, 6),
      glitchUntil = 0;
    element.style.setProperty("--entry-angle", `${between(-9, 9)}deg`);
    element.style.setProperty("--impact-angle", `${between(-3, 3)}deg`);
    element.style.setProperty("--lid-angle", `${between(-23, -15)}deg`);
    element.style.setProperty("--entry-height", `${between(-105, -70)}px`);
    element.style.setProperty("--lid-rise", `${between(-55, -40)}px`);
    element.style.setProperty("--creature-rise", String(between(1.08, 1.14)));
    function update() {
      stop?.();
      stop = undefined;
      if (!visible || document.hidden || reduced.matches) {
        scene.style.transform = "";
        if (creature) creature.style.transform = "";
        if (interference) interference.style.opacity = "0";
        return;
      }
      stop = animateVisual((dt) => {
        t += dt;
        if (t > change) {
          tx = between(-2, 2);
          ty = between(-3, 3);
          ta = between(-0.8, 0.8);
          change = t + between(2.5, 6);
        }
        const smooth = 1 - Math.exp(-dt * 0.65);
        x += (tx - x) * smooth;
        y += (ty - y) * smooth;
        angle += (ta - angle) * smooth;
        if (!opening)
          scene.style.transform = `translate3d(${x}px,${y}px,0) rotate(${angle}deg)`;
        if (creature && !opening)
          creature.style.transform = `scaleY(${1 + y * 0.002})`;
        if (interference) {
          if (t > glitchAt) {
            glitchUntil = t + between(0.08, 0.19);
            glitchAt = t + between(3.5, 9);
            const top = between(54, 76);
            interference.style.clipPath = `polygon(8% ${top}%,94% ${top}%,94% ${top + between(2, 7)}%,8% ${top + between(2, 7)}%)`;
            interference.style.transform = `translateX(${between(-7, 7)}px)`;
          }
          interference.style.opacity = t < glitchUntil ? ".75" : "0";
        }
      });
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    observer.observe(element);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      stop?.();
      observer.disconnect();
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [satchel, opening]);
  const src = `/assets/cases/${satchel ? "satchel-monster" : "basic-military"}.webp`;
  const picture = (className: string) => (
    <Image
      src={src}
      alt=""
      width={1536}
      height={1024}
      sizes="(max-width:600px) 90vw,550px"
      className={className}
      unoptimized
      draggable={false}
    />
  );
  return (
    <div
      ref={root}
      className={`custom-case ${styles.premiumCase} ${satchel ? styles.satchelCase : styles.basicCase} ${opening ? styles.opening : ""}`}
      role="img"
      aria-label={
        satchel
          ? "Semen Satchel: a white goo monster escaping a glitching black satchel"
          : "Spunk Basic: a black military crate leaking glossy white goo"
      }
    >
      <div className={styles.caseAura} />
      <div className={styles.groundShadow} />
      <div className={styles.scene} data-case-scene>
        <div className={styles.innerGlow} />
        <div className={styles.caseBody}>{picture(styles.caseImage)}</div>
        <div
          className={styles.caseTop}
          data-creature={satchel ? "true" : undefined}
        >
          {picture(styles.caseImage)}
        </div>
        {satchel && (
          <div className={styles.glitchSlice} data-glitch>
            {picture(styles.caseImage)}
          </div>
        )}
        <div className={styles.caseFluid}>
          <MotionCanvas kind={satchel ? "SATCHEL" : "BASIC"} />
        </div>
      </div>
      <div className={styles.impactRing} />
    </div>
  );
}
