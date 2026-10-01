"use client";

import { useEffect, useRef } from "react";
import { stack } from "@/content/site";
import { prefersReducedMotion } from "@/lib/hooks";

const BASE_SPEED = 60; // px per second

/** Infinite tech strip. Scroll velocity speeds it up; scrolling up reverses it. Pauses on hover. */
export function Marquee() {
  const trackRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    const wrap = wrapRef.current;
    if (!track || !wrap || prefersReducedMotion()) return;

    let x = 0;
    let direction = 1;
    let boost = 0;
    let hovered = false;
    let visible = true;
    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;
    let half = track.scrollWidth / 2;

    const ro = new ResizeObserver(() => (half = track.scrollWidth / 2));
    ro.observe(track);
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) {
        lastT = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(wrap);

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (dy !== 0) direction = dy > 0 ? 1 : -1;
      boost = Math.min(boost + Math.abs(dy) * 0.6, 24);
    };
    const onEnter = () => (hovered = true);
    const onLeave = () => (hovered = false);

    function loop(now: number) {
      const dt = Math.min((now - lastT) / 1000, 0.05);
      lastT = now;
      boost *= Math.pow(0.04, dt); // decay toward base speed
      const speed = hovered ? 0 : BASE_SPEED * (1 + boost);
      x -= speed * direction * dt;
      if (half > 0) {
        if (x <= -half) x += half;
        if (x > 0) x -= half;
      }
      track!.style.transform = `translate3d(${x}px,0,0)`;
      if (visible) raf = requestAnimationFrame(loop);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    wrap.addEventListener("mouseenter", onEnter);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      wrap.removeEventListener("mouseenter", onEnter);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  const items = [...stack, ...stack];

  return (
    <section aria-label="Tech stack" className="relative border-y border-line-subtle bg-surface/40 py-6 sm:py-8">
      <ul className="sr-only">
        {stack.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div ref={wrapRef} className="overflow-hidden" aria-hidden="true">
        <div ref={trackRef} className="flex w-max will-change-transform">
          {items.map((s, i) => (
            <span
              key={i}
              className="flex items-center whitespace-nowrap text-[clamp(1.75rem,4.5vw,3.5rem)] font-medium tracking-tight text-text transition-colors hover:text-accent"
            >
              <span className="px-6 sm:px-9">{s}</span>
              <span className="text-accent">*</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
