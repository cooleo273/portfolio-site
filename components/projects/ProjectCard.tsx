"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { Project } from "@/content/site";
import { useFinePointer, useReducedMotion } from "@/lib/hooks";

type Props = { project: Project; index: number; onOpen: () => void };

export function ProjectCard({ project, index, onOpen }: Props) {
  const ref = useRef<HTMLElement>(null);
  const fine = useFinePointer();
  const reduced = useReducedMotion();
  const tilt = fine && !reduced;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 260, damping: 22, mass: 0.5 };
  const rotateY = useSpring(useTransform(px, [0, 1], [-9, 9]), spring);
  const rotateX = useSpring(useTransform(py, [0, 1], [7, -7]), spring);
  const glareX = useTransform(px, [0, 1], ["-30%", "30%"]);
  const glareY = useTransform(py, [0, 1], ["-30%", "30%"]);
  const glareOpacity = useSpring(0, { stiffness: 200, damping: 30 });

  const num = String(index + 1).padStart(2, "0");

  return (
    <article
      ref={ref}
      data-cursor="view"
      className="group relative [perspective:1100px]"
      onMouseMove={(e) => {
        if (!tilt || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        px.set((e.clientX - r.left) / r.width);
        py.set((e.clientY - r.top) / r.height);
        glareOpacity.set(1);
      }}
      onMouseLeave={() => {
        px.set(0.5);
        py.set(0.5);
        glareOpacity.set(0);
      }}
    >
      <motion.div
        style={tilt ? { rotateX, rotateY, transformStyle: "preserve-3d" } : undefined}
        className="relative overflow-hidden rounded-[22px] border border-line-subtle bg-surface p-3 transition-colors duration-300 group-hover:border-line group-hover:bg-surface-hover"
      >
        <motion.div
          layoutId={`thumb-${project.slug}`}
          className="relative aspect-[4/3] overflow-hidden rounded-[16px]"
          style={{ backgroundColor: project.color }}
        >
          <ThumbArt color={project.color} />
          <span className="absolute left-4 top-4 rounded-full bg-bg px-3 py-1 font-mono text-[11px] text-text">
            {project.category}
          </span>
          <span className="absolute bottom-2 right-4 font-mono text-[clamp(3.5rem,7vw,5.5rem)] font-bold leading-none tracking-tighter text-bg/85">
            {num}
          </span>
        </motion.div>

        <div className="px-2 pb-2 pt-5">
          <h3 className="text-[22px] font-semibold tracking-tight">
            <button
              type="button"
              onClick={onOpen}
              aria-haspopup="dialog"
              className="text-left after:absolute after:inset-0 after:rounded-[22px] after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent"
            >
              {project.title}
              <span className="sr-only">, open case study</span>
            </button>
          </h3>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">{project.description}</p>
          <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tech used">
            {project.tags.map((t) => (
              <li key={t} className="rounded-full border border-line-subtle px-2.5 py-1 font-mono text-[11px] text-muted">
                {t}
              </li>
            ))}
          </ul>
          <div className="relative z-10 mt-5 flex items-center gap-2">
            {project.liveUrl && (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-text px-4 py-2 text-[13px] font-medium text-bg transition-colors hover:bg-accent"
              >
                Live demo<span className="sr-only"> of {project.title} (opens in new tab)</span>
              </a>
            )}
            {project.codeUrl && (
              <a
                href={project.codeUrl}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-line px-4 py-2 text-[13px] text-text transition-colors hover:border-accent"
              >
                Code<span className="sr-only"> for {project.title} (opens in new tab)</span>
              </a>
            )}
            <span className="ml-auto font-mono text-[12px] text-dim transition-colors group-hover:text-accent" aria-hidden="true">
              case study &rarr;
            </span>
          </div>
        </div>

        {tilt && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1/2"
            style={{
              x: glareX,
              y: glareY,
              opacity: glareOpacity,
              background: "radial-gradient(circle at center, rgba(237,239,232,0.13) 0%, transparent 38%)",
            }}
          />
        )}
      </motion.div>
    </article>
  );
}

/** Minimal mock UI drawn in the thumbnail so it never looks empty before real screenshots exist. */
function ThumbArt({ color }: { color: string }) {
  return (
    <div aria-hidden="true" className="absolute bottom-[-8%] left-[10%] right-[32%] top-[22%] rounded-t-[12px] bg-bg/90 p-3 shadow-2xl">
      <div className="mb-3 flex gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-line" />
        <span className="h-1.5 w-1.5 rounded-full bg-line" />
      </div>
      <div className="mb-2 h-2 w-1/2 rounded-full" style={{ backgroundColor: color }} />
      <div className="mb-1.5 h-1.5 w-4/5 rounded-full bg-line" />
      <div className="mb-4 h-1.5 w-3/5 rounded-full bg-line" />
      <div className="grid grid-cols-3 gap-2">
        <div className="h-10 rounded-md bg-line-subtle" />
        <div className="h-10 rounded-md bg-line-subtle" />
        <div className="h-10 rounded-md" style={{ backgroundColor: color, opacity: 0.35 }} />
      </div>
    </div>
  );
}
