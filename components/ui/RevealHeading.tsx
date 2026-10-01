"use client";

import { Fragment, useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion, whenIdle } from "@/lib/hooks";

type Props = {
  text: string;
  as?: "h1" | "h2" | "h3" | "p";
  className?: string;
  /** Words (exact match, punctuation included) to render in the accent color. */
  accentWords?: string[];
  stagger?: number;
  rotate?: boolean;
  id?: string;
};

/** Heading whose words slide up from behind a mask when scrolled into view. */
export function RevealHeading({ text, as: Tag = "h2", className = "", accentWords = [], stagger = 0.06, rotate = false, id }: Props) {
  const ref = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let ctx: gsap.Context | undefined;
    const cancel = whenIdle(() => {
      ctx = gsap.context(() => {
        gsap.fromTo(
          el.querySelectorAll(".rw"),
          { yPercent: 115, rotate: rotate ? 6 : 0 },
          {
            yPercent: 0,
            rotate: 0,
            duration: 1.1,
            ease: "expo.out",
            stagger,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      }, el);
    });
    return () => {
      cancel();
      ctx?.revert();
    };
  }, [stagger, rotate]);

  const words = text.split(" ");
  return (
    <Tag ref={ref} id={id} className={className}>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className="inline-block overflow-hidden pb-[0.12em] -mb-[0.12em] align-bottom">
            <span className={`rw inline-block origin-bottom-left ${accentWords.includes(w) ? "text-accent" : ""}`}>{w}</span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </Tag>
  );
}
