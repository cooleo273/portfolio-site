"use client";

import { useEffect, useRef, useState } from "react";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";

const INTERACTIVE = 'a, button, [role="button"], summary, select, label, [data-magnetic]';

/** Dot + trailing ring. Grows over interactive elements and shows a label for [data-cursor]. */
export function Cursor() {
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!fine) return;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    const mouse = { x: -100, y: -100 };
    const ring = { x: -100, y: -100, s: 1 };
    let targetScale = 1;
    let pressed = false;
    let visible = false;
    let raf = 0;

    let hidden = false;
    const onMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      // Hidden over live gameplay so it never covers the ship.
      const hide = !!(e.target as HTMLElement).closest?.("[data-cursor-hidden]");
      if (hide !== hidden) {
        hidden = hide;
        const v = hide ? "hidden" : "visible";
        dotRef.current?.style.setProperty("visibility", v);
        ringRef.current?.style.setProperty("visibility", v);
      }
      if (!visible) {
        visible = true;
        ring.x = mouse.x;
        ring.y = mouse.y;
        dotRef.current?.style.setProperty("opacity", "1");
        ringRef.current?.style.setProperty("opacity", "1");
      }
    };

    const onOver = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      const labelled = el.closest<HTMLElement>("[data-cursor]");
      const text = labelled?.dataset.cursor || null;
      setLabel(text);
      if (text) targetScale = 2.3;
      else if (el.closest(INTERACTIVE)) targetScale = 1.7;
      else targetScale = 1;
      ringRef.current?.classList.toggle("is-hover", !!text || !!el.closest(INTERACTIVE));
    };

    const onLeave = () => {
      visible = false;
      dotRef.current?.style.setProperty("opacity", "0");
      ringRef.current?.style.setProperty("opacity", "0");
    };
    const onDown = () => (pressed = true);
    const onUp = () => (pressed = false);

    const lerp = reduced ? 1 : 0.18;
    const loop = () => {
      ring.x += (mouse.x - ring.x) * lerp;
      ring.y += (mouse.y - ring.y) * lerp;
      const s = targetScale * (pressed ? 0.8 : 1);
      ring.s += (s - ring.s) * (reduced ? 1 : 0.2);
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${mouse.x}px, ${mouse.y}px, 0) translate(-50%, -50%)`;
      if (ringRef.current)
        ringRef.current.style.transform = `translate3d(${ring.x}px, ${ring.y}px, 0) translate(-50%, -50%) scale(${ring.s})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("mousemove", onMove, { passive: true });
    document.addEventListener("mouseover", onOver, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-cursor");
      window.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseover", onOver);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [fine, reduced]);

  if (!fine) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[250]">
      <div
        ref={ringRef}
        className="cursor-ring absolute left-0 top-0 flex h-9 w-9 items-center justify-center rounded-full border border-accent opacity-0 transition-[background-color,border-color,opacity] duration-200"
        data-label={label ? "true" : undefined}
      >
        <span
          className={`font-mono text-[6px] font-semibold uppercase tracking-[0.12em] text-bg transition-opacity duration-150 ${
            label ? "opacity-100" : "opacity-0"
          }`}
        >
          {label}
        </span>
      </div>
      <div ref={dotRef} className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full bg-accent opacity-0" />
    </div>
  );
}
