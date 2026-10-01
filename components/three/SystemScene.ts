import {
  AdditiveBlending,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  Raycaster,
  Scene,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { system } from "@/content/site";
import { EDGES, NODE_LAYOUT, edgeKey, type NodeId, type Shape } from "./layout";

type Options = {
  reducedMotion: boolean;
  interactive: boolean;
  accent: () => string;
  onHover: (id: NodeId | null) => void;
  onSelect: (id: NodeId) => void;
};

type NodeObj = {
  id: NodeId;
  group: Group;
  base: Vector3;
  height: number;
  outline: LineBasicMaterial;
  body: MeshStandardMaterial;
  hit: Mesh;
  label: HTMLDivElement;
  glow: number;
};

type EdgeObj = { key: string; from: NodeId; to: NodeId; curve: QuadraticBezierCurve3; mat: MeshBasicMaterial; spawn: number };
type Packet = { mesh: Mesh; glow: Sprite; edge: EdgeObj | null; u: number; speed: number; active: boolean };

const DIM_EDGE = new Color("#2A3124");
const BODY = new Color("#151912");
const SHAPE_HEIGHT: Record<Shape, number> = { screen: 1.5, tower: 1.9, box: 0.95, small: 0.7, stack: 1.0, cylinder: 1.3, coin: 0.25 };

const NODE_IDS = Object.keys(NODE_LAYOUT) as NodeId[];
const CENTER_X = NODE_IDS.reduce((a, id) => a + NODE_LAYOUT[id].pos[0], 0) / NODE_IDS.length;
const CENTER_Z = NODE_IDS.reduce((a, id) => a + NODE_LAYOUT[id].pos[1], 0) / NODE_IDS.length;

/** Scene position of a node, with the whole layout centered on the origin. */
const basePosition = (id: NodeId, y = 0) => new Vector3(NODE_LAYOUT[id].pos[0] - CENTER_X, y, NODE_LAYOUT[id].pos[1] - CENTER_Z);

/**
 * Imperative three.js scene for the "under the hood" section.
 * React owns the UI around it; this class owns the WebGL context, render loop and labels.
 */
export class SystemScene {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new PerspectiveCamera(32, 1, 0.1, 100);
  private controls: OrbitControls;
  private nodes = new Map<NodeId, NodeObj>();
  private edges: EdgeObj[] = [];
  private packets: Packet[] = [];
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private overlay: HTMLDivElement;
  private disposables: { dispose: () => void }[] = [];
  private activeEdges = new Set<string>();
  private focus: NodeId | null = null;
  private hovered: NodeId | null = null;
  private raf = 0;
  private running = false;
  private last = 0;
  private time = 0;
  private width = 1;
  private height = 1;
  private ro: ResizeObserver;
  private tmp = new Vector3();
  private accentColor = new Color();

  constructor(
    private container: HTMLElement,
    private opts: Options,
  ) {
    // Throws when WebGL is unavailable; the caller shows a fallback.
    this.renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    const canvas = this.renderer.domElement;
    canvas.style.display = "block";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    this.overlay = document.createElement("div");
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    container.appendChild(this.overlay);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableZoom = false;
    this.controls.enablePan = false;
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minPolarAngle = 0.55;
    this.controls.maxPolarAngle = 1.3;
    this.controls.autoRotate = !opts.reducedMotion;
    this.controls.autoRotateSpeed = 0.55;
    if (!opts.interactive) {
      // Touch devices: keep the page scrollable over the canvas; taps still select nodes.
      this.controls.enabled = false;
      canvas.style.touchAction = "pan-y";
    }

    this.buildScene();
    this.bindPointer(canvas);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
    this.renderFrame(0);
  }

  /* ---------- Public API ---------- */

  setHighlight(edgeKeys: string[], focus: NodeId | null) {
    this.activeEdges = new Set(edgeKeys);
    this.focus = focus;
    if (focus) for (const e of this.edges) if (e.from === focus || e.to === focus) this.activeEdges.add(e.key);
    if (!this.running) this.renderFrame(0);
  }

  setActive(active: boolean) {
    if (active && !this.running) {
      this.running = true;
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.loop);
    } else if (!active && this.running) {
      this.running = false;
      cancelAnimationFrame(this.raf);
    }
  }

  dispose() {
    this.setActive(false);
    this.ro.disconnect();
    this.controls.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.overlay.remove();
  }

  /* ---------- Build ---------- */

  private buildScene() {
    this.scene.add(new AmbientLight(0xffffff, 1.1));
    const key = new DirectionalLight(0xffffff, 1.6);
    key.position.set(6, 10, 8);
    this.scene.add(key);

    this.buildGround();

    for (const id of NODE_IDS) {
      const { shape, color } = NODE_LAYOUT[id];
      this.addNode(id, shape, color, basePosition(id));
    }

    for (const [from, to] of EDGES) {
      const a = this.anchor(from);
      const b = this.anchor(to);
      const mid = a.clone().lerp(b, 0.5);
      mid.y += 1.1 + a.distanceTo(b) * 0.12;
      const curve = new QuadraticBezierCurve3(a, mid, b);
      const geo = this.track(new TubeGeometry(curve, 40, 0.028, 6, false));
      const mat = this.track(new MeshBasicMaterial({ color: DIM_EDGE.clone(), transparent: true }));
      this.scene.add(new Mesh(geo, mat));
      this.edges.push({ key: edgeKey(from, to), from, to, curve, mat, spawn: Math.random() });
    }

    // Packet pool: small bright spheres with an additive glow sprite.
    const glowTex = this.track(this.makeGlowTexture());
    const sphere = this.track(new SphereGeometry(0.075, 12, 12));
    for (let i = 0; i < 48; i++) {
      const mat = this.track(new MeshBasicMaterial({ color: 0xffffff }));
      const mesh = new Mesh(sphere, mat);
      const glowMat = this.track(new SpriteMaterial({ map: glowTex, blending: AdditiveBlending, depthWrite: false, transparent: true }));
      const glow = new Sprite(glowMat);
      glow.scale.setScalar(0.7);
      mesh.visible = glow.visible = false;
      this.scene.add(mesh, glow);
      this.packets.push({ mesh, glow, edge: null, u: 0, speed: 1, active: false });
    }
  }

  private buildGround() {
    const pts: number[] = [];
    for (let x = -12; x <= 12; x += 0.8) for (let z = -9; z <= 9; z += 0.8) pts.push(x, -0.02, z);
    const geo = this.track(new BufferGeometry());
    geo.setAttribute("position", new Float32BufferAttribute(pts, 3));
    const mat = this.track(new PointsMaterial({ color: 0x2a3124, size: 0.05, sizeAttenuation: true }));
    this.scene.add(new Points(geo, mat));
  }

  private addNode(id: NodeId, shape: Shape, color: string, base: Vector3) {
    const group = new Group();
    group.position.copy(base);
    const body = this.track(new MeshStandardMaterial({ color: BODY.clone(), roughness: 0.75, metalness: 0.15, emissive: new Color(color), emissiveIntensity: 0 }));
    const outline = this.track(new LineBasicMaterial({ color: new Color(color), transparent: true, opacity: 0.55 }));

    const part = (geo: BufferGeometry, x: number, y: number, z: number) => {
      this.track(geo);
      const mesh = new Mesh(geo, body);
      mesh.position.set(x, y, z);
      const edges = new LineSegments(this.track(new EdgesGeometry(geo, 30)), outline);
      edges.position.copy(mesh.position);
      group.add(mesh, edges);
    };

    switch (shape) {
      case "screen":
        part(new BoxGeometry(2.0, 1.25, 0.12), 0, 0.95, 0);
        part(new BoxGeometry(0.16, 0.34, 0.16), 0, 0.17, 0);
        part(new BoxGeometry(0.9, 0.05, 0.5), 0, 0.025, 0);
        break;
      case "tower":
        part(new BoxGeometry(1.3, 1.9, 1.3), 0, 0.95, 0);
        break;
      case "box":
        part(new BoxGeometry(1.35, 0.95, 1.35), 0, 0.475, 0);
        break;
      case "small":
        part(new BoxGeometry(1.0, 0.7, 1.0), 0, 0.35, 0);
        break;
      case "stack":
        [0.15, 0.5, 0.85].forEach((y, i) => part(new BoxGeometry(1.5, 0.26, 1.5), i === 1 ? 0.08 : 0, y, 0));
        break;
      case "cylinder":
        part(new CylinderGeometry(0.8, 0.8, 1.3, 40), 0, 0.65, 0);
        part(new CylinderGeometry(0.82, 0.82, 0.05, 40), 0, 0.45, 0);
        part(new CylinderGeometry(0.82, 0.82, 0.05, 40), 0, 0.85, 0);
        break;
      case "coin":
        part(new CylinderGeometry(0.62, 0.62, 0.22, 40), 0, 0.11, 0);
        break;
    }

    // Generous invisible hit box for hover and tap.
    const h = SHAPE_HEIGHT[shape];
    const hit = new Mesh(this.track(new BoxGeometry(1.9, h + 0.6, 1.9)), this.track(new MeshBasicMaterial({ visible: false })));
    hit.position.y = h / 2;
    hit.userData.id = id;
    group.add(hit);

    this.scene.add(group);

    const label = document.createElement("div");
    label.textContent = system.nodes[id].label;
    label.style.cssText =
      "position:absolute;left:0;top:0;white-space:nowrap;font:500 11px var(--font-jetbrains-mono),monospace;padding:3px 8px;border-radius:999px;border:1px solid #2A3124;background:rgba(11,13,10,.82);color:#B4BAAA;transition:color .2s,border-color .2s;will-change:transform";
    this.overlay.appendChild(label);

    this.nodes.set(id, { id, group, base, height: h, outline, body, hit, label, glow: 0 });
  }

  private anchor(id: NodeId) {
    return basePosition(id, Math.min(SHAPE_HEIGHT[NODE_LAYOUT[id].shape] * 0.6, 0.9));
  }

  private makeGlowTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.25, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new CanvasTexture(c);
  }

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  /* ---------- Interaction ---------- */

  private bindPointer(canvas: HTMLCanvasElement) {
    const pick = (e: PointerEvent): NodeId | null => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects([...this.nodes.values()].map((n) => n.hit), false);
      return (hits[0]?.object.userData.id as NodeId) ?? null;
    };
    let down: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const id = pick(e);
      if (id !== this.hovered) {
        this.hovered = id;
        canvas.style.cursor = id ? "pointer" : "grab";
        this.opts.onHover(id);
      }
    };
    const onDown = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY });
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return; // that was an orbit drag
      const id = pick(e);
      if (id) this.opts.onSelect(id);
    };
    const onLeave = () => {
      if (this.hovered) {
        this.hovered = null;
        this.opts.onHover(null);
      }
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    this.disposables.push({
      dispose: () => {
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointerleave", onLeave);
      },
    });
    canvas.style.cursor = this.opts.interactive ? "grab" : "default";
  }

  private resize() {
    const r = this.container.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    const aspect = this.width / this.height;
    this.camera.aspect = aspect;
    // Pull back on narrow screens so the whole system stays in frame.
    const radius = 18.5 * Math.max(1, 1.4 / aspect);
    const dir = this.camera.position.lengthSq() > 0 ? this.camera.position.clone().normalize() : new Vector3(0.45, 0.62, 0.64).normalize();
    this.camera.position.copy(dir.multiplyScalar(radius));
    this.camera.lookAt(0, 0.4, 0);
    this.controls.target.set(0, 0.4, 0);
    this.camera.updateProjectionMatrix();
    if (!this.running) this.renderFrame(0);
  }

  /* ---------- Loop ---------- */

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    this.renderFrame(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private renderFrame(dt: number) {
    this.time += dt;
    this.accentColor.set(this.opts.accent());
    const k = 1 - Math.pow(0.002, dt); // smoothing factor
    const moving = !this.opts.reducedMotion;

    // Edges: highlighted ones take the accent color.
    for (const e of this.edges) {
      const on = this.activeEdges.has(e.key);
      e.mat.color.lerp(on ? this.accentColor : DIM_EDGE, dt ? k : 1);
      if (moving && dt) {
        e.spawn -= dt * (on ? 2.8 : 0.22);
        if (e.spawn <= 0) {
          this.launch(e, on);
          e.spawn = 0.6 + Math.random() * 0.6;
        }
      }
    }

    // Nodes: glow when connected to a highlighted edge or focused.
    for (const n of this.nodes.values()) {
      const lit = n.id === this.focus || n.id === this.hovered || this.edges.some((e) => this.activeEdges.has(e.key) && (e.from === n.id || e.to === n.id));
      n.glow += ((lit ? 1 : 0) - n.glow) * (dt ? k : 1);
      n.body.emissiveIntensity = n.glow * 0.22;
      n.outline.opacity = 0.35 + n.glow * 0.65;
      if (moving) n.group.position.y = n.base.y + Math.sin(this.time * 1.2 + n.base.x) * 0.06;
    }

    // Packets travel along their curves.
    for (const p of this.packets) {
      if (!p.active || !p.edge) continue;
      p.u += dt * p.speed;
      if (p.u >= 1) {
        p.active = false;
        p.mesh.visible = p.glow.visible = false;
        continue;
      }
      p.edge.curve.getPoint(p.u, this.tmp);
      p.mesh.position.copy(this.tmp);
      p.glow.position.copy(this.tmp);
    }

    if (this.controls.enabled || this.controls.autoRotate) this.controls.update(dt);
    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  }

  private launch(edge: EdgeObj, highlighted: boolean) {
    const p = this.packets.find((x) => !x.active);
    if (!p) return;
    p.edge = edge;
    p.u = 0;
    p.speed = highlighted ? 0.85 : 0.45;
    p.active = true;
    const color = highlighted ? this.accentColor : new Color("#8A9180");
    (p.mesh.material as MeshBasicMaterial).color.copy(color);
    (p.glow.material as SpriteMaterial).color.copy(color);
    (p.glow.material as SpriteMaterial).opacity = highlighted ? 0.9 : 0.35;
    p.mesh.visible = p.glow.visible = true;
  }

  private placeLabels() {
    for (const n of this.nodes.values()) {
      this.tmp.set(0, n.height + 0.45, 0);
      n.group.localToWorld(this.tmp);
      this.tmp.project(this.camera);
      const x = (this.tmp.x * 0.5 + 0.5) * this.width;
      const y = (-this.tmp.y * 0.5 + 0.5) * this.height;
      const lit = n.glow > 0.5;
      n.label.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%)`;
      n.label.style.color = lit ? "#EDEFE8" : "#B4BAAA";
      n.label.style.borderColor = lit ? this.accentColor.getStyle() : "#2A3124";
      n.label.style.opacity = this.tmp.z > 1 ? "0" : "1";
    }
  }
}
