"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { systems, systemsIntro } from "@/content/site";
import { FINE_POINTER, prefersReducedMotion } from "@/lib/hooks";
import { getAccentHex, on } from "@/lib/store";
import { scrollToTarget } from "@/lib/scroll";
import { SectionLabel } from "@/components/ui/SectionLabel";
import type { SystemScene } from "./SystemScene";

const STEP_MS = 3600;
const GLASS = "rounded-[20px] border border-line bg-bg/70 backdrop-blur-xl";

export function SystemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SystemScene | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [projectIndex, setProjectIndex] = useState(0);
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [canFullscreen, setCanFullscreen] = useState(false);

  const graph = systems[projectIndex];
  const nodeById = (id: string | null) => (id ? graph.nodes.find((n) => n.id === id) ?? null : null);

  // Create the scene lazily when the section approaches the viewport.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    setCanFullscreen(!!document.fullscreenEnabled);
    let disposed = false;
    let visible = false;

    const visibility = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      setInView(visible);
      sceneRef.current?.setActive(visible && !document.hidden);
    });
    visibility.observe(stage);
    const onVisibility = () => sceneRef.current?.setActive(visible && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const loader = new IntersectionObserver(
      async ([e]) => {
        if (!e.isIntersecting) return;
        loader.disconnect();
        setStatus("loading");
        try {
          const { SystemScene } = await import("./SystemScene");
          if (disposed) return;
          const scene = new SystemScene(stage, {
            reducedMotion: prefersReducedMotion(),
            finePointer: window.matchMedia(FINE_POINTER).matches,
            accent: getAccentHex,
            onHover: setHovered,
            onSelect: (id) => {
              setSelected(id);
              if (id) setAuto(false);
            },
          });
          sceneRef.current = scene;
          setStatus("ready");
          scene.setActive(visible && !document.hidden);
        } catch {
          setStatus("fallback");
        }
      },
      { rootMargin: "700px 0px" },
    );
    loader.observe(section);

    return () => {
      disposed = true;
      loader.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Keep the graph beside the floating panels on wide screens.
  useEffect(() => {
    if (status !== "ready") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => sceneRef.current?.setViewShift(mq.matches ? 0.09 : 0);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [status]);

  // Project switch.
  useEffect(() => {
    if (status !== "ready") return;
    sceneRef.current?.setGraph(graph);
  }, [graph, status]);

  // Selection drives the camera.
  useEffect(() => {
    if (status === "ready") sceneRef.current?.select(selected);
  }, [selected, status]);

  // Highlight the current step, or everything around the focused node.
  const focus = hovered ?? selected;
  useEffect(() => {
    sceneRef.current?.setHighlight(focus ? [] : graph.steps[step]?.edges ?? [], focus);
  }, [graph, step, focus, status]);

  // Auto-advance steps while visible, until the visitor takes over.
  useEffect(() => {
    if (!auto || !inView || prefersReducedMotion()) return;
    const t = setInterval(() => setStep((s) => (s + 1) % graph.steps.length), STEP_MS);
    return () => clearInterval(t);
  }, [auto, inView, graph]);

  const switchProject = useCallback((i: number) => {
    setProjectIndex(i);
    setStep(0);
    setSelected(null);
    setHovered(null);
    setAuto(true);
  }, []);

  // Case studies can ask to show their architecture here.
  useEffect(
    () =>
      on("system:show", (slug) => {
        const i = systems.findIndex((s) => s.slug === slug);
        if (i >= 0) switchProject(i);
        scrollToTarget("#system");
      }),
    [switchProject],
  );

  // Fullscreen.
  useEffect(() => {
    const onChange = () => {
      const fs = document.fullscreenElement === sectionRef.current;
      setIsFullscreen(fs);
      sceneRef.current?.setFullscreen(fs);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void sectionRef.current?.requestFullscreen();
  };

  const pickStep = (i: number) => {
    setAuto(false);
    setSelected(null);
    setStep(i);
  };

  const inspected = nodeById(focus);
  const fs = isFullscreen;

  return (
    <section
      id="system"
      ref={sectionRef}
      aria-labelledby="system-title"
      data-tint="#0B0D0A"
      data-lenis-prevent={fs ? "" : undefined}
      className={`relative bg-bg ${fs ? "block h-screen overflow-hidden" : "flex flex-col lg:block lg:h-[100svh] lg:min-h-[700px]"}`}
    >
      {/* 3D stage */}
      <div
        ref={stageRef}
        data-cursor={fs ? undefined : "drag"}
        className={`${fs ? "absolute inset-0" : "relative order-2 h-[60svh] min-h-[420px] w-full lg:absolute lg:inset-0 lg:h-full"} overflow-hidden`}
      >
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center font-mono text-[12px] text-dim">
            {status === "fallback" ? "3D view unavailable on this device. The flow is described below." : "loading 3D scene..."}
          </div>
        )}
      </div>

      {/* Blend the full-bleed stage into the neighbouring sections. */}
      {!fs && (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 z-[1] hidden h-32 bg-gradient-to-b from-bg to-transparent lg:block" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] hidden h-40 bg-gradient-to-t from-bg to-transparent lg:block" />
        </>
      )}

      {/* Top: heading + project switcher */}
      <div
        className={`z-[2] flex flex-col gap-6 ${
          fs
            ? "pointer-events-none absolute inset-x-0 top-0 px-6 pt-6 sm:px-10 sm:pt-8 lg:flex-row lg:items-start lg:justify-between"
            : "container-x order-1 pb-6 pt-24 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:top-0 lg:max-w-none lg:flex-row lg:items-start lg:justify-between lg:px-14 lg:pt-24"
        }`}
      >
        <div className="pointer-events-auto max-w-md">
          <SectionLabel index={3} text="under the hood" className="mb-4" />
          <h2
            id="system-title"
            className="text-[clamp(2.4rem,6vw,4.25rem)] font-semibold leading-[0.95] tracking-[-0.035em] lg:text-[clamp(2.4rem,3.8vw,3.75rem)]"
          >
            How I build <span className="text-accent">systems.</span>
          </h2>
          {!fs && <p className="mt-4 max-w-sm text-[16px] leading-relaxed text-muted">{systemsIntro}</p>}
        </div>

        <div className="pointer-events-auto flex flex-col gap-3 lg:items-end">
          <LayoutGroup id="system-tabs">
            <div
              role="group"
              aria-label="Choose a project"
              className={`no-scrollbar flex max-w-full gap-1.5 overflow-x-auto p-1.5 lg:flex-wrap ${GLASS} rounded-[22px]`}
            >
              {systems.map((s, i) => {
                const active = i === projectIndex;
                return (
                  <button
                    key={s.slug}
                    type="button"
                    aria-pressed={active}
                    onClick={() => switchProject(i)}
                    className={`relative shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition-colors sm:px-4 sm:text-[14px] ${
                      active ? "text-bg" : "text-muted hover:text-text"
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="system-tab"
                        className="absolute inset-0 rounded-full bg-accent"
                        transition={{ type: "spring", stiffness: 420, damping: 34 }}
                      />
                    )}
                    <span className="relative">{s.title}</span>
                  </button>
                );
              })}
            </div>
          </LayoutGroup>
          <div className="flex items-center gap-2">
            {selected && (
              <button
                type="button"
                onClick={() => setSelected(null)}
                className={`${GLASS} rounded-full px-3.5 py-1.5 font-mono text-[12px] text-muted hover:text-text`}
              >
                reset view
              </button>
            )}
            {canFullscreen && status === "ready" && (
              <button
                type="button"
                onClick={toggleFullscreen}
                aria-pressed={fs}
                className={`${GLASS} flex items-center gap-2 rounded-full px-3.5 py-1.5 font-mono text-[12px] text-muted hover:text-text`}
              >
                <FullscreenIcon exit={fs} />
                {fs ? "exit fullscreen" : "fullscreen"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom: steps + inspector */}
      <div
        className={`z-[2] grid grid-cols-1 gap-3 ${
          fs
            ? "pointer-events-none absolute inset-x-0 bottom-0 px-6 pb-6 sm:px-10 sm:pb-8 lg:grid-cols-[minmax(0,360px)_1fr_minmax(0,380px)] lg:items-end"
            : "container-x order-3 pb-20 pt-4 lg:pointer-events-none lg:absolute lg:inset-x-0 lg:bottom-0 lg:max-w-none lg:grid-cols-[minmax(0,360px)_1fr_minmax(0,380px)] lg:items-end lg:px-14 lg:pb-12"
        }`}
      >
        <div className={`pointer-events-auto p-2 ${GLASS}`}>
          <p className="label-mono px-3 pb-1 pt-2">request flow</p>
          <ol className="no-scrollbar flex gap-1 overflow-x-auto lg:block lg:space-y-0.5" aria-label={`${graph.title} request flow`}>
            {graph.steps.map((s, i) => {
              const active = !focus && i === step;
              return (
                <li key={s.title} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => pickStep(i)}
                    className={`flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left transition-colors ${
                      active ? "bg-surface-hover" : "hover:bg-surface"
                    }`}
                  >
                    <span className={`font-mono text-[11px] ${active ? "text-accent" : "text-dim"}`}>0{i + 1}</span>
                    <span className={`whitespace-nowrap text-[14px] ${active ? "text-text" : "text-muted"}`}>{s.title}</span>
                    {active && auto && (
                      <span className="ml-auto hidden h-px w-8 overflow-hidden bg-line lg:block" aria-hidden="true">
                        <span
                          key={`${projectIndex}-${step}`}
                          className="step-progress block h-full origin-left bg-accent"
                          style={{ animationDuration: `${STEP_MS}ms` }}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div className="hidden lg:block" />

        {/* Transform-only transition: text is never semi-transparent, so contrast holds mid-animation. */}
        <div className={`pointer-events-auto min-h-[132px] overflow-hidden p-5 ${GLASS}`} aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={inspected ? `${graph.slug}-${inspected.id}` : graph.slug}
              initial={{ y: "120%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              {inspected ? (
                <>
                  <p className="mb-1.5 flex items-center gap-2 font-mono text-[12px]">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: inspected.color, boxShadow: `0 0 10px ${inspected.color}` }}
                      aria-hidden="true"
                    />
                    <span className="text-text">{inspected.label}</span>
                    <span className="text-dim">/ {graph.title}</span>
                  </p>
                  <p className="text-[14px] leading-relaxed text-muted">{inspected.detail}</p>
                </>
              ) : (
                <>
                  <p className="mb-1.5 font-mono text-[12px] text-text">
                    {graph.title} <span className="text-dim">/ {graph.nodes.length} parts</span>
                  </p>
                  <p className="text-[14px] leading-relaxed text-muted">{graph.summary}</p>
                  <p className="mt-3 font-mono text-[11px] text-dim">click any part to inspect it</p>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Full description of every diagram for screen readers. */}
      <div className="sr-only">
        {systems.map((s) => (
          <dl key={s.slug} aria-label={`${s.title} architecture`}>
            {s.nodes.map((n) => (
              <div key={n.id}>
                <dt>{n.label}</dt>
                <dd>{n.detail}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </section>
  );
}

function FullscreenIcon({ exit }: { exit: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      {exit ? (
        <path d="M4.5 1v3.5H1M7.5 1v3.5H11M4.5 11V7.5H1M7.5 11V7.5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      ) : (
        <path d="M1 4.5V1h3.5M11 4.5V1H7.5M1 7.5V11h3.5M11 7.5V11H7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      )}
    </svg>
  );
}
