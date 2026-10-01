"use client";

import { useEffect } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion, whenIdle } from "@/lib/hooks";

/**
 * Page-wide scroll effects that are driven by data attributes:
 * - [data-tint="<css color>"] on sections shifts the background tint
 * - [data-parallax="<speed>"] on decorative elements adds subtle parallax
 */
export function ScrollEffects() {
  const reduced = useReducedMotion();

  useEffect(() => {
    const layer = document.getElementById("bg-tint");
    let ctx: gsap.Context | undefined;
    const cancel = whenIdle(() => {
      ctx = gsap.context(() => {
        document.querySelectorAll<HTMLElement>("[data-tint]").forEach((section) => {
          ScrollTrigger.create({
            trigger: section,
            start: "top 55%",
            end: "bottom 55%",
            onToggle: (self) => {
              if (self.isActive && layer) layer.style.setProperty("--tint", section.dataset.tint!);
            },
          });
        });

        if (!reduced) {
          document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
            const speed = parseFloat(el.dataset.parallax || "0.2");
            gsap.fromTo(
              el,
              { yPercent: speed * 50 },
              {
                yPercent: -speed * 50,
                ease: "none",
                scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true },
              },
            );
          });
        }
      });
    }, 2000);

    // GSAP refreshes on window load; webfonts that land later can still shift layout.
    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled && document.readyState === "complete") ScrollTrigger.refresh();
    });
    return () => {
      cancelled = true;
      cancel();
      ctx?.revert();
    };
  }, [reduced]);

  return null;
}
