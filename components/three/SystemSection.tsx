"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { system } from "@/content/site";
import { FINE_POINTER, prefersReducedMotion } from "@/lib/hooks";
import { getAccentHex } from "@/lib/store";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { RevealHeading } from "@/components/ui/RevealHeading";
import { NODE_LAYOUT, type NodeId } from "./layout";
import type { SystemScene } from "./SystemScene";

const STEP_MS = 3400;
const nodeIds = Object.keys(system.nodes) as NodeId[];

/** The node a step is "about": the target of its first edge. */
const stepNode = (i: number) => system.steps[i].edges[0].split(">")[1] as NodeId;

export function SystemSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<SystemScene | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "fallback">("idle");
  const [step, setStep] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hovered, setHovered] = useState<NodeId | null>(null);
  const [selected, setSelected] = useState<NodeId | null>(null);
  const [inView, setInView] = useState(false);

  // Load three.js only when the section gets close to the viewport.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    let disposed = false;
    let visible = false;

    const visibility = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      setInView(visible);
      sceneRef.current?.setActive(visible && !document.hidden);
    });
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
          sceneRef.current = new SystemScene(stage, {
            reducedMotion: prefersReducedMotion(),
            interactive: window.matchMedia(FINE_POINTER).matches,
            accent: getAccentHex,
            onHover: setHovered,
            onSelect: (id) => {
              setSelected(id);
              setAuto(false);
            },
          });
          sceneRef.current.setActive(visible && !document.hidden);
          setStatus("ready");
        } catch {
          setStatus("fallback");
        }
      },
      { rootMargin: "600px 0px" },
    );
    loader.observe(section);
    visibility.observe(stage);

    return () => {
      disposed = true;
      loader.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  // Auto-advance through the steps while on screen, until the visitor takes over.
  useEffect(() => {
    if (!auto || !inView || prefersReducedMotion()) return;
    const t = setInterval(() => setStep((s) => (s + 1) % system.steps.length), STEP_MS);
    return () => clearInterval(t);
  }, [auto, inView]);

  const focus = hovered ?? selected;
  useEffect(() => {
    sceneRef.current?.setHighlight(focus ? [] : system.steps[step].edges, focus);
  }, [step, focus, status]);

  const inspected = focus ?? stepNode(step);
  const pick = (i: number) => {
    setAuto(false);
    setSelected(null);
    setStep(i);
  };

  return (
    <section
      id="system"
      ref={sectionRef}
      aria-labelledby="system-title"
      data-tint="color-mix(in srgb, #FFD84B 2.5%, #0B0D0A)"
      className="relative overflow-hidden py-24 sm:py-36"
    >
      <div className="container-x grid grid-cols-1 items-center gap-12 lg:grid-cols-[0.85fr_1.4fr] lg:gap-14">
        <div>
          <SectionLabel index={3} text="under the hood" className="mb-5" />
          <RevealHeading
            id="system-title"
            text="How I build systems."
            accentWords={["systems."]}
            className="max-w-xl text-[clamp(2.4rem,6vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.035em]"
          />
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-muted">{system.intro}</p>

          <ol className="mt-8 space-y-1.5" aria-label="Request flow">
            {system.steps.map((s, i) => {
              const active = !focus && i === step;
              return (
                <li key={s.title}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => pick(i)}
                    onMouseEnter={() => pick(i)}
                    onFocus={() => pick(i)}
                    className={`group flex w-full items-center gap-4 rounded-[14px] border px-4 py-3 text-left transition-colors ${
                      active ? "border-line bg-surface-hover" : "border-transparent hover:bg-surface"
                    }`}
                  >
                    <span className={`font-mono text-[12px] ${active ? "text-accent" : "text-dim"}`}>0{i + 1}</span>
                    <span className={`text-[15px] ${active ? "text-text" : "text-muted"}`}>{s.title}</span>
                    {active && auto && (
                      <span className="ml-auto h-px w-10 overflow-hidden bg-line" aria-hidden="true">
                        <span key={step} className="step-progress block h-full origin-left bg-accent" style={{ animationDuration: `${STEP_MS}ms` }} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Transform-only transition: text is never semi-transparent, so contrast holds mid-animation. */}
          <div className="mt-6 min-h-[112px] overflow-hidden rounded-[18px] border border-line-subtle bg-surface p-5" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={inspected}
                initial={{ y: "120%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mb-1.5 flex items-center gap-2 font-mono text-[12px]">
                  <span className="h-2 w-2 rounded-full" style={{ background: NODE_LAYOUT[inspected].color }} aria-hidden="true" />
                  <span className="text-text">{system.nodes[inspected].label}</span>
                </p>
                <p className="text-[14px] leading-relaxed text-muted">{system.nodes[inspected].detail}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="relative">
          <div
            ref={stageRef}
            className="relative aspect-square w-full overflow-hidden rounded-[24px] border border-line-subtle bg-surface/60 sm:aspect-[4/3]"
          >
            {status !== "ready" && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center font-mono text-[12px] text-dim">
                {status === "fallback" ? "3D view unavailable on this device. The flow is described on the left." : "loading 3D scene..."}
              </div>
            )}
          </div>
          <p className="mt-3 flex items-center justify-between font-mono text-[11px] text-dim" aria-hidden="true">
            <span>{status === "ready" ? "drag to orbit / tap a node" : ""}</span>
            <span>three.js / webgl</span>
          </p>
          {/* Full description of the diagram for screen readers. */}
          <dl className="sr-only">
            {nodeIds.map((id) => (
              <div key={id}>
                <dt>{system.nodes[id].label}</dt>
                <dd>{system.nodes[id].detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
