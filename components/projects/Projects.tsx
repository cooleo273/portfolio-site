"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { projectFilters, projects, type Project } from "@/content/site";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { getLenis } from "@/lib/scroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealHeading } from "@/components/ui/RevealHeading";
import { useStaggerReveal } from "@/components/ui/useStaggerReveal";
import { ProjectCard } from "./ProjectCard";
import dynamic from "next/dynamic";

const CaseStudyModal = dynamic(() => import("./CaseStudyModal").then((m) => m.CaseStudyModal), { ssr: false });

type Filter = (typeof projectFilters)[number];

const HORIZONTAL_MQ = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";

export function Projects() {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<Project | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLUListElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<ScrollTrigger | null>(null);

  const visible = useMemo(() => (filter === "All" ? projects : projects.filter((p) => p.category === filter)), [filter]);

  useStaggerReveal(sectionRef);

  // Desktop: pin the section and translate the track horizontally while scrolling vertically.
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const mm = gsap.matchMedia();
    mm.add(HORIZONTAL_MQ, () => {
      const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 64);
      const tween = gsap.to(track, {
        x: () => -distance(),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: () => `+=${distance() + window.innerHeight * 0.25}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            if (progressRef.current) progressRef.current.style.transform = `scaleX(${self.progress})`;
          },
        },
      });
      pinRef.current = tween.scrollTrigger ?? null;
      return () => {
        pinRef.current = null;
      };
    });
    return () => mm.revert();
  }, []);

  // Track width changes when filtering; recompute pin distances after the layout animation.
  // If the user was inside the pinned range, keep them at the start of the showcase.
  const firstFilter = useRef(true);
  useEffect(() => {
    if (firstFilter.current) {
      firstFilter.current = false;
      return;
    }
    const wasPinned = pinRef.current?.isActive ?? false;
    const t = setTimeout(() => {
      ScrollTrigger.refresh();
      const st = pinRef.current;
      if (wasPinned && st) {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(st.start, { immediate: true });
        else window.scrollTo(0, st.start);
      }
    }, 520);
    return () => clearTimeout(t);
  }, [filter]);

  return (
    <section
      id="work"
      ref={sectionRef}
      aria-labelledby="work-title"
      data-tint="color-mix(in srgb, var(--accent) 2.5%, #0B0D0A)"
      className="relative overflow-hidden py-24 sm:py-32 lg:motion-safe:flex lg:motion-safe:h-[100svh] lg:motion-safe:flex-col lg:motion-safe:justify-center lg:motion-safe:py-0"
    >
      <div className="container-x">
        <div className="mb-10 flex flex-col gap-8 lg:mb-12 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel index={1} text="selected work" className="mb-5" />
            <RevealHeading
              id="work-title"
              text="Things I've built and shipped."
              accentWords={["shipped."]}
              className="max-w-3xl text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.035em]"
            />
          </div>

          <LayoutGroup id="filters">
            <div role="group" aria-label="Filter projects" className="flex flex-wrap gap-2">
              {projectFilters.map((f) => {
                const active = f === filter;
                const count = f === "All" ? projects.length : projects.filter((p) => p.category === f).length;
                return (
                  <button
                    key={f}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setFilter(f)}
                    className={`relative rounded-full border px-4 py-2 text-[14px] transition-colors ${
                      active ? "border-transparent text-bg" : "border-line text-muted hover:border-accent hover:text-text"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="filter-active"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">
                      {f} <span className={`font-mono text-[11px] ${active ? "text-bg/70" : "text-dim"}`}>{count}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
        </div>
      </div>

      <div className="container-x lg:motion-safe:max-w-none">
        <motion.ul
          ref={trackRef}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:motion-safe:flex lg:motion-safe:w-max lg:motion-safe:gap-6 lg:motion-safe:pr-16 lg:motion-safe:will-change-transform"
          aria-label="Projects"
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {visible.map((p) => (
              <motion.li
                key={p.slug}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="lg:motion-safe:w-[clamp(360px,30vw,460px)] lg:motion-safe:shrink-0"
              >
                <div data-reveal>
                  <ProjectCard project={p} index={projects.indexOf(p)} onOpen={() => setSelected(p)} />
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </motion.ul>
      </div>

      <div className="container-x mt-10 hidden lg:motion-safe:block" aria-hidden="true">
        <div className="flex items-center gap-4 font-mono text-[11px] text-dim">
          <span>scroll</span>
          <div className="h-px flex-1 bg-line-subtle">
            <div ref={progressRef} className="h-px origin-left scale-x-0 bg-accent" />
          </div>
          <span>{String(visible.length).padStart(2, "0")} projects</span>
        </div>
      </div>

      <AnimatePresence>{selected && <CaseStudyModal project={selected} onClose={() => setSelected(null)} />}</AnimatePresence>
    </section>
  );
}
