"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion, whenIdle } from "@/lib/hooks";

type Item = { period: string; role: string; org: string; note: string };

/** Vertical timeline: the line draws itself with scroll and entries pop in. */
export function Timeline({ items }: { items: Item[] }) {
  const ref = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let ctx: gsap.Context | undefined;
    const cancel = whenIdle(() => {
      ctx = gsap.context(() => {
        gsap.fromTo(
          "[data-tl-line]",
          { scaleY: 0 },
          { scaleY: 1, ease: "none", scrollTrigger: { trigger: el, start: "top 75%", end: "bottom 60%", scrub: true } },
        );
        gsap.utils.toArray<HTMLElement>("[data-tl-item]").forEach((item) => {
          gsap.fromTo(
            item,
            { opacity: 0, y: 30, scale: 0.96 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.8,
              ease: "back.out(1.6)",
              scrollTrigger: { trigger: item, start: "top 82%", once: true },
            },
          );
          gsap.fromTo(
            item.querySelector("[data-tl-dot]"),
            { scale: 0 },
            { scale: 1, duration: 0.5, ease: "back.out(3)", scrollTrigger: { trigger: item, start: "top 75%", once: true } },
          );
        });
      }, el);
    });
    return () => {
      cancel();
      ctx?.revert();
    };
  }, []);

  return (
    <ol ref={ref} className="relative space-y-12 pl-10">
      <span aria-hidden="true" className="absolute bottom-2 left-[7px] top-2 w-px bg-line-subtle" />
      <span aria-hidden="true" data-tl-line className="absolute bottom-2 left-[7px] top-2 w-px origin-top bg-accent" />
      {items.map((it) => (
        <li key={it.role + it.period} data-tl-item className="relative">
          <span
            aria-hidden="true"
            data-tl-dot
            className="absolute -left-10 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-accent bg-bg"
          />
          <p className="mb-2 font-mono text-[12px] text-accent">{it.period}</p>
          <h4 className="text-[22px] font-semibold tracking-tight">{it.role}</h4>
          <p className="mb-2 text-[15px] text-muted">{it.org}</p>
          <p className="max-w-xl text-[15px] leading-relaxed text-dim">{it.note}</p>
        </li>
      ))}
    </ol>
  );
}
