"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BOOT_KEY, store } from "@/lib/store";
import { prefersReducedMotion } from "@/lib/hooks";
import { lockScroll } from "@/lib/scroll";

const LINES = [
  { at: 0, text: "booting leul.dev..." },
  { at: 22, text: "mounting /ui /terminal /game" },
  { at: 48, text: "warming up the deploy ship" },
  { at: 76, text: "linking accent tokens" },
  { at: 100, text: "ready." },
];

/** Short terminal boot sequence. Skipped on repeat visits in the same session. */
export function Preloader() {
  const [visible, setVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (document.documentElement.classList.contains("booted")) {
      setVisible(false);
      store.set({ booted: true });
      return;
    }

    lockScroll(true);
    const duration = prefersReducedMotion() ? 350 : 1500;
    const start = performance.now();
    let raf = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      try {
        sessionStorage.setItem(BOOT_KEY, "1");
      } catch {}
      setVisible(false);
      lockScroll(false);
      store.set({ booted: true });
    };

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // Ease-out with a small stall in the middle so it reads like a real boot.
      const eased = t < 0.55 ? (t / 0.55) * 0.62 : 0.62 + (1 - Math.pow(1 - (t - 0.55) / 0.45, 3)) * 0.38;
      const pct = Math.round(eased * 100);
      // Text + bar update through refs; React only re-renders when a new boot line appears.
      if (pctRef.current) pctRef.current.textContent = `${pct}%`;
      const reached = LINES.filter((l) => pct >= l.at).length;
      setProgress((prev) => (LINES.filter((l) => prev >= l.at).length === reached ? prev : pct));
      if (barRef.current) barRef.current.style.transform = `scaleX(${eased})`;
      if (t < 1) raf = requestAnimationFrame(tick);
      else setTimeout(finish, 260);
    };
    raf = requestAnimationFrame(tick);

    // Allow keyboard users to skip.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="preloader"
          className="preloader fixed inset-0 z-[150] flex items-center justify-center bg-bg px-4"
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
          role="status"
          aria-live="polite"
          aria-label="Loading site"
        >
          <div className="w-full max-w-md font-mono text-[13px] text-muted">
            <ul className="mb-6 space-y-1.5" aria-hidden="true">
              {LINES.filter((l) => progress >= l.at).map((l) => (
                <li key={l.text} className="flex gap-3">
                  <span className="text-accent">&gt;</span>
                  <span className={l.at === 100 ? "text-text" : undefined}>{l.text}</span>
                </li>
              ))}
              {progress < 100 && (
                <li className="flex gap-3">
                  <span className="text-accent">&gt;</span>
                  <span className="blink inline-block h-4 w-2 translate-y-0.5 bg-accent" />
                </li>
              )}
            </ul>
            <div className="flex items-center gap-4">
              <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-line-subtle">
                <div ref={barRef} className="h-full origin-left scale-x-0 bg-accent" />
              </div>
              <span ref={pctRef} className="w-10 text-right tabular-nums text-text">
                0%
              </span>
            </div>
            <p className="mt-6 text-[11px] text-dim">press enter to skip</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
