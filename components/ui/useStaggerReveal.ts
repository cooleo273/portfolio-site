"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion, whenIdle } from "@/lib/hooks";

/** Staggered fade-up for every `[data-reveal]` element inside `ref` as it enters the viewport. */
export function useStaggerReveal(ref: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    let ctx: gsap.Context | undefined;
    const cancel = whenIdle(() => {
      ctx = gsap.context(() => {
        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]", root);
        if (!items.length) return;
        gsap.set(items, { opacity: 0, y: 40 });
        ScrollTrigger.batch(items, {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.08, overwrite: true }),
        });
      }, root);
    });
    return () => {
      cancel();
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
