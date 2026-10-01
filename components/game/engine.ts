import { Sound } from "./audio";
import { Input } from "./input";
import { render } from "./renderer";
import {
  C,
  ENEMY_DEFS,
  POWER_DEFS,
  createBoss,
  createEnemy,
  createPowerUp,
  createSmallLeak,
  createSpaghetti,
  createStar,
  createStars,
  randomCodeChar,
  type Bolt,
  type Boss,
  type Enemy,
  type FloatText,
  type Particle,
  type PowerUp,
  type Spaghetti,
  type Star,
} from "./entities";
import { H, W, emptyKills, type EnemyKind, type GameCallbacks, type Phase, type PowerKind, type Stats } from "./types";

export type Player = { x: number; y: number; r: number; cooldown: number; invuln: number; tilt: number; dead: boolean; deathT: number };
type TimedPower = Extract<PowerKind, "tests" | "ci" | "review">;
type Banner = { title: string; sub: string; t: number; max: number };

const MAX_LIVES = 5;
const MAX_PARTICLES = 700;
const WAVE_LINES = [
  "bugs reported in staging",
  "race conditions detected",
  "memory usage climbing",
  "404s and infinite loops",
  "",
  "post-mortem pending",
  "it's friday, deploy anyway",
  "pager is buzzing",
  "the logs are on fire",
];

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function prune<T>(arr: T[], keep: (item: T) => boolean) {
  let j = 0;
  for (let i = 0; i < arr.length; i++) if (keep(arr[i])) arr[j++] = arr[i];
  arr.length = j;
}

type Options = { reducedMotion: boolean; accent: () => string; font: string };

/** Production Defense: canvas arcade shooter. Owns state, update loop and collisions; drawing lives in renderer.ts. */
export class Game {
  phase: Phase = "start";
  ctx: CanvasRenderingContext2D;
  dpr = 1;
  scale = 1;
  font: string;
  reducedMotion: boolean;
  accent: () => string;
  sound = new Sound();
  input: Input;

  player: Player = this.newPlayer();
  bolts: Bolt[] = [];
  enemies: Enemy[] = [];
  spaghetti: Spaghetti[] = [];
  powerUps: PowerUp[] = [];
  particles: Particle[] = [];
  texts: FloatText[] = [];
  stars: Star[] = createStars(80);
  boss: Boss | null = null;

  score = 0;
  wave = 0;
  lives = 3;
  combo = 0;
  multiplier = 1;
  comboPulse = 0;
  shake = 0;
  flash = 0;
  flashColor = C.coral;
  sweep = 0;
  time = 0;
  timers: Record<TimedPower, number> = { tests: 0, ci: 0, review: 0 };
  banner: Banner | null = null;
  stats: Stats = this.newStats();

  private queue: EnemyKind[] = [];
  private spawnTimer = 0;
  private spawnInterval = 1;
  private speedMul = 1;
  private bossPending = false;
  private intermission = 0;
  private raf = 0;
  private last = 0;
  private running = false;
  private active = true;

  constructor(
    private canvas: HTMLCanvasElement,
    frame: HTMLElement,
    private cb: GameCallbacks,
    opts: Options,
  ) {
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.reducedMotion = opts.reducedMotion;
    this.accent = opts.accent;
    this.font = opts.font;
    this.input = new Input(frame, canvas, {
      onPause: () => this.togglePause(),
      canPause: () => this.phase === "playing" || this.phase === "paused",
      isPlaying: () => this.phase === "playing",
      shipPos: () => ({ x: this.player.x, y: this.player.y }),
    });
    this.startLoop();
  }

  /* ---------- Lifecycle ---------- */

  start() {
    this.player = this.newPlayer();
    this.bolts = [];
    this.enemies = [];
    this.spaghetti = [];
    this.powerUps = [];
    this.texts = [];
    this.boss = null;
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.multiplier = 1;
    this.timers = { tests: 0, ci: 0, review: 0 };
    this.stats = this.newStats();
    this.bossPending = false;
    this.intermission = 0;
    this.input.reset();
    this.setPhase("playing");
    this.beginWave(1);
    this.startLoop();
  }

