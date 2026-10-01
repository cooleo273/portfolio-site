import { H, W } from "./types";

type Handlers = {
  onPause: () => void;
  canPause: () => boolean;
  isPlaying: () => boolean;
  shipPos: () => { x: number; y: number };
};

const KEYMAP: Record<string, "left" | "right" | "up" | "down" | "fire"> = {
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  Space: "fire",
};

/**
 * Keyboard + mouse + touch input for the game.
 * Keyboard events are only captured while focus is inside the game frame, so the page stays usable.
 */
export class Input {
  left = false;
  right = false;
  up = false;
  down = false;
  fire = false;
  /** Logical target the ship eases toward when steered by mouse or touch. */
  target: { x: number; y: number } | null = null;
  device: "pointer" | "keyboard" = "pointer";
  private dragOffset = { x: 0, y: 0 };
  private touching = false;
  private cleanup: (() => void)[] = [];

  constructor(
    private frame: HTMLElement,
    private canvas: HTMLCanvasElement,
    private handlers: Handlers,
  ) {
    this.attach();
  }

  private toLogical(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    return { x: ((clientX - r.left) / r.width) * W, y: ((clientY - r.top) / r.height) * H };
  }

  private attach() {
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (!this.frame.contains(document.activeElement)) return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === "INPUT") return;
      if (e.code === "KeyP" || e.code === "Escape") {
        if (down && this.handlers.canPause()) {
          e.preventDefault();
          this.handlers.onPause();
        }
        return;
      }
      const action = KEYMAP[e.code];
      if (!action) return;
      if (!down) {
        this[action] = false;
        return;
      }
      if (!this.handlers.isPlaying()) return;
      // Space on a focused button should still click it.
      if (tag === "BUTTON" && action === "fire") return;
      e.preventDefault();
      this[action] = true;
      this.device = "keyboard";
      this.target = null;
    };
    const keydown = onKey(true);
    const keyup = onKey(false);
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);

    const pointermove = (e: PointerEvent) => {
      if (!this.handlers.isPlaying()) return;
      const p = this.toLogical(e.clientX, e.clientY);
      if (e.pointerType === "mouse") {
        this.device = "pointer";
        this.target = { x: p.x, y: p.y };
      } else if (this.touching) {
        e.preventDefault();
        this.target = { x: p.x + this.dragOffset.x, y: p.y + this.dragOffset.y };
      }
    };
    const pointerdown = (e: PointerEvent) => {
      if (!this.handlers.isPlaying()) return;
      this.device = "pointer";
      const p = this.toLogical(e.clientX, e.clientY);
      if (e.pointerType !== "mouse") {
        e.preventDefault();
        this.touching = true;
        const ship = this.handlers.shipPos();
        // Keep the finger below the ship so it stays visible.
        this.dragOffset = { x: ship.x - p.x, y: Math.min(ship.y - p.y, -40) };
        this.target = { x: ship.x, y: ship.y };
        this.canvas.setPointerCapture?.(e.pointerId);
      } else {
        this.target = p;
      }
    };
    const pointerup = () => {
      this.touching = false;
    };
    const blur = () => this.reset();

    this.canvas.addEventListener("pointermove", pointermove);
    this.canvas.addEventListener("pointerdown", pointerdown);
    this.canvas.addEventListener("pointerup", pointerup);
    this.canvas.addEventListener("pointercancel", pointerup);
    window.addEventListener("blur", blur);

    this.cleanup.push(() => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      this.canvas.removeEventListener("pointermove", pointermove);
      this.canvas.removeEventListener("pointerdown", pointerdown);
      this.canvas.removeEventListener("pointerup", pointerup);
      this.canvas.removeEventListener("pointercancel", pointerup);
      window.removeEventListener("blur", blur);
    });
  }

  /** Keyboard players hold space; mouse and touch players get auto-fire. */
  get shouldFire() {
    return this.device === "pointer" || this.fire;
  }

  reset() {
    this.left = this.right = this.up = this.down = this.fire = false;
    this.touching = false;
    this.target = null;
  }

  destroy() {
    this.cleanup.forEach((fn) => fn());
  }
}
