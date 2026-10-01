"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion, whenIdle } from "@/lib/hooks";

/** Paragraph whose words brighten from dim to full color as you scroll through it. */
export function ScrubText({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let ctx: gsap.Context | undefined;
    const cancel = whenIdle(() => {
      ctx = gsap.context(() => {
        gsap.fromTo(
          el.querySelectorAll("span"),
          { color: "#8A9180" },
          {
            color: "#EDEFE8",
            ease: "none",
            stagger: 0.1,
            scrollTrigger: { trigger: el, start: "top 80%", end: "bottom 45%", scrub: true },
          },
        );
      }, el);
    });
    return () => {
      cancel();
      ctx?.revert();
    };
  }, []);

  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((w, i) => (
        <span key={i}>{w}{i < words.length - 1 ? " " : ""}</span>
      ))}
    </p>
  );
}