  pause() {
    if (this.phase !== "playing") return;
    this.input.reset();
    this.setPhase("paused");
  }

  resume() {
    if (this.phase !== "paused" || !this.active) return;
    this.setPhase("playing");
    this.startLoop();
  }

  togglePause() {
    if (this.phase === "playing") this.pause();
    else if (this.phase === "paused") this.resume();
  }

  /** Called when the game scrolls out of view or the tab is hidden. */
  setActive(active: boolean) {
    this.active = active;
    if (!active) {
      this.pause();
      this.stopLoop();
    } else {
      this.startLoop();
    }
  }

  resize(cssWidth: number, cssHeight: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(cssWidth * this.dpr);
    this.canvas.height = Math.round(cssHeight * this.dpr);
    this.scale = cssWidth / W;
    render(this);
  }

  destroy() {
    this.stopLoop();
    this.input.destroy();
  }

  private setPhase(phase: Phase) {
    this.phase = phase;
    this.cb.onPhase(phase);
  }

  private startLoop() {
    if (this.running || !this.active) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
  }

  private stopLoop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private frame = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 1 / 30);
    this.last = now;
    this.time += dt;
    if (this.phase === "playing") this.update(dt);
    else if (this.phase !== "paused") this.ambient(dt);
    render(this);
    if (this.phase === "paused") {
      this.running = false; // frozen frame; resume() restarts the loop
      return;
    }
    this.raf = requestAnimationFrame(this.frame);
  };

  /* ---------- Update ---------- */

  private ambient(dt: number) {
    this.updateStars(dt);
    this.updateFx(dt);
  }

  private update(dt: number) {
    const slow = this.timers.review > 0 ? 0.45 : 1;
    const edt = dt * slow;
    this.stats.time += dt;

    for (const k of Object.keys(this.timers) as TimedPower[]) this.timers[k] = Math.max(0, this.timers[k] - dt);

    this.updateStars(dt * (slow < 1 ? 0.5 : 1));
    this.updatePlayer(dt);
    this.updateWave(dt, slow);
    for (const e of this.enemies) this.updateEnemy(e, edt);
    if (this.boss) this.updateBoss(this.boss, edt);
    this.updateSpaghetti(edt);
    this.updateBolts(dt);
    this.updatePowerUps(dt);
    this.collide();
    this.updateFx(dt);

    prune(this.enemies, (e) => !e.dead);
    prune(this.bolts, (b) => !b.dead);
    prune(this.spaghetti, (s) => !s.dead);
    prune(this.powerUps, (p) => !p.dead);
  }

  private updateFx(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.vx *= Math.pow(0.08, dt);
      p.vy *= Math.pow(0.08, dt);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    prune(this.particles, (p) => p.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y -= 34 * dt;
    }
    prune(this.texts, (t) => t.life > 0);
    this.shake = Math.max(0, this.shake * Math.pow(0.002, dt) - dt);
    this.flash = Math.max(0, this.flash - dt * 1.8);
    this.comboPulse = Math.max(0, this.comboPulse - dt * 3);
    this.sweep = Math.max(0, this.sweep - dt * 1.6);
    if (this.banner) {
      this.banner.t -= dt;
      if (this.banner.t <= 0) this.banner = null;
    }
  }

  private updateStars(dt: number) {
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      s.y += s.speed * dt;
      if (s.y > H + 12) this.stars[i] = createStar();
    }
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    if (p.dead) {
      p.deathT -= dt;
      if (p.deathT <= 0) this.endGame();
      return;
    }
    const inp = this.input;
    let dir = 0;
    if (inp.target) {
      const tx = clamp(inp.target.x, 16, W - 16);
      const ty = clamp(inp.target.y, H * 0.38, H - 26);
      const maxStep = 700 * dt;
      const k = 1 - Math.pow(0.00005, dt);
      const dx = clamp((tx - p.x) * k, -maxStep, maxStep);
      const dy = clamp((ty - p.y) * k, -maxStep, maxStep);
      p.x += dx;
      p.y += dy;
      dir = clamp(dx / (maxStep * 0.5 || 1), -1, 1);
    } else {
      const dx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const dy = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
      p.x += dx * 340 * dt;
      p.y += dy * 300 * dt;
      dir = dx;
    }
    p.x = clamp(p.x, 16, W - 16);
    p.y = clamp(p.y, H * 0.38, H - 26);
    p.tilt += (dir - p.tilt) * Math.min(1, dt * 12);
    p.invuln = Math.max(0, p.invuln - dt);

    p.cooldown -= dt;
    if (inp.shouldFire && p.cooldown <= 0) this.fire();
  }

  private fire() {
    const p = this.player;
    const rapid = this.timers.ci > 0;
    if (rapid) {
      this.bolts.push({ x: p.x - 7, y: p.y - 12, vx: -30, vy: -760, dead: false });
      this.bolts.push({ x: p.x + 7, y: p.y - 12, vx: 30, vy: -760, dead: false });
      this.bolts.push({ x: p.x, y: p.y - 18, vx: 0, vy: -800, dead: false });
      this.stats.shots += 3;
      p.cooldown = 0.085;
    } else {
      this.bolts.push({ x: p.x, y: p.y - 18, vx: 0, vy: -680, dead: false });
      this.stats.shots += 1;
      p.cooldown = this.wave >= 6 ? 0.14 : 0.165;
    }
    this.sound.shoot();
  }

  private updateBolts(dt: number) {
    for (const b of this.bolts) {
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      if (b.y < -20 || b.x < -10 || b.x > W + 10) b.dead = true;
    }
  }

  private beginWave(n: number) {
    this.wave = n;
    this.stats.wave = n;
    this.speedMul = Math.min(1 + (n - 1) * 0.065, 2.1);
    const label = `WAVE ${String(n).padStart(2, "0")}`;
    if (n % 5 === 0) {
      this.bossPending = true;
      this.queue = [];
      this.showBanner(label, "legacy monolith incoming", 2.2);
      this.sound.bossAlarm();
    } else {
      this.queue = this.buildQueue(n);
      this.spawnInterval = Math.max(0.3, 1.1 - n * 0.055);
      this.spawnTimer = 1.5;
      this.showBanner(label, WAVE_LINES[(n - 1) % WAVE_LINES.length] || "keep shipping", 1.6);
      this.sound.wave();
    }
  }

  private buildQueue(n: number): EnemyKind[] {
    const pool: [EnemyKind, number][] = [["bug", 5]];
    if (n >= 2) pool.push(["race", 3]);
    if (n >= 3) pool.push(["leak", 2.2]);
    if (n >= 4) pool.push(["ghost", 2], ["loop", 1.8]);
    const total = pool.reduce((a, [, w]) => a + w, 0);
    const count = Math.min(9 + n * 3, 48);
    const q: EnemyKind[] = [];
    // Introduce the newest enemy type early in the wave so it gets noticed.
    if (n === 2) q.push("race", "race");
    if (n === 3) q.push("leak");
    if (n === 4) q.push("ghost", "loop");
    while (q.length < count) {
      let r = Math.random() * total;
      for (const [k, w] of pool) {
        r -= w;
        if (r <= 0) {
          q.push(k);
          break;
        }
      }
    }
    return q;
  }

  private updateWave(dt: number, slow: number) {
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) this.beginWave(this.wave + 1);
      return;
    }
    if (this.bossPending) {
      if (!this.banner || this.banner.t < 0.4) {
        this.boss = createBoss(Math.max(1, Math.round(this.wave / 5)));
        this.bossPending = false;
      }
      return;
    }
    if (this.queue.length) {
      this.spawnTimer -= dt * slow;
      if (this.spawnTimer <= 0) {
        const kind = this.queue.shift()!;
        if (kind === "bug" && this.wave >= 3 && Math.random() < 0.22 && this.queue.length > 2) {
          // Small formation of three bugs.
          const x = 60 + Math.random() * (W - 120);
          this.queue.splice(0, 2);
          [-34, 0, 34].forEach((o, i) => this.enemies.push(createEnemy("bug", this.speedMul, x + o, -24 - Math.abs(i - 1) * 18)));
        } else {
          const e = createEnemy(kind, this.speedMul);
          if (kind === "loop") e.cy = -20 - e.orbitR;
          this.enemies.push(e);
        }
        this.spawnTimer = this.spawnInterval * (0.55 + Math.random() * 0.9);
      }
    } else if (!this.boss && this.enemies.length === 0 && !this.player.dead) {
      const bonus = 250 * this.wave;
      this.score += bonus;
      this.showBanner("WAVE CLEAR", `+${bonus} stability bonus`, 1.6);
      this.sound.wave();
      this.intermission = 1.9;
    }
  }

  private updateEnemy(e: Enemy, dt: number) {
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt);
    switch (e.kind) {
      case "bug":
        e.y += e.vy * dt;
        e.x += Math.sin(e.t * 2 + e.seed) * 10 * dt;
        break;
      case "race":
        e.turn -= dt;
        if (e.turn <= 0) {
          e.vx = (Math.random() < 0.5 ? -1 : 1) * (100 + Math.random() * 170) * this.speedMul;
          e.vy = ENEMY_DEFS.race.speed * this.speedMul * (0.6 + Math.random() * 0.9);
          e.turn = 0.15 + Math.random() * 0.55;
        }
        e.x += e.vx * dt;
        e.y += e.vy * dt;
        if (e.x < e.r || e.x > W - e.r) {
          e.vx *= -1;
          e.x = clamp(e.x, e.r, W - e.r);
        }
        break;
      case "leak":
        e.x += e.vx * dt;
        e.vx *= Math.pow(0.5, dt);
        e.y += e.vy * dt;
        if (e.x < e.r || e.x > W - e.r) {
          e.vx *= -1;
          e.x = clamp(e.x, e.r, W - e.r);
        }
        if (Math.random() < dt * 3) this.spawnParticle(e.x + (Math.random() - 0.5) * 6, e.y + e.r, 0, 40, ENEMY_DEFS.leak.color, 0.5, 2);
        break;
      case "ghost": {
        e.y += e.vy * dt;
        e.x += Math.sin(e.t * 1.3 + e.seed) * 34 * dt;
        const cycle = (e.t + e.seed) % 2.6;
        e.visible = cycle < 1.7;
        break;
      }
      case "loop": {
        e.cy += e.vy * dt;
        const a = e.t * 2.6 + e.seed;
        e.x = e.cx + Math.cos(a) * e.orbitR;
        e.y = e.cy + Math.sin(a) * e.orbitR;
        break;
      }
    }
    if (e.y - e.r > H) {
      e.dead = true;
      this.escaped(e);
    }
  }

  private updateBoss(b: Boss, dt: number) {
    b.t += dt;
    b.flash = Math.max(0, b.flash - dt);
    if (b.entering) {
      b.y += 70 * dt;
      if (b.y >= 120) {
        b.y = 120;
        b.entering = false;
      }
      return;
    }
    const ratio = b.hp / b.maxHp;
    const phase = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
    if (phase > b.phase) {
      b.phase = phase;
      this.showBanner(`PHASE ${phase}`, phase === 2 ? "tech debt accruing" : "production is on fire", 1.4);
      this.addShake(10);
      this.sound.bossAlarm();
      this.explode(b.x, b.y, phase === 2 ? C.coral : C.yellow, 40, 260);
    }
    const speed = [0, 60, 95, 140][b.phase] * (1 + (b.level - 1) * 0.15);
    b.x += Math.sign(b.vx) * speed * dt;
    const limit = W / 2 - b.w / 2 - 10;
    if (b.x < W / 2 - limit || b.x > W / 2 + limit) {
      b.vx *= -1;
      b.x = clamp(b.x, W / 2 - limit, W / 2 + limit);
    }
    b.y = 120 + Math.sin(b.t * 0.9) * (b.phase === 3 ? 18 : 10);

    b.fireTimer -= dt;
    if (b.fireTimer <= 0) {
      const ox = b.x;
      const oy = b.y + b.h / 2;
      const lvl = 1 + (b.level - 1) * 0.1;
      if (b.phase === 1) {
        [-0.28, 0, 0.28].forEach((a) => this.spaghetti.push(createSpaghetti(ox, oy, a, 150 * lvl)));
        b.fireTimer = 1.5;
      } else if (b.phase === 2) {
        [-0.56, -0.28, 0, 0.28, 0.56].forEach((a) => this.spaghetti.push(createSpaghetti(ox, oy, a, 165 * lvl)));
        b.fireTimer = 1.2;
      } else {
        if (b.volley % 2 === 0) {
          const aim = Math.atan2(this.player.x - ox, this.player.y - oy);
          [-0.16, 0, 0.16].forEach((a) => this.spaghetti.push(createSpaghetti(ox, oy, aim + a, 205 * lvl)));
        } else {
          for (let i = 0; i < 7; i++) {
            const a = -1.1 + (i / 6) * 2.2;
            this.spaghetti.push(createSpaghetti(ox, oy, a, 150 * lvl));
          }
        }
        b.fireTimer = 0.8;
      }
      b.volley++;
      this.sound.bossShot();
    }

    if (b.phase >= 2) {
      b.minionTimer -= dt;
      if (b.minionTimer <= 0) {
        this.enemies.push(createEnemy("bug", this.speedMul, b.x - b.w / 2 + 14, b.y + b.h / 2));
        this.enemies.push(createEnemy("bug", this.speedMul, b.x + b.w / 2 - 14, b.y + b.h / 2));
        b.minionTimer = b.phase === 3 ? 2.6 : 3.6;
      }
    }
  }

  private updateSpaghetti(dt: number) {
    for (const s of this.spaghetti) {
      s.t += dt;
      s.bx += s.vx * dt;
      s.by += s.vy * dt;
      const len = Math.hypot(s.vx, s.vy) || 1;
      const off = Math.sin(s.t * s.freq) * s.amp;
      s.x = s.bx + (-s.vy / len) * off;
      s.y = s.by + (s.vx / len) * off;
      if (s.y > H + 30 || s.y < -40 || s.x < -30 || s.x > W + 30) s.dead = true;
    }
  }

  private updatePowerUps(dt: number) {
    for (const p of this.powerUps) {
      p.t += dt;
      p.y += p.vy * dt;
      if (p.y > H + 20) p.dead = true;
    }
  }

  /* ---------- Collisions ---------- */

  private collide() {
    const p = this.player;
    const b = this.boss;

    for (const bolt of this.bolts) {
      if (bolt.dead) continue;
      if (b && b.y > 0 && Math.abs(bolt.x - b.x) < b.w / 2 && Math.abs(bolt.y - b.y) < b.h / 2) {
        bolt.dead = true;
        this.stats.hits++;
        this.damageBoss(1, bolt.x, bolt.y);
        continue;
      }
      for (const e of this.enemies) {
        if (e.dead || (e.kind === "ghost" && !e.visible)) continue;
        const dx = bolt.x - e.x;
        const dy = bolt.y - e.y;
        const rr = e.r + 4;
        if (dx * dx + dy * dy < rr * rr) {
          bolt.dead = true;
          this.stats.hits++;
          e.hp--;
          e.flash = 0.08;
          this.spawnParticle(bolt.x, bolt.y, (Math.random() - 0.5) * 120, 60, C.text, 0.2, 2);
          if (e.hp <= 0) this.killEnemy(e, true);
          else this.sound.hit();
          break;
        }
      }
    }

    if (p.dead) return;

    for (const e of this.enemies) {
      if (e.dead) continue;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const rr = e.r + p.r - 2;
      if (dx * dx + dy * dy < rr * rr && (e.kind !== "ghost" || e.visible)) {
        if (this.timers.tests > 0) {
          this.killEnemy(e, true);
        } else if (this.hitPlayer()) {
          this.killEnemy(e, false);
        }
      }
    }

    for (const s of this.spaghetti) {
      const dx = p.x - s.x;
      const dy = p.y - s.y;
      const rr = p.r * 0.55 + 3; // forgiving hitbox, smaller than the sprite
      if (dx * dx + dy * dy < rr * rr) {
        s.dead = true;
        if (this.timers.tests > 0) this.explode(s.x, s.y, C.cyan, 6, 120);
        else this.hitPlayer();
      }
    }

    if (b && !b.entering) {
      if (Math.abs(p.x - b.x) < b.w / 2 + p.r - 4 && Math.abs(p.y - b.y) < b.h / 2 + p.r - 4) this.hitPlayer();
    }

    for (const pu of this.powerUps) {
      const dx = p.x - pu.x;
      const dy = p.y - pu.y;
      if (dx * dx + dy * dy < 26 * 26) {
        pu.dead = true;
        this.applyPower(pu.kind, pu.x, pu.y);
      }
    }
  }

  private killEnemy(e: Enemy, scored: boolean) {
    if (e.dead) return;
    e.dead = true;
    const def = ENEMY_DEFS[e.kind];
    const base = e.kind === "leak" && e.size === 1 ? 60 : def.score;
    if (scored) {
      this.combo++;
      this.stats.maxCombo = Math.max(this.stats.maxCombo, this.combo);
      const m = Math.min(8, 1 + Math.floor(this.combo / 5));
      if (m > this.multiplier) {
        this.comboPulse = 1;
        this.sound.combo(m);
      }
      this.multiplier = m;
      const pts = base * this.multiplier;
      this.score += pts;
      this.stats.kills[e.kind]++;
      this.addText(e.x, e.y - 8, `+${pts}`, this.multiplier > 1 ? this.accent() : C.text, 13);
      const dropChance = e.kind === "leak" && e.size === 1 ? 0.03 : 0.085;
      if (Math.random() < dropChance) this.powerUps.push(createPowerUp(e.x, e.y));
    }
    this.explode(e.x, e.y, def.color, e.size === 1 ? 10 : 20, 220);
    this.addShake(2.5);
    this.sound.explode(false);

    if (e.kind === "leak" && e.size === 2) {
      this.enemies.push(createSmallLeak(e, -1), createSmallLeak(e, 1));
    }
  }

  private damageBoss(amount: number, x: number, y: number) {
    const b = this.boss;
    if (!b) return;
    b.hp -= amount;
    b.flash = 0.06;
    this.score += 10 * amount;
    this.spawnParticle(x, y, (Math.random() - 0.5) * 160, 80, b.phase === 3 ? C.coral : C.yellow, 0.3, 2.5);
    if (Math.random() < 0.3) this.sound.hit();
    if (b.hp <= 0) this.killBoss();
  }

  private killBoss() {
    const b = this.boss!;
    const pts = 5000 * b.level;
    this.score += pts;
    this.stats.bossesDefeated++;
    for (let i = 0; i < 6; i++) {
      this.explode(b.x + (Math.random() - 0.5) * b.w, b.y + (Math.random() - 0.5) * b.h, [C.yellow, C.coral, C.text][i % 3], 30, 340);
    }
    this.addText(b.x, b.y, `+${pts}`, this.accent(), 22);
    this.showBanner("MONOLITH DECOMPOSED", "into microservices. nice.", 2);
    this.addShake(22);
    this.flash = 0.5;
    this.flashColor = C.text;
    this.sound.explode(true);
    for (const s of this.spaghetti) this.explode(s.x, s.y, C.yellow, 4, 80);
    this.spaghetti.length = 0;
    this.powerUps.push(createPowerUp(b.x - 30, b.y, "hotfix"), createPowerUp(b.x + 30, b.y));
    this.boss = null;
  }

  private hitPlayer(): boolean {
    const p = this.player;
    if (p.dead || p.invuln > 0 || this.timers.tests > 0) return false;
    this.lives--;
    this.combo = 0;
    this.multiplier = 1;
    p.invuln = 1.8;
    this.addShake(12);
    this.flash = 0.4;
    this.flashColor = C.coral;
    this.sound.hurt();
    this.explode(p.x, p.y, C.coral, 24, 260);
    if (this.lives <= 0) {
      p.dead = true;
      p.deathT = 1.5;
      this.explode(p.x, p.y, this.accent(), 60, 380);
      this.explode(p.x, p.y, C.text, 30, 240);
      this.sound.explode(true);
      this.addShake(20);
    }
    return true;
  }

  private escaped(e: Enemy) {
    if (this.player.dead) return;
    this.stats.escaped++;
    this.score = Math.max(0, this.score - 50);
    this.combo = 0;
    this.multiplier = 1;
    this.addText(clamp(e.x, 50, W - 50), H - 16, `-50 ${ENEMY_DEFS[e.kind].name.toLowerCase()} shipped`, C.coral, 10);
    this.addShake(3);
  }

  private applyPower(kind: PowerKind, x: number, y: number) {
    const def = POWER_DEFS[kind];
    this.stats.powerUps++;
    this.sound.power();
    this.addText(x, y - 10, def.name.toUpperCase(), def.color, 12);
    this.explode(x, y, def.color, 16, 180);
    switch (kind) {
      case "tests":
      case "ci":
      case "review":
        this.timers[kind] = def.duration;
        break;
      case "refactor":
        this.sweep = 1;
        this.flash = 0.25;
        this.flashColor = C.yellow;
        for (const e of this.enemies) this.killEnemy(e, true);
        for (const s of this.spaghetti) this.explode(s.x, s.y, C.yellow, 4, 80);
        this.spaghetti.length = 0;
        if (this.boss) this.damageBoss(Math.ceil(this.boss.maxHp * 0.12), this.boss.x, this.boss.y);
        this.addShake(8);
        break;
      case "hotfix":
        if (this.lives < MAX_LIVES) this.lives++;
        else this.score += 1000;
        break;
    }
  }

  private endGame() {
    this.stats.score = this.score;
    this.stats.wave = this.wave;
    this.sound.gameOver();
    this.setPhase("gameover");
    this.cb.onGameOver({ ...this.stats, kills: { ...this.stats.kills } });
  }

  /* ---------- Juice helpers ---------- */

  private spawnParticle(x: number, y: number, vx: number, vy: number, color: string, life: number, size: number, char?: string) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({ x, y, vx, vy, life, max: life, color, size, char });
  }

  explode(x: number, y: number, color: string, count: number, speed: number) {
    const n = this.reducedMotion ? Math.ceil(count / 2) : count;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.25 + Math.random() * 0.75);
      const char = Math.random() < 0.18 ? randomCodeChar() : undefined;
      this.spawnParticle(x, y, Math.cos(a) * s, Math.sin(a) * s, color, 0.35 + Math.random() * 0.5, 1.5 + Math.random() * 2.5, char);
    }
  }

  private addText(x: number, y: number, text: string, color: string, size: number) {
    this.texts.push({ x, y, text, color, life: 0.9, max: 0.9, size });
  }

  private addShake(amount: number) {
    if (this.reducedMotion) return;
    this.shake = Math.min(24, this.shake + amount);
  }

  private showBanner(title: string, sub: string, duration: number) {
    this.banner = { title, sub, t: duration, max: duration };
  }

  private newPlayer(): Player {
    return { x: W / 2, y: H - 70, r: 12, cooldown: 0.3, invuln: 1.2, tilt: 0, dead: false, deathT: 0 };
  }

  private newStats(): Stats {
    return { score: 0, wave: 1, kills: emptyKills(), bossesDefeated: 0, shots: 0, hits: 0, maxCombo: 0, powerUps: 0, escaped: 0, time: 0 };
  }
}
