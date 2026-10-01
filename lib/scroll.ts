"use client";

import type Lenis from "lenis";
import { prefersReducedMotion } from "./hooks";

let lenis: Lenis | null = null;

export const setLenis = (instance: Lenis | null) => {
  lenis = instance;
};
export const getLenis = () => lenis;

export function scrollToTarget(target: string | HTMLElement, onDone?: () => void, offset = 0) {
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  if (target === "#top") {
    if (lenis) lenis.scrollTo(0, { duration: 1.2, onComplete: onDone });
    else {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      onDone?.();
    }
    return;
  }
  if (!el) return;
  // Absolute target from the live DOM, so it never depends on the scroller's cached position.
  const top = Math.max(0, el.getBoundingClientRect().top + window.scrollY + offset);
  if (Math.abs(top - window.scrollY) < 2) {
    onDone?.();
    return;
  }
  if (lenis) {
    lenis.scrollTo(top, { duration: 1.2, onComplete: onDone });
  } else {
    window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
    if (onDone) setTimeout(onDone, prefersReducedMotion() ? 0 : 700);
  }
}

export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop();
    else lenis.start();
  }
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
