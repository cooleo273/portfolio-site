"use client";

import { useEffect, useRef } from "react";
import { about } from "@/content/site";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion, whenIdle } from "@/lib/hooks";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealHeading } from "@/components/ui/RevealHeading";
import { ScrubText } from "./ScrubText";
import { Counter } from "./Counter";
import { Timeline } from "./Timeline";
import { StackGlobe } from "./StackGlobe";

const CARD_ACCENTS = ["var(--accent)", "#5BE7FF"];

export function About() {
  const cardsRef = useRef<HTMLDivElement>(null);

  // Cards slide in from opposite sides, scrubbed to scroll.
  useEffect(() => {
    const el = cardsRef.current;
    if (!el || prefersReducedMotion()) return;
    let ctx: gsap.Context | undefined;
    const cancel = whenIdle(() => {
      ctx = gsap.context(() => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-about-card]");
        cards.forEach((card, i) => {
          const dir = i % 2 === 0 ? -1 : 1;
          gsap.fromTo(
            card,
            { xPercent: dir * 22, opacity: 0, rotate: dir * 2 },
            {
              xPercent: 0,
              opacity: 1,
              rotate: 0,
              ease: "power2.out",
              scrollTrigger: { trigger: el, start: "top 92%", end: "top 45%", scrub: 0.6 },
            },
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
    <section
      id="about"
      aria-labelledby="about-title"
      data-tint="color-mix(in srgb, #5BE7FF 2.5%, #0B0D0A)"
      className="relative overflow-hidden py-24 sm:py-36"
    >
      <div className="container-x">
        <SectionLabel index={2} text="about / what I do" className="mb-5" />
        <RevealHeading
          id="about-title"
          text="Two ways I ship."
          accentWords={["ship."]}
          className="mb-12 max-w-3xl text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.035em] sm:mb-16"
        />

        <div ref={cardsRef} className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {about.cards.map((card, i) => (
            <article
              key={card.title}
              data-about-card
              className="relative overflow-hidden rounded-[24px] border border-line-subtle bg-surface p-7 sm:p-10"
            >
              <span
                aria-hidden="true"
                data-parallax="0.5"
                className="pointer-events-none absolute -right-6 -top-8 font-mono text-[9rem] font-bold leading-none opacity-[0.07]"
                style={{ color: CARD_ACCENTS[i] }}
              >
                {i === 0 ? "{}" : "</>"}
              </span>
              <p className="mb-6 font-mono text-[12px]" style={{ color: CARD_ACCENTS[i] }}>
                0{i + 1}
              </p>
              <h3 className="mb-4 max-w-sm text-[clamp(1.75rem,3.4vw,2.5rem)] font-semibold leading-[1.02] tracking-tight">{card.title}</h3>
              <p className="mb-8 max-w-md text-[16px] leading-relaxed text-muted">{card.body}</p>
              <ul className="space-y-2.5 border-t border-line-subtle pt-6">
                {card.points.map((pt) => (
                  <li key={pt} className="flex items-center gap-3 font-mono text-[13px] text-text">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: CARD_ACCENTS[i] }} aria-hidden="true" />
                    {pt}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-24 grid grid-cols-1 items-center gap-14 sm:mt-36 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <p className="label-mono mb-4">bio / stack</p>
            <StackGlobe />
          </div>
          <ScrubText
            text={about.bio}
            className="text-[clamp(1.5rem,3.2vw,2.6rem)] font-medium leading-[1.22] tracking-[-0.02em]"
          />
        </div>

        <dl className="mt-20 grid grid-cols-1 gap-px overflow-hidden rounded-[24px] border border-line-subtle bg-line-subtle sm:mt-28 sm:grid-cols-3">
          {about.stats.map((s) => (
            <div key={s.label} className="bg-bg p-7 sm:p-9">
              <dt className="label-mono mb-3">{s.label}</dt>
              <dd className="font-mono text-[clamp(3rem,7vw,5.5rem)] font-semibold leading-none tracking-tighter text-text">
                <Counter value={s.value} />
                <span className="text-accent">{s.suffix}</span>
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-24 grid grid-cols-1 gap-10 sm:mt-36 lg:grid-cols-[1fr_2.2fr]">
          <div>
            <p className="label-mono mb-4">experience</p>
            <h3 className="text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-tight tracking-tight">Where I&apos;ve been.</h3>
          </div>
          <Timeline items={about.timeline} />
        </div>
      </div>
    </section>
  );
}
