import type { Game } from "./engine";
import { C, ENEMY_DEFS, POWER_DEFS, type Boss, type Enemy } from "./entities";
import { H, W } from "./types";

const STAR_STYLE = [
  { size: 9, color: "rgba(138,145,128,0.16)", parallax: 0.02 },
  { size: 11, color: "rgba(138,145,128,0.28)", parallax: 0.05 },
  { size: 13, color: "rgba(180,186,170,0.4)", parallax: 0.1 },
];

export function render(g: Game) {
  const ctx = g.ctx;
  const k = g.dpr * g.scale;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, W, H);

  drawStars(g, ctx);

  ctx.save();
  if (g.shake > 0.1) ctx.translate((Math.random() - 0.5) * g.shake, (Math.random() - 0.5) * g.shake);

  for (const p of g.powerUps) drawPowerUp(ctx, g, p.kind, p.x, p.y, p.t);
  for (const e of g.enemies) drawEnemy(ctx, g, e);
  if (g.boss) drawBoss(ctx, g, g.boss);
  drawSpaghetti(ctx, g);
  drawBolts(ctx, g);
  if (g.phase !== "start") drawPlayer(ctx, g);
  drawParticles(ctx, g);
  drawTexts(ctx, g);

  ctx.restore();

  if (g.sweep > 0) drawSweep(ctx, g);
  if (g.timers.review > 0) {
    ctx.fillStyle = "rgba(182,156,255,0.06)";
    ctx.fillRect(0, 0, W, H);
  }
  if (g.flash > 0) {
    ctx.globalAlpha = Math.min(0.45, g.flash);
    ctx.fillStyle = g.flashColor;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  if (g.phase === "playing" || g.phase === "paused") {
    drawHud(ctx, g);
    if (g.boss) drawBossBar(ctx, g, g.boss);
    if (g.banner) drawBanner(ctx, g);
  }
}

const font = (g: Game, size: number, weight = 500) => `${weight} ${size}px ${g.font}`;
/** HUD text grows when the canvas is displayed small (phones) so it stays readable. */
const hudFont = (g: Game, size: number, weight = 500) => font(g, Math.round(size * Math.min(1.45, Math.max(1, 0.82 / (g.scale || 1)))), weight);

/* ---------- Background ---------- */

function drawStars(g: Game, ctx: CanvasRenderingContext2D) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const offset = g.phase === "start" ? 0 : g.player.x - W / 2;
  for (let layer = 0; layer < 3; layer++) {
    const st = STAR_STYLE[layer];
    ctx.font = font(g, st.size, 400);
    ctx.fillStyle = st.color;
    const dx = -offset * st.parallax;
    for (const s of g.stars) {
      if (s.layer === layer) ctx.fillText(s.char, s.x + dx, s.y);
    }
  }
}

/* ---------- Player ---------- */

