"use client";

import { useRef } from "react";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealHeading } from "@/components/ui/RevealHeading";
import { useStaggerReveal } from "@/components/ui/useStaggerReveal";
import { ENEMY_DEFS, POWER_DEFS } from "./entities";
import dynamic from "next/dynamic";

// The engine only loads in the browser, off the critical path.
const GameCanvas = dynamic(() => import("./GameCanvas").then((m) => m.GameCanvas), {
  ssr: false,
  loading: () => (
    <div className="w-full" style={{ maxWidth: "min(100%, calc((100svh - 150px) * 0.75))" }}>
      <div className="rounded-[24px] border border-line bg-surface p-2 sm:p-2.5">
        <div className="h-[42px]" />
        <div id="game-frame" className="aspect-[3/4] w-full rounded-[16px] bg-bg" />
      </div>
    </div>
  ),
});
import { useBestScore } from "./useBestScore";
import type { EnemyKind, PowerKind } from "./types";

export function GameSection() {
  const ref = useRef<HTMLDivElement>(null);
  const best = useBestScore();
  useStaggerReveal(ref);

  return (
    <section
      id="play"
      aria-labelledby="play-title"
      data-tint="color-mix(in srgb, #B69CFF 3%, #0B0D0A)"
      className="relative overflow-hidden py-24 sm:py-36"
    >
      <div className="container-x grid grid-cols-1 items-center gap-14 lg:grid-cols-[1fr_auto] lg:gap-16">
        <div ref={ref}>
          <SectionLabel index={4} text="play" className="mb-5" />
          <RevealHeading
            id="play-title"
            text="Ship it to production."
            accentWords={["production."]}
            className="max-w-xl text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.035em]"
          />
          <p data-reveal className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">
            You are the deploy ship. Bugs are falling toward prod. Shoot them down, chain hits for a combo multiplier, and grab
            power-ups. Every fifth wave the Legacy Monolith shows up and throws spaghetti code at you.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
            <div data-reveal>
              <h3 className="label-mono mb-3">threats</h3>
              <ul className="space-y-2">
                {(Object.keys(ENEMY_DEFS) as EnemyKind[]).map((k) => (
                  <li key={k} className="flex items-baseline gap-3 text-[14px]">
                    <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: ENEMY_DEFS[k].color }} aria-hidden="true" />
                    <span className="text-text">{ENEMY_DEFS[k].name}</span>
                    <span className="text-dim">{ENEMY_DEFS[k].blurb}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div data-reveal>
              <h3 className="label-mono mb-3">power-ups</h3>
              <ul className="space-y-2">
                {(Object.keys(POWER_DEFS) as PowerKind[]).map((k) => (
                  <li key={k} className="flex items-baseline gap-3 text-[14px]">
                    <span
                      className="w-7 shrink-0 rounded-full py-px text-center font-mono text-[9px] font-bold text-bg"
                      style={{ background: POWER_DEFS[k].color }}
                      aria-hidden="true"
                    >
                      {POWER_DEFS[k].tag}
                    </span>
                    <span className="text-text">{POWER_DEFS[k].name}</span>
                    <span className="text-dim">{POWER_DEFS[k].blurb}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div data-reveal className="mt-10 inline-flex items-center gap-4 rounded-[18px] border border-line-subtle bg-surface px-5 py-4">
            <span className="label-mono">your best</span>
            <span className="font-mono text-[26px] font-semibold tabular-nums tracking-tight text-accent">
              {best === null ? "------" : String(best).padStart(6, "0")}
            </span>
          </div>
        </div>

        <div className="flex justify-center lg:w-[min(42vw,520px)]">
          <GameCanvas />
        </div>
      </div>
    </section>
  );
}
