"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { hero } from "@/content/site";
import { useReducedMotion } from "@/lib/hooks";

/** Round sticker: click to cycle messages, drag it around, it springs back on release. */
export function Sticker() {
  const [index, setIndex] = useState(0);
  const dragged = useRef(false);
  const reduced = useReducedMotion();
  const message = hero.stickerMessages[index];

  return (
    <div data-hero-fade className="float-y">
      <motion.button
        type="button"
        drag={!reduced}
        dragSnapToOrigin
        dragElastic={0.55}
        dragTransition={{ bounceStiffness: 380, bounceDamping: 14 }}
        whileDrag={{ scale: 1.08, rotate: -8 }}
        whileHover={reduced ? undefined : { rotate: 6 }}
        whileTap={{ scale: 0.94 }}
        onDragStart={() => (dragged.current = true)}
        onClick={() => {
          if (dragged.current) {
            dragged.current = false;
            return;
          }
          setIndex((i) => (i + 1) % hero.stickerMessages.length);
        }}
        className="relative flex h-[104px] w-[104px] touch-none select-none items-center justify-center rounded-full bg-accent text-bg shadow-[0_20px_50px_-20px_rgba(0,0,0,0.9)] sm:h-[128px] sm:w-[128px]"
      >
        <svg viewBox="0 0 120 120" className="spin-slow absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <path id="sticker-circle" d="M60,60 m-47,0 a47,47 0 1,1 94,0 a47,47 0 1,1 -94,0" />
          </defs>
          <text className="fill-bg font-mono text-[9.5px] font-semibold uppercase tracking-[0.2em]">
            <textPath href="#sticker-circle">leul.dev * fullstack * flutterflow * </textPath>
          </text>
        </svg>
        <span className="relative flex h-14 w-[66px] items-center justify-center overflow-hidden sm:w-20" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={message}
              initial={{ y: 18, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -18, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="text-center font-mono text-[10.5px] font-bold leading-tight sm:text-[12px]"
            >
              {message}
            </motion.span>
          </AnimatePresence>
        </span>
        <span className="sr-only"> (show next sticker message)</span>
      </motion.button>
    </div>
  );
}
