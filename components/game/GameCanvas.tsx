"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { site } from "@/content/site";
import { prefersReducedMotion } from "@/lib/hooks";
import { copyText, getAccentHex, on, store, toggleSound, useStore } from "@/lib/store";
import { Game } from "./engine";
import { loadScores, qualifies, saveScore, type ScoreEntry } from "./highscores";
import type { Phase, Stats } from "./types";

const pad = (n: number, len = 6) => String(n).padStart(len, "0");

export function GameCanvas() {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const initialsRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<Phase>("start");
  const [result, setResult] = useState<Stats | null>(null);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [askInitials, setAskInitials] = useState(false);
  const [initials, setInitials] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [shared, setShared] = useState(false);
  const [announce, setAnnounce] = useState("");
  const sound = useStore((s) => s.sound);

  const begin = useCallback(() => {
    const game = gameRef.current;
    if (!game) return;
    setResult(null);
    setAskInitials(false);
    setSavedAt(null);
    game.start();
    frameRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const frame = frameRef.current!;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--font-jetbrains-mono").trim() || "monospace";
    document.fonts?.load(`700 16px ${font}`).catch(() => {});

    const game = new Game(
      canvas,
      frame,
      {
        onPhase: (p) => {
          setPhase(p);
          if (p === "paused") setAnnounce("Game paused");
          if (p === "playing") setAnnounce("");
        },
        onGameOver: (stats) => {
          setResult(stats);
          setAskInitials(qualifies(stats.score));
          setInitials("");
          setSavedAt(null);
          setScores(loadScores());
          setAnnounce(`Game over. Score ${stats.score}, wave ${stats.wave}.`);
        },
      },
      { reducedMotion: prefersReducedMotion(), accent: getAccentHex, font },
    );
    gameRef.current = game;
    game.sound.setEnabled(store.get().sound);
    setScores(loadScores());

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) game.resize(width, height);
    });
    ro.observe(canvas);

    let inView = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.intersectionRatio >= 0.3;
        game.setActive(inView && !document.hidden);
      },
      { threshold: [0, 0.3, 0.6, 1] },
    );
    io.observe(frame);
    const onVisibility = () => game.setActive(inView && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);

    const offStart = on("game:start", begin);
    const offStore = store.subscribe(() => game.sound.setEnabled(store.get().sound));

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      offStart();
      offStore();
      game.destroy();
      gameRef.current = null;
    };
  }, [begin]);

  // Move focus to the most useful control when an overlay appears.
  useEffect(() => {
    if (phase === "playing" || phase === "start") return;
    const t = setTimeout(() => {
      if (phase === "gameover" && askInitials) initialsRef.current?.focus({ preventScroll: true });
      else actionRef.current?.focus({ preventScroll: true });
    }, 350);
    return () => clearTimeout(t);
  }, [phase, askInitials]);

  const saveInitials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!result) return;
    const tag = (initials.trim().toUpperCase() || "???").slice(0, 3);
    const entry = { initials: tag, score: result.score, wave: result.wave, date: Date.now() };
    const next = saveScore(entry);
    setScores(next);
    setSavedAt(entry.date);
    setAskInitials(false);
  };

  const share = async () => {
    if (!result) return;
    const text = `I scored ${result.score.toLocaleString()} on Production Defense (wave ${result.wave}, max combo ${result.maxCombo}) at ${site.domain}. Can you keep bugs out of prod? ${site.url}/#play`;
    if (await copyText(text)) {
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    }
  };

  const best = scores[0]?.score ?? 0;
  const playing = phase === "playing";
  const totalKills = result ? Object.values(result.kills).reduce((a, b) => a + b, 0) : 0;
  const accuracy = result && result.shots ? Math.round((result.hits / result.shots) * 100) : 0;

  return (
    <div className="w-full" style={{ maxWidth: "min(100%, calc((100svh - 150px) * 0.75))" }}>
      <div className="rounded-[24px] border border-line bg-surface p-2 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.8)] sm:p-2.5">
        <div className="flex items-center gap-2 px-2.5 pb-2.5 pt-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-coral" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-yellow" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-lime" aria-hidden="true" />
          <p className="ml-2 flex-1 truncate font-mono text-[11px] text-dim">production-defense.exe</p>
          <button
            type="button"
            onClick={() => toggleSound()}
            aria-pressed={sound}
            aria-label={sound ? "Mute sound" : "Turn sound on"}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-text"
          >
            <SpeakerIcon on={sound} />
          </button>
          {(phase === "playing" || phase === "paused") && (
            <button
              type="button"
              onClick={() => gameRef.current?.togglePause()}
              aria-label={phase === "paused" ? "Resume game" : "Pause game"}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-text"
            >
              {phase === "paused" ? (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M3 1.5v9l7.5-4.5z" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.5 1.5h2.5v9H2.5zM7 1.5h2.5v9H7z" fill="currentColor" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div
          id="game-frame"
          ref={frameRef}
          tabIndex={0}
          role="application"
          aria-roledescription="game"
          aria-label="Production Defense. Arrow keys or WASD to move, hold space to fire, P or Escape to pause. Mouse and touch steer the ship with auto-fire."
          data-cursor={playing ? undefined : "play"}
          data-cursor-hidden={playing ? "" : undefined}
          className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] bg-bg focus-visible:outline-offset-2"
        >
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" style={{ touchAction: playing ? "none" : "pan-y" }} />

          <AnimatePresence>
            {phase === "start" && (
              <Overlay key="start">
                <p className="mb-3 font-mono text-[11px] text-accent">{"// arcade mode"}</p>
                <h3 className="text-[clamp(2rem,6vw,2.75rem)] font-semibold leading-[0.95] tracking-tight">
                  Production
                  <br />
                  Defense
                </h3>
                <p className="mx-auto mt-3 max-w-[260px] text-[14px] leading-relaxed text-muted">
                  Keep bugs out of prod. Survive the waves and take down the Legacy Monolith every fifth wave.
                </p>
                <button
                  ref={actionRef}
                  type="button"
                  onClick={begin}
                  className="mt-6 inline-flex h-12 items-center gap-2 rounded-full bg-accent px-7 text-[15px] font-medium text-bg transition-transform hover:-translate-y-0.5"
                >
                  Start game
                </button>
                <dl className="mt-6 grid grid-cols-[auto_auto] gap-x-4 gap-y-1 text-left font-mono text-[11px]">
                  <dt className="text-dim">move</dt>
                  <dd className="text-muted">mouse, drag, WASD, arrows</dd>
                  <dt className="text-dim">fire</dt>
                  <dd className="text-muted">auto, or hold space</dd>
                  <dt className="text-dim">pause</dt>
                  <dd className="text-muted">P or esc</dd>
                </dl>
                {best > 0 && <p className="mt-5 font-mono text-[11px] text-dim">best {pad(best)}</p>}
              </Overlay>
            )}

            {phase === "paused" && (
              <Overlay key="paused">
                <p className="mb-2 font-mono text-[11px] text-accent">{"// process suspended"}</p>
                <h3 className="text-[32px] font-semibold tracking-tight">Paused</h3>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  <button
                    ref={actionRef}
                    type="button"
                    onClick={() => {
                      gameRef.current?.resume();
                      frameRef.current?.focus({ preventScroll: true });
                    }}
                    className="h-11 rounded-full bg-accent px-6 text-[14px] font-medium text-bg"
                  >
                    Resume
                  </button>
                  <button type="button" onClick={begin} className="h-11 rounded-full border border-line px-6 text-[14px] hover:border-accent">
                    Restart
                  </button>
                </div>
                <p className="mt-4 font-mono text-[11px] text-dim">press P to resume</p>
              </Overlay>
            )}

            {phase === "gameover" && result && (
              <Overlay key="over" scroll>
                <p className="mb-2 font-mono text-[11px] text-coral">{"// build failed"}</p>
                <h3 className="text-[clamp(1.4rem,4.5vw,1.9rem)] font-semibold leading-tight tracking-tight">Deployment halted at wave {result.wave}</h3>
                <p className="mt-3 font-mono text-[clamp(2.2rem,8vw,3rem)] font-bold leading-none tracking-tight text-accent">{pad(result.score)}</p>

                <dl className="mx-auto mt-4 grid w-full max-w-[300px] grid-cols-2 gap-x-4 gap-y-1 text-left font-mono text-[11px]">
                  <Stat label="squashed" value={totalKills} />
                  <Stat label="accuracy" value={`${accuracy}%`} />
                  <Stat label="max combo" value={result.maxCombo} />
                  <Stat label="monoliths" value={result.bossesDefeated} />
                  <Stat label="power-ups" value={result.powerUps} />
                  <Stat label="shipped bugs" value={result.escaped} />
                </dl>

                {askInitials ? (
                  <form onSubmit={saveInitials} className="mx-auto mt-5 flex w-full max-w-[300px] flex-col items-center gap-2">
                    <label htmlFor="pd-initials" className="font-mono text-[11px] text-text">
                      new high score. enter your initials
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="pd-initials"
                        ref={initialsRef}
                        value={initials}
                        onChange={(e) => setInitials(e.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 3))}
                        maxLength={3}
                        autoComplete="off"
                        autoCapitalize="characters"
                        spellCheck={false}
                        className="h-11 w-24 rounded-[12px] border border-line bg-bg text-center font-mono text-[18px] tracking-[0.3em] text-text outline-none focus:border-accent"
                        placeholder="AAA"
                      />
                      <button type="submit" className="h-11 rounded-full bg-text px-5 text-[14px] font-medium text-bg hover:bg-accent">
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  <ScoreTable scores={scores} highlight={savedAt} />
                )}

                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <button
                    ref={askInitials ? undefined : actionRef}
                    type="button"
                    onClick={begin}
                    className="h-11 rounded-full bg-accent px-6 text-[14px] font-medium text-bg"
                  >
                    Play again
                  </button>
                  <button type="button" onClick={share} className="h-11 min-w-[124px] rounded-full border border-line px-5 text-[14px] hover:border-accent">
                    {shared ? "Copied!" : "Share score"}
                  </button>
                </div>
              </Overlay>
            )}
          </AnimatePresence>
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}

function Overlay({ children, scroll }: { children: React.ReactNode; scroll?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 flex flex-col items-center overflow-y-auto bg-bg/75 p-5 text-center backdrop-blur-[3px] sm:p-7"
      data-lenis-prevent={scroll ? "" : undefined}
    >
      <motion.div
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        className="my-auto flex w-full flex-col items-center"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <>
      <dt className="text-dim">{label}</dt>
      <dd className="text-right text-text">{value}</dd>
    </>
  );
}

function ScoreTable({ scores, highlight }: { scores: ScoreEntry[]; highlight: number | null }) {
  if (!scores.length) return null;
  return (
    <div className="mx-auto mt-5 w-full max-w-[300px]">
      <p className="mb-1.5 text-left font-mono text-[11px] text-dim">top 5</p>
      <ol className="space-y-0.5 font-mono text-[12px]">
        {scores.map((s, i) => (
          <li
            key={s.date + s.initials}
            className={`flex justify-between rounded-md px-2 py-1 ${s.date === highlight ? "bg-accent text-bg" : "text-muted"}`}
          >
            <span>
              {i + 1}. {s.initials}
            </span>
            <span>
              w{String(s.wave).padStart(2, "0")} {pad(s.score)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function SpeakerIcon({ on }: { on: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2 5h2.5L8 2v10L4.5 9H2z" fill="currentColor" />
      {on ? (
        <path d="M10 4.5c.8.7 1.2 1.6 1.2 2.5s-.4 1.8-1.2 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      ) : (
        <path d="M10 5l3 4M13 5l-3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      )}
    </svg>
  );
}
