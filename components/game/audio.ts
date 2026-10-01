/**
 * Synthesized sound effects via the Web Audio API. No audio files.
 * The AudioContext is created lazily on the first enabled sound (after a user gesture).
 */
type Tone = { freq: number; to?: number; dur: number; type?: OscillatorType; vol?: number; delay?: number };

export class Sound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private lastShot = 0;
  enabled = false;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (on) this.ensure();
  }

  private ensure() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.6;
      this.noiseBuffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private tone({ freq, to, dur, type = "square", vol = 0.08, delay = 0 }: Tone) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, vol = 0.12, cutoff = 1800, delay = 0) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx || !this.master || !this.noiseBuffer) return;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cutoff, t0);
    filter.frequency.exponentialRampToValueAtTime(80, t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  shoot() {
    const now = performance.now();
    if (now - this.lastShot < 70) return;
    this.lastShot = now;
    this.tone({ freq: 1250, to: 520, dur: 0.06, type: "square", vol: 0.025 });
  }
  hit() {
    this.tone({ freq: 420, to: 180, dur: 0.07, type: "triangle", vol: 0.06 });
  }
  explode(big = false) {
    this.noise(big ? 0.7 : 0.22, big ? 0.22 : 0.1, big ? 2400 : 1600);
    this.tone({ freq: big ? 140 : 220, to: 40, dur: big ? 0.6 : 0.18, type: "sine", vol: big ? 0.16 : 0.07 });
  }
  combo(level: number) {
    this.tone({ freq: 500 + level * 90, to: 900 + level * 120, dur: 0.1, type: "triangle", vol: 0.05 });
  }
  power() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone({ freq: f, dur: 0.09, type: "square", vol: 0.04, delay: i * 0.06 }));
  }
  hurt() {
    this.tone({ freq: 260, to: 50, dur: 0.38, type: "sawtooth", vol: 0.09 });
    this.noise(0.3, 0.1, 900);
  }
  bossShot() {
    this.tone({ freq: 180, to: 90, dur: 0.14, type: "sawtooth", vol: 0.035 });
  }
  wave() {
    this.tone({ freq: 392, dur: 0.1, type: "triangle", vol: 0.06 });
    this.tone({ freq: 587, dur: 0.16, type: "triangle", vol: 0.06, delay: 0.1 });
  }
  bossAlarm() {
    for (let i = 0; i < 3; i++) this.tone({ freq: 220, to: 330, dur: 0.18, type: "square", vol: 0.05, delay: i * 0.24 });
  }
  gameOver() {
    [392, 330, 262, 196].forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: "triangle", vol: 0.07, delay: i * 0.16 }));
  }
  click() {
    this.tone({ freq: 880, dur: 0.04, type: "triangle", vol: 0.04 });
  }
}
