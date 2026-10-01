"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { accents, type AccentName } from "@/content/site";
import { setAccent, useStore } from "@/lib/store";

const NAMES = Object.keys(accents) as AccentName[];

/** Small floating accent switcher, saved to localStorage. */
export function ThemePicker() {
  const accent = useStore((s) => s.accent);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="fixed bottom-4 left-4 z-[55] flex items-center gap-2 sm:bottom-6 sm:left-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="theme-swatches"
        aria-label={`Change accent color, current ${accent}`}
        className="flex h-11 items-center gap-2 rounded-full border border-line bg-surface/90 pl-2 pr-3.5 backdrop-blur-md transition-colors hover:border-accent"
      >
        <span className="h-6 w-6 rounded-full bg-accent" aria-hidden="true" />
        <span className="font-mono text-[11px] text-muted">accent</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="theme-swatches"
            role="group"
            aria-label="Accent colors"
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface/90 p-1.5 backdrop-blur-md"
          >
            {NAMES.map((name) => (
              <button
                key={name}
                type="button"
                aria-label={`Set accent to ${name}`}
                aria-pressed={accent === name}
                onClick={() => setAccent(name)}
                className="group relative flex h-8 w-8 items-center justify-center rounded-full"
              >
                <span
                  className="h-6 w-6 rounded-full transition-transform group-hover:scale-110"
                  style={{ background: accents[name] }}
                />
                {accent === name && (
                  <motion.span
                    layoutId="swatch-ring"
                    className="absolute inset-0 rounded-full border-2 border-text"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
