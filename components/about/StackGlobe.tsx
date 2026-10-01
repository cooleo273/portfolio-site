"use client";

import { useEffect, useRef } from "react";
import { stack } from "@/content/site";
import { prefersReducedMotion } from "@/lib/hooks";
import { getAccentHex } from "@/lib/store";

/**
 * Tech stack laid out on a sphere and projected in JS, so text stays crisp HTML (no WebGL).
 * A dotted globe is drawn on a 2D canvas behind the labels with the same rotation.
 * Spins slowly, can be dragged with inertia, and only animates while on screen.
 */
export function StackGlobe() {
  const ref = useRef<HTMLUListElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = ref.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;
    const ctx = canvas.getContext("2d")!;
    // Dense Fibonacci point cloud for the globe surface.
    const DOTS = 520;
    const dots = Array.from({ length: DOTS }, (_, i) => {
      const y = 1 - (i / (DOTS - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
    });
    const items = Array.from(el.querySelectorAll<HTMLLIElement>("li"));
    const n = items.length;
    // Fibonacci sphere: evenly spread points.
    const points = items.map((_, i) => {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const theta = i * Math.PI * (3 - Math.sqrt(5));
      return { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r };
    });

    const reduced = prefersReducedMotion();
    let rotY = 0.6;
    let rotX = -0.25;
    let velY = reduced ? 0 : 0.25;
    let velX = 0;
    let dragging = false;
    let last = { x: 0, y: 0, t: 0 };
    let raf = 0;
    let visible = false;
    let prev = performance.now();

    // Cached so the per-frame draw never forces a layout read.
    let radius = el.clientWidth * 0.38;
    let size = el.clientWidth;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const ro = new ResizeObserver(() => {
      size = el.clientWidth;
      radius = size * 0.38;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      draw();
    });
    ro.observe(el);

    const draw = () => {
      const cy = Math.cos(rotY), sy = Math.sin(rotY), cx = Math.cos(rotX), sx = Math.sin(rotX);

      // Globe: back dots faint, front dots brighter and tinted with the accent.
      const accent = getAccentHex();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const half = size / 2;
      const glow = ctx.createRadialGradient(half, half, 0, half, half, radius * 1.15);
      glow.addColorStop(0, accent + "14");
      glow.addColorStop(1, accent + "00");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, size, size);
      for (const d of dots) {
        const x1 = d.x * cy - d.z * sy;
        const z1 = d.x * sy + d.z * cy;
        const y2 = d.y * cx - z1 * sx;
        const z2 = d.y * sx + z1 * cx;
        const depth = (z2 + 1) / 2;
        ctx.globalAlpha = 0.08 + depth * depth * 0.75;
        ctx.fillStyle = depth > 0.72 ? accent : "#8A9180";
        const r = 0.6 + depth * 1.1;
        ctx.beginPath();
        ctx.arc(half + x1 * radius * 0.98, half + y2 * radius * 0.98, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      points.forEach((p, i) => {
        const x1 = p.x * cy - p.z * sy;
        const z1 = p.x * sy + p.z * cy;
        const y2 = p.y * cx - z1 * sx;
        const z2 = p.y * sx + z1 * cx;
        const depth = (z2 + 1) / 2; // 0 back, 1 front
        const scale = 0.58 + depth * 0.52;
        const s = items[i].style;
        s.transform = `translate3d(${(x1 * radius).toFixed(1)}px, ${(y2 * radius).toFixed(1)}px, 0) translate(-50%, -50%) scale(${scale.toFixed(3)})`;
        // Depth is shown with color, not opacity, so every label keeps AA contrast (dim #8A9180 -> text #EDEFE8).
        s.color = `rgb(${Math.round(138 + depth * 99)}, ${Math.round(145 + depth * 94)}, ${Math.round(128 + depth * 104)})`;
        s.borderColor = depth > 0.82 ? accent : depth > 0.6 ? "#2A3124" : "#1F241B";
        s.zIndex = String(Math.round(depth * 100));
      });
    };

    const tick = (now: number) => {
      const dt = Math.min((now - prev) / 1000, 0.05);
      prev = now;
      if (!dragging) {
        // Ease back toward a slow idle spin.
        const idle = reduced ? 0 : 0.25;
        velY += (idle - velY) * Math.min(1, dt * 1.5);
        velX += (0 - velX) * Math.min(1, dt * 2);
        rotY += velY * dt;
        rotX = Math.max(-1.1, Math.min(1.1, rotX + velX * dt));
      }
      draw();
      if (visible) raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        prev = performance.now();
        raf = requestAnimationFrame(tick);
      }
    });
    io.observe(el);

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return; // touch keeps scrolling the page
      dragging = true;
      last = { x: e.clientX, y: e.clientY, t: performance.now() };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dt = Math.max((now - last.t) / 1000, 0.001);
      const dx = (e.clientX - last.x) * 0.008;
      const dy = (e.clientY - last.y) * 0.008;
      rotY += dx;
      rotX = Math.max(-1.1, Math.min(1.1, rotX - dy));
      velY = dx / dt;
      velX = -dy / dt;
      last = { x: e.clientX, y: e.clientY, t: now };
      if (!visible) draw();
    };
    const onUp = () => (dragging = false);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    draw();

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
      <ul
        ref={ref}
        aria-label="Tech stack"
        className="absolute inset-0 cursor-grab select-none active:cursor-grabbing"
        data-cursor="drag"
      >
        {stack.map((s) => (
          <li
            key={s}
            className="absolute left-1/2 top-1/2 whitespace-nowrap rounded-full border border-line bg-surface px-3 py-1 font-mono text-[12px] text-text"
          >
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
