"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { nav, site } from "@/content/site";
import { store, useStore } from "@/lib/store";

export function Nav() {
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const paletteOpen = useStore((s) => s.paletteOpen);

  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      if (Math.abs(delta) > 6) {
        setHidden(delta > 0 && y > 140);
        lastY = y;
      }
      setScrolled(y > 24);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const show = !hidden || menuOpen;

  return (
    <motion.header
      initial={false}
      animate={{ y: show ? 0 : "-110%" }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-[60]"
    >
      <div
        className={`border-b transition-colors duration-300 ${
          scrolled || menuOpen ? "border-line-subtle bg-bg/75 backdrop-blur-xl" : "border-transparent bg-transparent"
        }`}
      >
        <nav aria-label="Primary" className="container-x flex h-16 items-center justify-between gap-4 md:h-[72px]">
          <a href="#top" className="font-mono text-[15px] font-medium tracking-tight text-text" aria-label={`${site.domain}, back to top`}>
            {site.domain}
            <span className="blink text-accent">_</span>
          </a>

          <ul className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="group relative rounded-full px-4 py-2 text-[15px] text-muted transition-colors hover:text-text"
                >
                  {item.label}
                  <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 group-hover:scale-x-100" />
                </a>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => store.set({ paletteOpen: !paletteOpen })}
              className="hidden items-center gap-1.5 rounded-full border border-line px-3 py-2 font-mono text-[12px] text-muted transition-colors hover:border-accent hover:text-text sm:flex"
              aria-label="Ctrl + K, open command palette"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <kbd className="font-mono">Ctrl</kbd>
              <span aria-hidden="true">+</span>
              <kbd className="font-mono">K</kbd>
            </button>
            <a
              href={site.cvUrl}
              download={site.cvFileName}
              className="rounded-full bg-accent px-4 py-2 text-[14px] font-medium text-bg transition-transform hover:-translate-y-0.5"
            >
              Download CV
            </a>
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="relative block h-3 w-4" aria-hidden="true">
                <span
                  className={`absolute left-0 block h-px w-4 bg-text transition-transform duration-300 ${
                    menuOpen ? "top-1.5 rotate-45" : "top-0"
                  }`}
                />
                <span
                  className={`absolute left-0 block h-px w-4 bg-text transition-transform duration-300 ${
                    menuOpen ? "top-1.5 -rotate-45" : "top-3"
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="mobile-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden md:hidden"
            >
              <ul className="container-x flex flex-col gap-1 pb-6">
                {nav.map((item, i) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-baseline gap-3 py-2 text-3xl font-medium tracking-tight"
                    >
                      <span className="font-mono text-xs text-dim">0{i + 1}</span>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  );
}
