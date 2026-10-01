export const W = 480; // logical width
export const H = 640; // logical height

export type Phase = "start" | "playing" | "paused" | "gameover";
export type EnemyKind = "bug" | "race" | "leak" | "ghost" | "loop";
export type PowerKind = "tests" | "ci" | "review" | "refactor" | "hotfix";

export type Stats = {
  score: number;
  wave: number;
  kills: Record<EnemyKind, number>;
  bossesDefeated: number;
  shots: number;
  hits: number;
  maxCombo: number;
  powerUps: number;
  escaped: number;
  time: number;
};

export type GameCallbacks = {
  onPhase: (phase: Phase) => void;
  onGameOver: (stats: Stats) => void;
};

export const emptyKills = (): Record<EnemyKind, number> => ({ bug: 0, race: 0, leak: 0, ghost: 0, loop: 0 });
