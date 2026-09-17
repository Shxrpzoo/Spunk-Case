"use client";
import { useEffect, useRef } from "react";
import { animateVisual } from "@/lib/visual-clock";
import { createSurface, type SurfaceKind } from "@/lib/visual-surfaces";
import styles from "./visuals.module.css";

export function MotionCanvas({ kind }: { kind: SurfaceKind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;
    const render = createSurface(kind);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0,
      height = 0,
      time = 0,
      visible = false;
    let stop: (() => void) | undefined;
    function paint(dt: number) {
      if (!width || !height) return;
      time += dt;
      ctx!.clearRect(0, 0, width, height);
      render(ctx!, width, height, time, dt);
    }
    function update() {
      stop?.();
      stop = undefined;
      if (visible && !document.hidden) {
        paint(0);
        if (!reduced.matches) stop = animateVisual(paint);
      }
    }
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(devicePixelRatio || 1, 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (visible) paint(0);
    });
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      update();
    });
    resize.observe(canvas);
    observer.observe(canvas);
    reduced.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      stop?.();
      resize.disconnect();
      observer.disconnect();
      reduced.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [kind]);
  return (
    <canvas
      ref={ref}
      className={styles.canvas}
      data-surface={kind}
      aria-hidden="true"
    />
  );
}
