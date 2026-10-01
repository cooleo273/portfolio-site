"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/hooks";

/** Mono label like "01 / selected work" whose number counts up when it enters the viewport. */
export function SectionLabel({ index, text, className = "" }: { index: number; text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [n, setN] = useState(index);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    setN(0);
    let timer: ReturnType<typeof setInterval> | undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        let i = 0;
        const steps = 12;
        timer = setInterval(() => {
          i++;
          setN(Math.round((index * i) / steps));
          if (i >= steps) clearInterval(timer);
        }, 45);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearInterval(timer);
    };
  }, [index]);

  const pad = (v: number) => String(v).padStart(2, "0");

  return (
    <p ref={ref} className={`label-mono flex items-center gap-2 ${className}`}>
      <span className="sr-only">
        {pad(index)} / {text}
      </span>
      <span aria-hidden="true" className="tabular-nums text-accent">
        {pad(n)}
      </span>
      <span aria-hidden="true">/ {text}</span>
    </p>
  );
}
