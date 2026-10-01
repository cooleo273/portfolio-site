"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/hooks";
import { scrollToTarget, setLenis } from "@/lib/scroll";
import { ACCENT_KEY, isAccent, store } from "@/lib/store";

/** Lenis smooth scrolling synced with GSAP ScrollTrigger, plus in-page anchor handling. */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  // Sync the accent that the boot script restored into the store.
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(ACCENT_KEY);
    } catch {}
    if (isAccent(saved)) store.set({ accent: saved });
  }, []);

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, autoRaf: false });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    if (store.get().modalOpen || !store.get().booted) {
      // Preloader or modal currently owns scrolling.
      if (document.documentElement.style.overflow === "hidden") lenis.stop();
    }
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, [reduced]);

  // Route every in-page anchor through the smooth scroller and move focus for keyboard users.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link) return;
      const hash = link.getAttribute("href")!;
      if (hash === "#") return;
      const target = hash === "#top" ? document.body : document.querySelector<HTMLElement>(hash);
      if (!target) return;
      e.preventDefault();
      scrollToTarget(hash);
      if (hash !== "#top") {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
      history.replaceState(null, "", hash === "#top" ? location.pathname : hash);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
