"use client";

import { prefersReducedMotion } from "./hooks";

const COLORS = ["#C6F432", "#FF8A5B", "#5BE7FF", "#B69CFF", "#FFD84B"];

/** Minimal canvas confetti burst. No dependencies, cleans itself up. */
export function confetti(count = 160) {
  if (typeof window === "undefined" || prefersReducedMotion()) return;
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "200",
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);

  const pieces = Array.from({ length: count }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 120,
    y: h * 0.6,
    vx: (Math.random() - 0.5) * 900,
    vy: -Math.random() * 900 - 300,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 12,
    s: 5 + Math.random() * 6,
    c: COLORS[(Math.random() * COLORS.length) | 0],
  }));

  let last = performance.now();
  const start = last;
  const tick = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    ctx.clearRect(0, 0, w, h);
    const life = (now - start) / 2600;
    for (const p of pieces) {
      p.vy += 1400 * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.r += p.vr * dt;
      ctx.save();
      ctx.globalAlpha = Math.max(0, 1 - life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (life < 1) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}
