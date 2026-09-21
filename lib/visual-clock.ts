// One animation clock for every visible effect. This never touches game RNG.
type Frame = (elapsed: number) => void;
const listeners = new Set<Frame>();
let request = 0;
let previous = 0;

function tick(now: number) {
  const delta = previous ? Math.min((now - previous) / 1000, 0.05) : 0;
  previous = now;
  for (const draw of listeners) draw(delta);
  request = listeners.size ? requestAnimationFrame(tick) : 0;
}

export function animateVisual(draw: Frame) {
  listeners.add(draw);
  if (!request) {
    previous = 0;
    request = requestAnimationFrame(tick);
  }
  return () => {
    listeners.delete(draw);
    if (!listeners.size && request) {
      cancelAnimationFrame(request);
      request = 0;
      previous = 0;
    }
  };
}

export function visualRandom() {
  let seed = crypto.getRandomValues(new Uint32Array(1))[0];
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
