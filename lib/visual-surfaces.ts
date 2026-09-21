import { visualRandom } from "./visual-clock";

export type SurfaceKind = "SPUNK" | "POO" | "SMEGMA" | "BASIC" | "SATCHEL";
type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

function glow(c: Ctx, x: number, y: number, radius: number, color: string) {
  if (radius <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, color.replace(/[\d.]+\)$/, "0)"));
  c.fillStyle = g;
  c.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function pearl(c: Ctx, x: number, y: number, radius: number, stretch = 1) {
  c.save();
  c.translate(x, y);
  c.scale(1, stretch);
  const g = c.createRadialGradient(
    -radius * 0.35,
    -radius * 0.4,
    radius * 0.08,
    0,
    0,
    radius,
  );
  g.addColorStop(0, "#ffffff");
  g.addColorStop(0.42, "#f3f4ed");
  g.addColorStop(0.78, "#c3d0cf");
  g.addColorStop(1, "#87979b80");
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, radius, 0, TAU);
  c.fill();
  c.fillStyle = "#fff";
  c.beginPath();
  c.ellipse(
    -radius * 0.28,
    -radius * 0.35,
    radius * 0.22,
    radius * 0.12,
    -0.4,
    0,
    TAU,
  );
  c.fill();
  c.restore();
}

function cheese(
  c: Ctx,
  x: number,
  y: number,
  size: number,
  rotation: number,
  alpha: number,
) {
  c.save();
  c.translate(x, y);
  c.rotate(rotation);
  c.scale(size, size);
  c.globalAlpha = alpha;
  c.shadowColor = "#fbbf4660";
  c.shadowBlur = 9;
  c.fillStyle = "#b96719";
  c.beginPath();
  c.moveTo(-0.8, -0.2);
  c.lineTo(0.7, -0.5);
  c.lineTo(0.82, 0.45);
  c.lineTo(-0.7, 0.65);
  c.closePath();
  c.fill();
  c.shadowBlur = 0;
  const g = c.createLinearGradient(-0.7, -0.9, 0.5, 0.5);
  g.addColorStop(0, "#fff2a5");
  g.addColorStop(0.5, "#fcd352");
  g.addColorStop(1, "#dfa332");
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(-0.8, -0.2);
  c.lineTo(0.05, -0.88);
  c.quadraticCurveTo(0.62, -0.7, 0.7, -0.5);
  c.lineTo(0.82, 0.15);
  c.lineTo(-0.7, 0.36);
  c.closePath();
  c.fill();
  c.fillStyle = "#ab671e";
  for (const [px, py, r] of [
    [-0.35, -0.2, 0.13],
    [0.27, -0.4, 0.1],
    [0.42, 0.05, 0.12],
    [-0.2, 0.2, 0.075],
  ]) {
    c.beginPath();
    c.ellipse(px, py, r, r * 0.7, -0.2, 0, TAU);
    c.fill();
    c.strokeStyle = "#ffe99a";
    c.lineWidth = 0.025;
    c.stroke();
  }
  c.strokeStyle = "#fff0a090";
  c.lineWidth = 0.035;
  c.beginPath();
  c.moveTo(-0.73, -0.22);
  c.lineTo(0.03, -0.82);
  c.stroke();
  c.restore();
}

function fly(
  c: Ctx,
  x: number,
  y: number,
  size: number,
  angle: number,
  t: number,
) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.scale(size, size);
  // Translucent wings, segmented body, six legs and ruby eyes; no emoji sprites.
  c.strokeStyle = "#172013d9";
  c.lineWidth = 0.45;
  for (let n = 0; n < 3; n++) {
    c.beginPath();
    c.moveTo(n - 1, 0);
    c.lineTo(n - 1.8, -2.5);
    c.moveTo(n - 1, 0);
    c.lineTo(n - 1.8, 2.5);
    c.stroke();
  }
  c.fillStyle = "#e7f1e784";
  c.beginPath();
  c.ellipse(-0.5, -1.55, 2.7, 1.2 + Math.sin(t * 72) * 0.25, -0.6, 0, TAU);
  c.fill();
  c.beginPath();
  c.ellipse(-0.5, 1.55, 2.7, 1.2 + Math.cos(t * 85) * 0.25, 0.6, 0, TAU);
  c.fill();
  c.fillStyle = "#142f21";
  c.beginPath();
  c.ellipse(-0.6, 0, 2, 1.05, 0, 0, TAU);
  c.fill();
  c.fillStyle = "#070b08";
  c.beginPath();
  c.ellipse(1.2, 0, 1.2, 1, 0, 0, TAU);
  c.fill();
  c.fillStyle = "#8d382a";
  c.beginPath();
  c.arc(1.6, -0.6, 0.44, 0, TAU);
  c.arc(1.6, 0.6, 0.44, 0, TAU);
  c.fill();
  c.strokeStyle = "#73a79a";
  c.lineWidth = 0.32;
  c.beginPath();
  c.moveTo(-1.7, -0.4);
  c.lineTo(0.3, -0.45);
  c.stroke();
  c.restore();
}

