"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/hooks";

/** Soft radial light in the accent color that trails the mouse across the hero. */
export function Spotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const section = el?.parentElement;
    if (!el || !section) return;

    const place = (x: number, y: number) => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
    };
    const rect0 = section.getBoundingClientRect();
    const pos = { x: rect0.width * 0.3, y: rect0.height * 0.45 };
    const target = { ...pos };
    place(pos.x, pos.y);

    if (prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return;

    let raf = 0;
    let running = false;
    const loop = () => {
      pos.x += (target.x - pos.x) * 0.08;
      pos.y += (target.y - pos.y) * 0.08;
      place(pos.x, pos.y);
      if (Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.5) raf = requestAnimationFrame(loop);
      else running = false;
    };
    const onMove = (e: PointerEvent) => {
      const r = section.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      target.x = e.clientX - r.left;
      target.y = e.clientY - r.top;
      if (!running) {
        running = true;
        raf = requestAnimationFrame(loop);
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        ref={ref}
        className="absolute left-0 top-0 h-[720px] w-[720px] rounded-full will-change-transform"
        style={{ background: "radial-gradient(circle, color-mix(in srgb, var(--accent) 13%, transparent) 0%, transparent 62%)" }}
      />
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(var(--color-line) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse 70% 60% at 40% 45%, black 20%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 40% 45%, black 20%, transparent 75%)",
        }}
      />
    </div>
  );
}
