import { H, W, type EnemyKind, type PowerKind } from "./types";

/* ---------- Palette ---------- */
export const C = {
  bg: "#0B0D0A",
  surface: "#11140F",
  surfaceHover: "#151912",
  line: "#2A3124",
  lineSubtle: "#1F241B",
  text: "#EDEFE8",
  muted: "#B4BAAA",
  dim: "#8A9180",
  lime: "#C6F432",
  coral: "#FF8A5B",
  cyan: "#5BE7FF",
  purple: "#B69CFF",
  yellow: "#FFD84B",
};

/* ---------- Enemies ---------- */
export const ENEMY_DEFS: Record<EnemyKind, { name: string; color: string; r: number; hp: number; score: number; speed: number; blurb: string }> = {
  bug: { name: "Bug", color: C.coral, r: 13, hp: 1, score: 100, speed: 72, blurb: "falls straight down" },
  race: { name: "Race Condition", color: C.yellow, r: 12, hp: 1, score: 150, speed: 76, blurb: "zig-zags unpredictably" },
  leak: { name: "Memory Leak", color: C.purple, r: 17, hp: 2, score: 120, speed: 54, blurb: "splits in two when hit" },
  ghost: { name: "404 Ghost", color: C.cyan, r: 14, hp: 1, score: 200, speed: 66, blurb: "flickers out of sight" },
  loop: { name: "Infinite Loop", color: C.lime, r: 14, hp: 2, score: 250, speed: 44, blurb: "circles while descending" },
};

export type Enemy = {
  kind: EnemyKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hp: number;
  t: number;
  flash: number;
  seed: number;
  /** Memory leak size: 2 = big, 1 = small. */
  size: number;
  /** Infinite loop orbit center. */
  cx: number;
  cy: number;
  orbitR: number;
  /** Race condition: time until next direction change. */
  turn: number;
  /** Ghost visibility. */
  visible: boolean;
  dead: boolean;
};

export function createEnemy(kind: EnemyKind, speedMul: number, x?: number, y = -24): Enemy {
  const d = ENEMY_DEFS[kind];
  const ex = x ?? 30 + Math.random() * (W - 60);
  const e: Enemy = {
    kind,
    x: ex,
    y,
    vx: 0,
    vy: d.speed * speedMul * (0.85 + Math.random() * 0.3),
    r: d.r,
    hp: d.hp,
    t: Math.random() * 10,
    flash: 0,
    seed: Math.random() * 1000,
    size: 2,
    cx: ex,
    cy: y,
    orbitR: 26 + Math.random() * 16,
    turn: 0.2 + Math.random() * 0.5,
    visible: true,
    dead: false,
  };
  if (kind === "race") e.vx = (Math.random() < 0.5 ? -1 : 1) * (110 + Math.random() * 90) * speedMul;
  if (kind === "loop") {
    e.cx = Math.max(60, Math.min(W - 60, ex));
    e.vy *= 0.9;
  }
  return e;
}

export function createSmallLeak(parent: Enemy, dir: number): Enemy {
  const e = createEnemy("leak", 1, parent.x, parent.y);
  e.size = 1;
  e.r = 10;
  e.hp = 1;
  e.vx = dir * (90 + Math.random() * 40);
  e.vy = parent.vy * 1.15 + 10;
  return e;
}

/* ---------- Boss ---------- */
export type Boss = {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  t: number;
  flash: number;
  phase: 1 | 2 | 3;
  fireTimer: number;
  minionTimer: number;
  vx: number;
  entering: boolean;
  level: number;
  volley: number;
};

export function createBoss(level: number): Boss {
  const maxHp = 45 + level * 25;
  return {
    x: W / 2,
    y: -80,
    w: 176,
    h: 96,
    hp: maxHp,
    maxHp,
    t: 0,
    flash: 0,
    phase: 1,
    fireTimer: 2,
    minionTimer: 3,
    vx: 60,
    entering: true,
    level,
    volley: 0,
  };
}

/* ---------- Projectiles ---------- */
export type Bolt = { x: number; y: number; vx: number; vy: number; dead: boolean };

/** Spaghetti code fired by the boss: travels along a line with a sine wobble. */
export type Spaghetti = { bx: number; by: number; vx: number; vy: number; t: number; amp: number; freq: number; x: number; y: number; dead: boolean };

export function createSpaghetti(x: number, y: number, angle: number, speed: number): Spaghetti {
  return {
    bx: x,
    by: y,
    vx: Math.sin(angle) * speed,
    vy: Math.cos(angle) * speed,
    t: Math.random() * 2,
    amp: 7 + Math.random() * 6,
    freq: 7 + Math.random() * 4,
    x,
    y,
    dead: false,
  };
}

/* ---------- Power-ups ---------- */
export const POWER_DEFS: Record<PowerKind, { name: string; tag: string; color: string; duration: number; blurb: string }> = {
  tests: { name: "Unit Tests", tag: "UT", color: C.cyan, duration: 5, blurb: "shield for 5s" },
  ci: { name: "CI Pipeline", tag: "CI", color: C.lime, duration: 6, blurb: "rapid fire" },
  review: { name: "Code Review", tag: "CR", color: C.purple, duration: 5, blurb: "slow motion" },
  refactor: { name: "Refactor", tag: "RF", color: C.yellow, duration: 0, blurb: "clears the screen" },
  hotfix: { name: "Hotfix", tag: "HF", color: C.coral, duration: 0, blurb: "extra life" },
};

export type PowerUp = { kind: PowerKind; x: number; y: number; vy: number; t: number; dead: boolean };

export function createPowerUp(x: number, y: number, kind?: PowerKind): PowerUp {
  const kinds: PowerKind[] = ["tests", "ci", "review", "refactor", "hotfix"];
  const weights = [3, 3, 2, 1.2, 1];
  let k = kind;
  if (!k) {
    let r = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < kinds.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        k = kinds[i];
        break;
      }
    }
  }
  return { kind: k ?? "tests", x, y, vy: 80, t: 0, dead: false };
}

/* ---------- Juice ---------- */
export type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; char?: string };
export type FloatText = { x: number; y: number; text: string; color: string; life: number; max: number; size: number };
export type Star = { x: number; y: number; speed: number; char: string; layer: number };

const CODE_CHARS = "01{}();<>/=+*&|[]$#".split("");

export function createStars(count: number): Star[] {
  return Array.from({ length: count }, () => createStar(Math.random() * H));
}

export function createStar(y = -10): Star {
  const layer = Math.random() < 0.55 ? 0 : Math.random() < 0.7 ? 1 : 2;
  return {
    x: Math.random() * W,
    y,
    speed: [14, 32, 64][layer] * (0.8 + Math.random() * 0.4),
    char: CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0],
    layer,
  };
}

export const randomCodeChar = () => CODE_CHARS[(Math.random() * CODE_CHARS.length) | 0];
