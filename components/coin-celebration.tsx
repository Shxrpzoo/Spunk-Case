"use client";
import { useEffect, useRef } from "react";
import styles from "./coin.module.css";
export function CoinCelebration({ won }: { won: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = canvas.current,
      ctx = el?.getContext("2d");
    if (!el || !ctx || matchMedia("(prefers-reduced-motion: reduce)").matches)
      return;
    const { width: w, height: h } = el.getBoundingClientRect(),
      dpr = Math.min(devicePixelRatio, 2);
    el.width = w * dpr;
    el.height = h * dpr;
    ctx.scale(dpr, dpr);
    const colors = ["#f9df83", "#d7ff83", "#ffffff", "#bf97ff", "#ffc3d2"];
    const particles = Array.from({ length: won ? 120 : 95 }, () => ({
      x: won ? w * 0.5 : Math.random() * w,
      y: won ? h * 0.46 : h + Math.random() * 100,
      vx: (Math.random() - 0.5) * (won ? 400 : 60),
      vy: won ? -150 - Math.random() * 260 : -45 - Math.random() * 95,
      size: won ? 3 + Math.random() * 6 : 12 + Math.random() * 32,
      phase: Math.random() * 6.28,
      turn: Math.random() * 7 - 3.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * (won ? 0.3 : 1.6),
    }));
    let frame = 0,
      start = performance.now(),
      previous = start;
    const draw = (now: number) => {
      const t = (now - start) / 1000,
        dt = Math.min((now - previous) / 1000, 0.04);
      previous = now;
      ctx.clearRect(0, 0, w, h);
      if (t > 5.5 || document.hidden) return;
      if (!won) {
        const glow = ctx.createRadialGradient(
          w * 0.5,
          h,
          10,
          w * 0.5,
          h,
          w * 0.7,
        );
        glow.addColorStop(
          0,
          `rgba(255,69,0,${Math.max(0, 0.32 * (1 - t / 5.5))})`,
        );
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }
      for (const p of particles) {
        const age = t - p.delay;
        if (age < 0) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        ctx.save();
        if (won) {
          p.vy += 110 * dt;
          p.vx *= Math.pow(0.82, dt);
          ctx.globalAlpha = Math.max(0, Math.min(1, (5 - t) / 1.3));
          ctx.translate(p.x + Math.sin(age * 3 + p.phase) * 12, p.y);
          ctx.rotate(p.phase + age * p.turn);
          ctx.scale(Math.cos(age * 4 + p.phase), 1);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 1.6);
        } else {
          const fade = Math.max(0, 1 - age / 3.8),
            r = p.size * fade;
          if (r > 0) {
            ctx.globalCompositeOperation = "screen";
            ctx.globalAlpha = fade * 0.64;
            const x = p.x + Math.sin(age * 2 + p.phase) * age * 12,
              y = p.y;
            ctx.translate(x, y);
            ctx.scale(0.75, 1.8);
            const plume = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            plume.addColorStop(0, "#fff0a3");
            plume.addColorStop(0.22, "#ffb13c");
            plume.addColorStop(0.55, "#e7401266");
            plume.addColorStop(1, "transparent");
            ctx.fillStyle = plume;
            ctx.fillRect(-r, -r, r * 2, r * 2);
          }
        }
        ctx.restore();
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [won]);
  return (
    <canvas
      ref={canvas}
      className={styles.celebration}
      data-celebration={won ? "confetti" : "fire"}
      aria-hidden="true"
    />
  );
}
