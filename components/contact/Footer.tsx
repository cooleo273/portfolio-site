"use client";

import { site } from "@/content/site";
import { useBestScore } from "@/components/game/useBestScore";

export function Footer() {
  const best = useBestScore();
  return (
    <footer className="border-t border-line-subtle">
      <div className="container-x flex flex-col gap-3 py-8 pb-24 font-mono text-[12px] text-dim sm:flex-row sm:items-center sm:justify-between sm:pb-8">
        <p>
          {site.name}, {site.year}
        </p>
        <p>
          Best Production Defense score: <span className="text-accent">{best === null ? "-" : best.toLocaleString()}</span>
        </p>
        <a href="#top" className="text-muted transition-colors hover:text-accent">
          back to top &uarr;
        </a>
      </div>
    </footer>
  );
}
