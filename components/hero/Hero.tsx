"use client";

import { useEffect, useRef } from "react";
import { hero, site } from "@/content/site";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/hooks";
import { useStore } from "@/lib/store";
import { startGame } from "@/lib/actions";
import { Magnetic } from "@/components/ui/Magnetic";
import { Terminal } from "@/components/terminal/Terminal";
import { Sticker } from "./Sticker";
import { Spotlight } from "./Spotlight";

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const booted = useStore((s) => s.booted);

  useEffect(() => {
    const el = ref.current;
    if (!booted || !el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ delay: 0.1 });
      tl.to(".hero-char", { yPercent: 0, y: 0, rotate: 0, duration: 1.2, ease: "expo.out", stagger: 0.035 }).to(
        "[data-hero-fade]",
        { opacity: 1, y: 0, duration: 0.9, ease: "expo.out", stagger: 0.08 },
        0.35,
      );
    }, el);
    return () => ctx.kill();
  }, [booted]);

  return (
    <section
      id="top"
      ref={ref}
      data-tint="#0B0D0A"
      aria-labelledby="hero-title"
      className="relative isolate flex min-h-[100svh] items-center overflow-hidden pb-16 pt-28 lg:pt-24"
    >
      <Spotlight />

      <p
        aria-hidden="true"
        data-parallax="0.6"
        className="pointer-events-none absolute right-6 top-24 hidden font-mono text-[11px] text-dim/70 lg:block"
      >
        [ 09.03 N, 38.74 E ]
      </p>

      <div className="container-x grid grid-cols-1 items-center gap-14 lg:grid-cols-[1.12fr_1fr] lg:gap-10 xl:gap-16">
        <div className="relative">
          <p
            data-hero-fade
            className="mb-8 inline-flex items-center gap-2.5 rounded-full border border-line bg-surface/80 py-1.5 pl-3 pr-4 font-mono text-[12px] text-muted"
          >
            <span className="relative flex h-2 w-2" aria-hidden="true">
              <span className="pulse-ring absolute inline-flex h-full w-full rounded-full bg-accent" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            {site.availabilityLabel}
          </p>

          <h1
            id="hero-title"
            aria-label={hero.nameLines.join(" ")}
            className="text-[clamp(3.4rem,16vw,6.5rem)] font-semibold leading-[0.86] tracking-[-0.045em] lg:text-[clamp(5rem,8.2vw,8.75rem)]"
          >
            {hero.nameLines.map((line, li) => (
              <span key={line} aria-hidden="true" className="block overflow-hidden pb-[0.06em]">
                {line.split("").map((ch, ci) => (
                  <span
                    key={ci}
                    className={`hero-char inline-block origin-bottom-left ${li === hero.nameLines.length - 1 ? "text-accent" : ""}`}
                  >
                    {ch}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <div className="absolute -top-2 right-0 sm:right-6 lg:-right-4 lg:top-16">
            <Sticker />
          </div>

          <p className="mt-8 max-w-[34rem] text-[17px] leading-relaxed text-muted sm:text-[19px]">
            {hero.tagline}
          </p>

          <div data-hero-fade className="mt-10 flex flex-wrap items-center gap-3">
            <Magnetic>
              <a
                href={hero.primaryCta.href}
                className="group inline-flex h-14 items-center gap-3 rounded-full bg-accent px-7 text-[16px] font-medium text-bg"
              >
                {hero.primaryCta.label}
                <Arrow className="transition-transform duration-300 group-hover:translate-x-1" />
              </a>
            </Magnetic>
            <Magnetic>
              <button
                type="button"
                onClick={startGame}
                className="inline-flex h-14 items-center gap-3 rounded-full border border-line px-7 text-[16px] font-medium text-text transition-colors hover:border-accent hover:bg-surface"
              >
                <span className="font-mono text-accent" aria-hidden="true">
                  &gt;_
                </span>
                {hero.secondaryCta.label}
              </button>
            </Magnetic>
          </div>
        </div>

        <div data-hero-fade>
          <Terminal />
        </div>
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 items-center gap-3 font-mono text-[11px] text-dim md:flex"
      >
        <span className="relative block h-8 w-px overflow-hidden bg-line">
          <span className="scroll-hint absolute inset-x-0 top-0 h-3 bg-accent" />
        </span>
        scroll
      </div>
    </section>
  );
}

export function Arrow({ className = "" }: { className?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true" className={className}>
      <path d="M3 9h11M10 4.5 14.5 9 10 13.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
