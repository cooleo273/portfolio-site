"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { motion } from "framer-motion";
import { projects, systems, type Project } from "@/content/site";
import { lockScroll } from "@/lib/scroll";
import { emit, store } from "@/lib/store";

type Props = { project: Project; onClose: () => void };

export function CaseStudyModal({ project, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const num = String(projects.indexOf(project) + 1).padStart(2, "0");
  const titleId = `cs-title-${project.slug}`;
  const closeFn = useRef(onClose);
  closeFn.current = onClose;

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    lockScroll(true);
    store.set({ modalOpen: true });
    closeRef.current?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeFn.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lockScroll(false);
      store.set({ modalOpen: false });
      opener?.focus?.({ preventScroll: true });
    };
  }, []);

  const { caseStudy: cs } = project;

  return createPortal(
    <motion.div className="fixed inset-0 z-[160] flex items-end justify-center sm:items-center sm:p-6" initial="hidden" animate="show" exit="hidden">
      <motion.div
        className="absolute inset-0 bg-bg/80 backdrop-blur-md"
        variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
        aria-hidden="true"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-lenis-prevent
        variants={{ hidden: { opacity: 0, y: 40 }, show: { opacity: 1, y: 0 } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-h-[92svh] w-full max-w-4xl overflow-y-auto [scrollbar-width:thin] rounded-t-[24px] border border-line bg-surface p-3 sm:rounded-[24px]"
      >
        <motion.div
          layoutId={`thumb-${project.slug}`}
          className="relative flex h-[200px] items-end overflow-hidden rounded-[18px] p-6 sm:h-[280px] sm:p-8"
          style={{ backgroundColor: project.color }}
          transition={{ type: "spring", stiffness: 260, damping: 32 }}
        >
          <span className="absolute bottom-2 right-6 font-mono text-[clamp(4rem,12vw,8rem)] font-bold leading-none tracking-tighter text-bg/80">
            {num}
          </span>
          <div className="relative">
            <span className="mb-3 inline-block rounded-full bg-bg px-3 py-1 font-mono text-[11px] text-text">{project.category}</span>
            <h2 id={titleId} className="text-[clamp(1.75rem,5vw,3rem)] font-semibold leading-none tracking-tight text-bg">
              {project.title}
            </h2>
          </div>
        </motion.div>

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close case study"
          className="absolute right-6 top-6 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-bg text-text transition-transform hover:rotate-90"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M3 3l10 10M13 3 3 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>

        <motion.div
          className="grid grid-cols-1 gap-10 px-3 pb-6 pt-8 sm:px-6 md:grid-cols-[1fr_1.4fr]"
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { delay: 0.2 } } }}
        >
          <div className="space-y-8">
            <p className="text-[17px] leading-relaxed text-muted">{project.description}</p>
            <Block title="tech">
              <ul className="flex flex-wrap gap-1.5">
                {project.tags.map((t) => (
                  <li key={t} className="rounded-full border border-line px-2.5 py-1 font-mono text-[12px] text-muted">
                    {t}
                  </li>
                ))}
              </ul>
            </Block>
            <Block title="links">
              <div className="flex flex-wrap gap-2">
                {systems.some((g) => g.slug === project.slug) && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      setTimeout(() => emit("system:show", project.slug), 320);
                    }}
                    className="inline-flex items-center gap-2 rounded-full border border-accent px-5 py-2.5 text-[14px] text-text transition-colors hover:bg-accent hover:text-bg"
                  >
                    Explore the architecture in 3D
                  </button>
                )}
                {project.liveUrl && (
                  <a href={project.liveUrl} target="_blank" rel="noreferrer" className="rounded-full bg-accent px-5 py-2.5 text-[14px] font-medium text-bg">
                    Live demo<span className="sr-only"> (opens in new tab)</span>
                  </a>
                )}
                {project.codeUrl && (
                  <a href={project.codeUrl} target="_blank" rel="noreferrer" className="rounded-full border border-line px-5 py-2.5 text-[14px] hover:border-accent">
                    Source code<span className="sr-only"> (opens in new tab)</span>
                  </a>
                )}
              </div>
            </Block>
          </div>

          <div className="space-y-8">
            <Block title="the challenge">
              <p className="text-[16px] leading-relaxed text-text">{cs.challenge}</p>
            </Block>
            <Block title="what I built">
              <List items={cs.built} />
            </Block>
            <Block title="architecture">
              <List items={cs.architecture} mono />
            </Block>
            <Block title="results">
              <List items={cs.results} accent />
            </Block>
          </div>

          <div className="md:col-span-2">
            <Block title="screenshots">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {cs.screenshots.map((s, i) => (
                  <figure key={i} className="relative aspect-[4/3] overflow-hidden rounded-[14px] border border-line-subtle bg-bg">
                    {s.src ? (
                      <Image src={s.src} alt={s.alt} fill sizes="(min-width: 640px) 30vw, 90vw" className="object-cover" />
                    ) : (
                      <figcaption className="flex h-full items-center justify-center p-4 text-center font-mono text-[12px] text-dim">
                        {s.alt}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </Block>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="label-mono mb-3">{title}</h3>
      {children}
    </section>
  );
}

function List({ items, mono, accent }: { items: string[]; mono?: boolean; accent?: boolean }) {
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it} className={`flex gap-3 text-[15px] leading-relaxed ${mono ? "font-mono text-[13px] text-muted" : "text-text"}`}>
          <span className={accent ? "text-accent" : "text-dim"} aria-hidden="true">
            {accent ? "+" : "-"}
          </span>
          {it}
        </li>
      ))}
    </ul>
  );
}