function drawPlayer(ctx: CanvasRenderingContext2D, g: Game) {
  const p = g.player;
  if (p.dead) return;
  if (p.invuln > 0 && Math.floor(g.time * 14) % 2 === 0) return;
  const accent = g.accent();

  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.tilt * 0.16);

  // Engine flame
  const flame = 8 + Math.random() * 7 + (g.timers.ci > 0 ? 5 : 0);
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-5, 10);
  ctx.lineTo(0, 10 + flame);
  ctx.lineTo(5, 10);
  ctx.closePath();
  ctx.fill();

  // Hull
  ctx.fillStyle = C.text;
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.lineTo(13, 10);
  ctx.lineTo(5, 7);
  ctx.lineTo(0, 12);
  ctx.lineTo(-5, 7);
  ctx.lineTo(-13, 10);
  ctx.closePath();
  ctx.fill();

  // Cockpit + wing tips
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(3.5, 0);
  ctx.lineTo(-3.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(-13, 8, 3, 3);
  ctx.fillRect(10, 8, 3, 3);
  ctx.restore();

  if (g.timers.tests > 0) {
    const fading = g.timers.tests < 1.2 && Math.floor(g.time * 10) % 2 === 0;
    if (!fading) {
      const pulse = 1 + Math.sin(g.time * 8) * 0.06;
      ctx.strokeStyle = C.cyan;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 2, 24 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.1;
      ctx.fillStyle = C.cyan;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

function drawBolts(ctx: CanvasRenderingContext2D, g: Game) {
  const accent = g.accent();
  ctx.globalCompositeOperation = "lighter";
  for (const b of g.bolts) {
    ctx.fillStyle = accent;
    ctx.fillRect(b.x - 1.5, b.y - 8, 3, 14);
    ctx.globalAlpha = 0.25;
    ctx.fillRect(b.x - 3, b.y - 10, 6, 18);
    ctx.globalAlpha = 1;
  }
  ctx.globalCompositeOperation = "source-over";
}

/* ---------- Enemies ---------- */

function drawEnemy(ctx: CanvasRenderingContext2D, g: Game, e: Enemy) {
  const color = e.flash > 0 ? C.text : ENEMY_DEFS[e.kind].color;
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  switch (e.kind) {
    case "bug": {
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i++) {
        const w = Math.sin(e.t * 16 + i * 1.7) * 2.5;
        ctx.beginPath();
        ctx.moveTo(-6, i * 5);
        ctx.lineTo(-13, i * 5 + w);
        ctx.moveTo(6, i * 5);
        ctx.lineTo(13, i * 5 - w);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-3, -13);
      ctx.lineTo(-7, -19);
      ctx.moveTo(3, -13);
      ctx.lineTo(7, -19);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 2, 8, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = C.bg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(0, 12);
      ctx.stroke();
      break;
    }
    case "race": {
      const j = Math.sin(e.t * 22) * 3;
      ctx.globalAlpha = 0.45;
      diamond(ctx, -4 - j, 0, e.r);
      ctx.globalAlpha = 1;
      diamond(ctx, 3 + j, 0, e.r);
      ctx.fillStyle = C.bg;
      ctx.fillRect(1 + j, -5, 2, 10);
      ctx.fillRect(5 + j, -5, 2, 10);
      break;
    }
    case "leak": {
      const r = e.r;
      const wob = Math.sin(e.t * 5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -r - 2);
      ctx.bezierCurveTo(r * 0.7 + wob, -r * 0.3, r + wob, r * 0.35, 0, r);
      ctx.bezierCurveTo(-r - wob, r * 0.35, -r * 0.7 - wob, -r * 0.3, 0, -r - 2);
      ctx.fill();
      ctx.fillStyle = C.bg;
      if (e.size === 2) {
        ctx.font = font(g, 8, 700);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("MB", 0, 3);
      } else {
        ctx.fillRect(-1.5, 0, 3, 3);
      }
      break;
    }
    case "ghost": {
      const cycle = (e.t + e.seed) % 2.6;
      let alpha = e.visible ? 1 : 0.1;
      if (cycle > 1.45 && cycle < 1.7) alpha = Math.random() < 0.5 ? 0.25 : 0.9; // flicker before vanishing
      if (cycle > 2.45) alpha = Math.random() < 0.5 ? 0.2 : 0.7; // flicker before returning
      ctx.globalAlpha = alpha;
      const r = e.r;
      ctx.beginPath();
      ctx.arc(0, -2, r, Math.PI, 0);
      ctx.lineTo(r, r);
      const bumps = 4;
      for (let i = 0; i < bumps; i++) {
        const x1 = r - ((i + 0.5) * 2 * r) / bumps;
        const x2 = r - ((i + 1) * 2 * r) / bumps;
        ctx.quadraticCurveTo(x1, r - 6 + Math.sin(e.t * 8 + i) * 2, x2, r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = C.bg;
      ctx.font = font(g, 8, 700);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("404", 0, 0);
      break;
    }
    case "loop": {
      const rot = e.t * 5;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(0, 0, e.r - 3, rot, rot + Math.PI * 1.55);
      ctx.stroke();
      const ax = Math.cos(rot + Math.PI * 1.55) * (e.r - 3);
      const ay = Math.sin(rot + Math.PI * 1.55) * (e.r - 3);
      const tang = rot + Math.PI * 1.55 + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(ax + Math.cos(tang) * 6, ay + Math.sin(tang) * 6);
      ctx.lineTo(ax + Math.cos(tang + 2.4) * 6, ay + Math.sin(tang + 2.4) * 6);
      ctx.lineTo(ax + Math.cos(tang - 2.4) * 6, ay + Math.sin(tang - 2.4) * 6);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r * 0.8, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r * 0.8, y);
  ctx.closePath();
  ctx.fill();
}

/* ---------- Boss ---------- */

function drawBoss(ctx: CanvasRenderingContext2D, g: Game, b: Boss) {
  const phaseColor = b.phase === 1 ? C.yellow : C.coral;
  const { w, h } = b;
  ctx.save();
  ctx.translate(b.x, b.y);
  if (b.phase === 3) ctx.translate((Math.random() - 0.5) * 2, 0);

  ctx.fillStyle = C.surfaceHover;
  ctx.strokeStyle = phaseColor;
  ctx.lineWidth = 2;
  roundRect(ctx, -w / 2, -h / 2, w, h, 12);
  ctx.fill();
  ctx.stroke();

  // Title strip
  ctx.fillStyle = phaseColor;
  roundRect(ctx, -w / 2, -h / 2, w, 18, [12, 12, 0, 0]);
  ctx.fill();
  ctx.fillStyle = C.bg;
  ctx.font = font(g, 9, 700);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("legacy-monolith.war", -w / 2 + 10, -h / 2 + 9.5);
  ctx.textAlign = "right";
  ctx.fillText(`v${b.level}.0`, w / 2 - 10, -h / 2 + 9.5);

  // Module grid, blinking like a server rack
  const cols = 8;
  const rows = 3;
  const cw = 15;
  const ch = 11;
  const gap = 5;
  const gx = -((cols * cw + (cols - 1) * gap) / 2);
  const gy = -h / 2 + 28;
  const tick = Math.floor(b.t * (2 + b.phase));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const lit = ((c * 7 + r * 13 + tick * 5) % 11) < 4;
      ctx.fillStyle = lit ? phaseColor : C.line;
      ctx.globalAlpha = lit ? 0.9 : 1;
      ctx.fillRect(gx + c * (cw + gap), gy + r * (ch + gap), cw, ch);
    }
  }
  ctx.globalAlpha = 1;

  // Cracks as health drops
  if (b.phase >= 2) {
    ctx.strokeStyle = C.bg;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w / 2 + 30, -h / 2 + 18);
    ctx.lineTo(-w / 2 + 44, -4);
    ctx.lineTo(-w / 2 + 36, 14);
    ctx.lineTo(-w / 2 + 50, h / 2);
    if (b.phase === 3) {
      ctx.moveTo(w / 2 - 40, -h / 2 + 18);
      ctx.lineTo(w / 2 - 56, 0);
      ctx.lineTo(w / 2 - 44, h / 2);
    }
    ctx.stroke();
  }

  // Exhaust port
  ctx.fillStyle = phaseColor;
  ctx.globalAlpha = 0.6 + Math.sin(b.t * 10) * 0.3;
  ctx.fillRect(-16, h / 2 - 6, 32, 4);
  ctx.globalAlpha = 1;

  if (b.flash > 0) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = C.text;
    roundRect(ctx, -w / 2, -h / 2, w, h, 12);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawSpaghetti(ctx: CanvasRenderingContext2D, g: Game) {
  if (!g.spaghetti.length) return;
  ctx.strokeStyle = C.yellow;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const s of g.spaghetti) {
    const len = Math.hypot(s.vx, s.vy) || 1;
    const nx = -s.vy / len;
    const ny = s.vx / len;
    ctx.beginPath();
    for (let i = 0; i < 7; i++) {
      const dt = i * 0.022;
      const off = Math.sin((s.t - dt) * s.freq) * s.amp;
      const x = s.bx - s.vx * dt + nx * off;
      const y = s.by - s.vy * dt + ny * off;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = C.yellow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------- Pickups + FX ---------- */

export function drawPowerUp(ctx: CanvasRenderingContext2D, g: Game, kind: keyof typeof POWER_DEFS, x: number, y: number, t: number) {
  const def = POWER_DEFS[kind];
  const bob = Math.sin(t * 4) * 2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.globalAlpha = 0.35 + Math.sin(t * 6) * 0.2;
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 1.5;
  roundRect(ctx, -21, -14, 42, 28, 14);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = def.color;
  roundRect(ctx, -17, -11, 34, 22, 11);
  ctx.fill();
  ctx.fillStyle = C.bg;
  ctx.font = font(g, 11, 700);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(def.tag, 0, 1);
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.globalCompositeOperation = "lighter";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = font(g, 10, 700);
  for (const p of g.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    if (p.char) ctx.fillText(p.char, p.x, p.y);
    else ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawTexts(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const t of g.texts) {
    const a = t.life / t.max;
    ctx.globalAlpha = Math.min(1, a * 1.6);
    ctx.fillStyle = t.color;
    const pop = 1 + Math.max(0, a - 0.8) * 2;
    ctx.font = font(g, Math.round(t.size * pop), 700);
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
}

function drawSweep(ctx: CanvasRenderingContext2D, g: Game) {
  const y = H * g.sweep;
  ctx.fillStyle = C.yellow;
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, y - 1.5, W, 3);
  ctx.globalAlpha = 0.12;
  ctx.fillRect(0, y, W, 40);
  ctx.globalAlpha = 1;
}

/* ---------- HUD ---------- */

function drawHud(ctx: CanvasRenderingContext2D, g: Game) {
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = C.dim;
  ctx.font = hudFont(g, 9, 500);
  ctx.fillText("SCORE", 16, 22);
  ctx.fillText("WAVE", 128, 22);
  ctx.fillStyle = C.text;
  ctx.font = hudFont(g, 18, 700);
  ctx.fillText(String(g.score).padStart(6, "0"), 16, 42);
  ctx.fillText(String(g.wave).padStart(2, "0"), 128, 42);

  // Lives
  ctx.textAlign = "right";
  ctx.fillStyle = C.dim;
  ctx.font = hudFont(g, 9, 500);
  ctx.fillText("LIVES", W - 16, 22);
  for (let i = 0; i < g.lives; i++) miniShip(ctx, W - 22 - i * 16, 35, g.accent());

  // Combo
  if (g.combo >= 2) {
    const s = 1 + g.comboPulse * 0.5;
    ctx.save();
    ctx.translate(W / 2, 32);
    ctx.scale(s, s);
    ctx.textAlign = "center";
    ctx.fillStyle = g.multiplier > 1 ? g.accent() : C.text;
    ctx.font = hudFont(g, 20, 700);
    ctx.fillText(`x${g.multiplier}`, 0, 4);
    ctx.restore();
    ctx.textAlign = "center";
    ctx.fillStyle = C.dim;
    ctx.font = hudFont(g, 9, 500);
    ctx.fillText(`COMBO ${g.combo}`, W / 2, 48);
  }

  // Active power-up timers
  let y = H - 20;
  for (const kind of ["tests", "ci", "review"] as const) {
    const t = g.timers[kind];
    if (t <= 0) continue;
    const def = POWER_DEFS[kind];
    ctx.fillStyle = def.color;
    roundRect(ctx, 16, y - 12, 26, 16, 8);
    ctx.fill();
    ctx.fillStyle = C.bg;
    ctx.font = hudFont(g, 9, 700);
    ctx.textAlign = "center";
    ctx.fillText(def.tag, 29, y - 1);
    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.fillText(`${def.name.toUpperCase()} ${t.toFixed(1)}s`, 50, y - 1);
    ctx.fillStyle = C.line;
    ctx.fillRect(50, y + 3, 90, 2);
    ctx.fillStyle = def.color;
    ctx.fillRect(50, y + 3, 90 * (t / def.duration), 2);
    y -= 26;
  }
}

function miniShip(ctx: CanvasRenderingContext2D, x: number, y: number, accent: string) {
  ctx.fillStyle = C.text;
  ctx.beginPath();
  ctx.moveTo(x, y - 7);
  ctx.lineTo(x + 5.5, y + 5);
  ctx.lineTo(x, y + 3);
  ctx.lineTo(x - 5.5, y + 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.fillRect(x - 1, y - 2, 2, 3);
}

function drawBossBar(ctx: CanvasRenderingContext2D, g: Game, b: Boss) {
  const x = 16;
  const y = 64;
  const w = W - 32;
  const color = b.phase === 1 ? C.yellow : C.coral;
  ctx.textBaseline = "alphabetic";
  ctx.font = hudFont(g, 9, 700);
  ctx.textAlign = "left";
  ctx.fillStyle = C.text;
  ctx.fillText("LEGACY MONOLITH", x, y);
  ctx.textAlign = "right";
  ctx.fillStyle = color;
  ctx.fillText(`PHASE ${b.phase}`, x + w, y);
  ctx.fillStyle = C.lineSubtle;
  ctx.fillRect(x, y + 6, w, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x, y + 6, w * Math.max(0, b.hp / b.maxHp), 6);
  ctx.fillStyle = C.bg;
  ctx.fillRect(x + w * 0.33, y + 6, 2, 6);
  ctx.fillRect(x + w * 0.66, y + 6, 2, 6);
}

function drawBanner(ctx: CanvasRenderingContext2D, g: Game) {
  const b = g.banner!;
  const elapsed = b.max - b.t;
  const alpha = Math.min(1, elapsed / 0.2, b.t / 0.35);
  const rise = (1 - Math.min(1, elapsed / 0.3)) * 12;
  ctx.globalAlpha = Math.max(0, alpha);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = C.text;
  ctx.font = font(g, 30, 700);
  ctx.fillText(b.title, W / 2, H * 0.4 + rise);
  if (b.sub) {
    ctx.fillStyle = g.accent();
    ctx.font = font(g, 11, 500);
    ctx.fillText(b.sub, W / 2, H * 0.4 + 28 + rise);
  }
  ctx.globalAlpha = 1;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number | number[]) {
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}