// Every instance gets its own random state. Birth times, paths, velocity changes,
// surface lengths and glitch events are sampled as they happen, never looped.
export function createSurface(kind: SurfaceKind) {
  const random = visualRandom();
  const range = (min: number, max: number) => min + random() * (max - min);
  const isCase = kind === "BASIC" || kind === "SATCHEL";
  const drops = Array.from({ length: isCase ? 12 : 15 }, (_, i) => ({
    x: range(0.04, 0.96),
    y: range(0.04, 0.8),
    width: range(0.007, 0.018),
    age: range(-4, 8),
    life: range(6, 14),
    length: range(0.035, 0.18),
    fall: 0,
    velocity: 0,
    side: i % 3,
    origin: range(0.38, 0.64),
  }));
  const motes = Array.from({ length: kind === "POO" ? 25 : 42 }, () => ({
    x: random(),
    y: random(),
    age: range(0, 10),
    life: range(8, 20),
    radius: range(0.006, 0.025),
    speed: range(0.006, 0.024),
    phase: range(0, TAU),
  }));
  const flies = Array.from({ length: 6 }, () => ({
    x: random(),
    y: range(0.08, 0.65),
    vx: 0,
    vy: 0,
    tx: random(),
    ty: range(0.1, 0.7),
    next: range(0, 2),
    size: range(0.85, 1.2),
  }));
  const pieces = Array.from({ length: 9 }, (_, i) => ({
    angle: (i * TAU) / 9 + range(-0.12, 0.12),
    speed: range(0.13, 0.22),
    target: range(0.13, 0.22),
    next: range(2, 10),
    tilt: range(-0.6, 0.6),
    size: range(0.027, 0.045),
  }));
  let glitchAt = range(2, 5),
    glitchEnd = 0,
    glitchY = 0.6,
    glitchOffset = 0;
  let shineX = range(-0.8, 1),
    shineTarget = range(1.2, 2),
    shineSpeed = range(0.018, 0.04);

  return (c: Ctx, w: number, h: number, t: number, dt: number) => {
    c.save();
    const unit = Math.min(w, h);

    if (kind === "SPUNK" || isCase) {
      if (!isCase) {
        // A wet, rounded shell across all four edges of the card.
        const g = c.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, "#ffffffff");
        g.addColorStop(0.22, "#c5d5d7b0");
        g.addColorStop(0.53, "#f4fff152");
        g.addColorStop(1, "#eef4dfc0");
        c.strokeStyle = g;
        c.lineWidth = 7;
        c.beginPath();
        c.roundRect(2, 2, w - 4, h - 4, 13);
        c.stroke();
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(0, 0);
        c.lineTo(w, 0);
        c.lineTo(w, 10);
        for (let x = w; x >= 0; x -= 5)
          c.lineTo(
            x,
            9 + Math.sin(x * 0.051 + t * 0.09) * 3 + Math.sin(x * 0.109) * 2,
          );
        c.closePath();
        c.fill();
        const sheen = c.createLinearGradient(0, 0, w, 0);
        shineX += dt * shineSpeed;
        if (shineX > shineTarget) {
          shineX = range(-2, -1);
          shineTarget = range(1.2, 2);
          shineSpeed = range(0.018, 0.04);
        }
        const pos = clamp(shineX, 0, 1);
        sheen.addColorStop(0, "#eefeff00");
        sheen.addColorStop(Math.max(0, pos - 0.12), "#eefeff00");
        sheen.addColorStop(pos, "#eefeff15");
        sheen.addColorStop(Math.min(1, pos + 0.12), "#eefeff00");
        sheen.addColorStop(1, "#eefeff00");
        c.fillStyle = sheen;
        c.fillRect(0, 0, w, h);
        // Bottom meniscus and trapped bubbles.
        c.fillStyle = "#e3eeed48";
        c.beginPath();
        c.moveTo(0, h);
        for (let x = 0; x <= w; x += 5)
          c.lineTo(x, h - 5 - (Math.sin(x * 0.07 + t * 0.08) + 1) * 2);
        c.lineTo(w, h);
        c.fill();
      }
      for (const d of drops) {
        d.age += dt;
        if (d.age > d.life + 3) {
          d.age = range(-5, -1);
          d.life = range(5, 15);
          d.x = range(0.06, 0.94);
          d.length = range(0.035, 0.16);
          d.width = range(0.005, 0.015);
          d.fall = 0;
          d.velocity = 0;
          d.origin = range(0.39, 0.61);
        }
        if (d.age < 0) continue;
        const growth = Math.min(d.age / d.life, 1);
        const radius = w * d.width;
        const x = isCase
          ? w * (0.16 + d.x * 0.66)
          : d.side === 0
            ? radius * 0.7
            : d.side === 1
              ? w - radius * 0.7
              : w * d.x;
        const start = isCase ? h * d.origin : d.side === 2 ? 7 : h * d.y;
        const length = h * d.length * (0.2 + growth * 0.8);
        if (growth >= 1) {
          d.velocity += dt * 0.22;
          d.fall += dt * d.velocity;
        }
        if (d.fall === 0) {
          const g = c.createLinearGradient(x - radius, 0, x + radius, 0);
          g.addColorStop(0, "#82999c88");
          g.addColorStop(0.25, "#e1e9e5");
          g.addColorStop(0.52, "#fffef9");
          g.addColorStop(1, "#b0c0bf9a");
          c.fillStyle = g;
          c.beginPath();
          c.moveTo(x - radius * 1.3, start);
          c.bezierCurveTo(
            x - radius * 0.15,
            start + length * 0.3,
            x - radius,
            start + length * 0.8,
            x - radius,
            start + length,
          );
          c.bezierCurveTo(
            x - radius,
            start + length + radius * 1.4,
            x + radius,
            start + length + radius * 1.4,
            x + radius,
            start + length,
          );
          c.bezierCurveTo(
            x + radius,
            start + length * 0.7,
            x + radius * 0.12,
            start + length * 0.25,
            x + radius * 1.3,
            start,
          );
          c.fill();
          c.strokeStyle = "#ffffffa8";
          c.lineWidth = Math.max(0.65, radius * 0.19);
          c.beginPath();
          c.moveTo(x - radius * 0.35, start + length * 0.25);
          c.quadraticCurveTo(
            x - radius * 0.24,
            start + length * 0.7,
            x - radius * 0.45,
            start + length,
          );
          c.stroke();
        } else {
          const y = start + length + d.fall * h;
          if (y < h * 0.98) pearl(c, x, y, radius, 1 + d.velocity * 3);
          else if (y < h * 1.12) {
            c.globalAlpha = clamp(1 - (y / h - 0.98) * 8, 0, 1);
            c.strokeStyle = "#e6efdeb0";
            c.lineWidth = 1.3;
            c.beginPath();
            c.ellipse(
              x,
              h * 0.975,
              4 + (y - h * 0.98) * 1.2,
              1 + (y - h * 0.98) * 0.22,
              0,
              0,
              TAU,
            );
            c.stroke();
            c.globalAlpha = 1;
          }
        }
      }
    }

    if (kind === "POO") {
      // Slow, layered gas plumes drift through the entire card, denser at its edges.
      for (const m of motes) {
        m.age += dt;
        m.y -= dt * m.speed;
        if (m.y < -0.2 || m.age > m.life) {
          m.y = range(0.75, 1.2);
          m.x = random();
          m.age = 0;
          m.life = range(9, 20);
          m.phase = range(0, TAU);
        }
        const opacity = Math.sin(clamp(m.age / m.life, 0, 1) * Math.PI) * 0.13;
        const x = (m.x + Math.sin(t * 0.21 + m.phase) * 0.045) * w;
        glow(
          c,
          x,
          m.y * h,
          w * (0.16 + m.radius * 3),
          `rgba(146,184,39,${opacity})`,
        );
      }
      const edge = c.createLinearGradient(0, 0, w, 0);
      edge.addColorStop(0, "#92ba3150");
      edge.addColorStop(0.18, "#6a8b1700");
      edge.addColorStop(0.82, "#6a8b1700");
      edge.addColorStop(1, "#92ba3145");
      c.fillStyle = edge;
      c.fillRect(0, 0, w, h);
      for (let i = 0; i < 20; i++) {
        const x = ((i * 0.6180339) % 1) * w;
        const y = h - 4 - ((i * 19) % 36);
        c.strokeStyle = "#bfd55c66";
        c.fillStyle = "#859e3129";
        c.lineWidth = 0.7;
        c.beginPath();
        c.arc(x, y, 1.2 + (i % 4), 0, TAU);
        c.fill();
        c.stroke();
      }
      for (const f of flies) {
        if (t > f.next) {
          f.tx = range(0.06, 0.94);
          f.ty = range(0.04, 0.83);
          f.next = t + range(0.7, 2.5);
        }
        f.vx += ((f.tx - f.x) * 2.8 - f.vx * 2.1) * dt;
        f.vy += ((f.ty - f.y) * 2.8 - f.vy * 2.1) * dt;
        f.x = clamp(f.x + f.vx * dt, 0.025, 0.975);
        f.y = clamp(f.y + f.vy * dt, 0.02, 0.9);
        fly(
          c,
          f.x * w,
          f.y * h,
          Math.max(1, unit * 0.009) * f.size,
          Math.atan2(f.vy * h, f.vx * w),
          t,
        );
      }
    }

    if (kind === "SMEGMA") {
      const cx = w * 0.5,
        cy = h * 0.35;
      glow(c, cx, cy, w * 0.66, "rgba(237,177,34,0.09)");
      // Tilted orbital plane: back arc is subdued; front arc has depth and bloom.
      c.save();
      c.translate(cx, cy);
      c.rotate(-0.33 + Math.sin(t * 0.047) * 0.06);
      for (let n = 0; n < 5; n++) {
        c.strokeStyle = n === 2 ? "#ffe6a185" : "#dfb34528";
        c.lineWidth = n === 2 ? 1.5 : 0.6;
        c.beginPath();
        c.ellipse(
          0,
          0,
          w * (0.49 + n * 0.014),
          h * (0.13 + n * 0.006),
          0,
          0,
          TAU,
        );
        c.stroke();
      }
      for (const p of pieces) {
        if (t > p.next) {
          p.target = range(0.1, 0.25);
          p.next = t + range(4, 13);
        }
        p.speed += (p.target - p.speed) * Math.min(dt * 0.3, 1);
        p.angle += p.speed * dt;
        const depth = (Math.sin(p.angle) + 1) / 2;
        cheese(
          c,
          Math.cos(p.angle) * w * 0.54,
          Math.sin(p.angle) * h * 0.157,
          w * p.size * (0.65 + depth * 0.55),
          p.tilt + p.angle * 0.37,
          0.35 + depth * 0.65,
        );
      }
      c.restore();
      for (const m of motes) {
        m.age += dt;
        m.y -= dt * m.speed * 0.7;
        if (m.y < -0.05 || m.age > m.life) {
          m.y = range(0.85, 1.1);
          m.x = random();
          m.age = 0;
          m.life = range(5, 18);
        }
        const a = Math.sin(clamp(m.age / m.life, 0, 1) * Math.PI);
        const x = (m.x + Math.sin(t * 0.15 + m.phase) * 0.035) * w;
        const y = m.y * h;
        c.globalAlpha = a * 0.8;
        c.fillStyle = "#ffe9aa";
        c.beginPath();
        c.arc(x, y, Math.max(0.5, m.radius * w * 0.17), 0, TAU);
        c.fill();
        if (m.radius > 0.021) {
          glow(c, x, y, w * 0.035, "rgba(255,221,140,0.3)");
          c.fillRect(x - 2.5, y - 0.35, 5, 0.7);
          c.fillRect(x - 0.35, y - 2.5, 0.7, 5);
        }
        c.globalAlpha = 1;
      }
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#fff0baba");
      g.addColorStop(0.33, "#bf832145");
      g.addColorStop(0.7, "#fce997cc");
      g.addColorStop(1, "#ca8c2e70");
      c.strokeStyle = g;
      c.lineWidth = 2;
      c.beginPath();
      c.roundRect(3, 3, w - 6, h - 6, 11);
      c.stroke();
    }

    if (kind === "SATCHEL") {
      if (t > glitchAt) {
        glitchEnd = t + range(0.09, 0.2);
        glitchAt = t + range(2.4, 8.5);
        glitchY = range(0.56, 0.82);
        glitchOffset = range(-0.1, 0.1);
      }
      if (t < glitchEnd) {
        // Brief, irregular interference concentrated around the black bag.
        c.fillStyle = "#63efe580";
        c.fillRect(w * (0.2 + glitchOffset), h * glitchY, w * 0.58, 1.2);
        c.fillStyle = "#c581ff65";
        c.fillRect(
          w * (0.23 - glitchOffset),
          h * (glitchY + 0.018),
          w * 0.4,
          2,
        );
        for (let i = 0; i < 6; i++) {
          c.fillStyle = i % 2 ? "#f0fcfa55" : "#b772eb44";
          c.fillRect(
            w * (0.2 + i * 0.1 + glitchOffset),
            h * glitchY - i * 4,
            w * 0.035,
            1.5,
          );
        }
      }
    }
    c.restore();
  };
}
