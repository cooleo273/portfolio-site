import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  EdgesGeometry,
  Float32BufferAttribute,
  Group,
  HalfFloatType,
  IcosahedronGeometry,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Points,
  PointsMaterial,
  QuadraticBezierCurve3,
  Raycaster,
  RingGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
  WebGLRenderTarget,
  type Material,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import type { SystemGraph, SystemShape } from "@/content/site";

type Options = {
  reducedMotion: boolean;
  /** Fine pointer: drag-to-orbit is on. Touch devices keep page scrolling unless fullscreen. */
  finePointer: boolean;
  accent: () => string;
  onHover: (id: string | null) => void;
  onSelect: (id: string | null) => void;
};

type NodeObj = {
  id: string;
  group: Group;
  base: Vector3;
  height: number;
  hit: Mesh;
  label: HTMLDivElement;
  glowMats: { mat: MeshBasicMaterial | LineBasicMaterial; base: Color; weight: number }[];
  spinner: Group | null;
  disposables: { dispose: () => void }[];
  glow: number;
  lift: number;
  appear: number;
  delay: number;
  leaving: boolean;
};

type EdgeObj = {
  key: string;
  from: string;
  to: string;
  curve: QuadraticBezierCurve3;
  mesh: Mesh;
  mat: ShaderMaterial;
  active: number;
  reveal: number;
  delay: number;
  leaving: boolean;
  spawn: number;
};

type Packet = { edge: EdgeObj | null; u: number; speed: number; bright: boolean };

const BG = new Color("#0B0D0A");
const BODY = "#1A2016";
const DIM_EDGE = new Color("#2A3124");
const SPACING_X = 3.5;
const SPACING_Z = 2.9;
const TRAIL = 6;
const MAX_PACKETS = 48;

const SHAPE_HEIGHT: Record<SystemShape, number> = {
  screen: 1.75,
  server: 1.9,
  box: 0.9,
  stack: 1.0,
  database: 1.3,
  coin: 0.35,
  orb: 1.55,
  doc: 0.35,
};

const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const EDGE_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const EDGE_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uActive;
  uniform float uReveal;
  uniform vec3 uColor;
  uniform vec3 uDim;
  varying vec2 vUv;
  void main() {
    if (vUv.x > uReveal) discard;
    float f = fract(vUv.x * 4.0 - uTime * 0.85);
    float dash = smoothstep(0.0, 0.06, f) * (1.0 - smoothstep(0.14, 0.3, f));
    vec3 base = mix(uDim, uColor * 0.45, uActive);
    vec3 col = base + uColor * dash * (0.25 + uActive * 1.6);
    // Bright tip while the edge is drawing itself in.
    col += uColor * smoothstep(uReveal - 0.04, uReveal, vUv.x) * step(uReveal, 0.999) * 1.5;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const FLOOR_VERT = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const FLOOR_FRAG = /* glsl */ `
  uniform vec3 uBg;
  uniform vec3 uLine;
  uniform vec3 uAccent;
  uniform float uRadius;
  varying vec3 vWorld;
  float grid(vec2 p, float scale) {
    vec2 c = p / scale;
    vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }
  void main() {
    float d = length(vWorld.xz);
    float fade = 1.0 - smoothstep(uRadius * 0.3, uRadius, d);
    float lines = max(grid(vWorld.xz, 1.0) * 0.18, grid(vWorld.xz, 3.5) * 0.5) * fade;
    // Grid lines pick up a faint hint of the accent near the center.
    vec3 line = mix(uLine, uAccent * 0.35, (1.0 - smoothstep(0.0, uRadius * 0.4, d)) * 0.35);
    gl_FragColor = vec4(uBg + line * lines, 1.0);
  }
`;

/**
 * Imperative three.js scene for the architecture explorer.
 * React owns the UI around it; this class owns WebGL, the render loop, the camera and the labels.
 */
export class SystemScene {
  private renderer: WebGLRenderer;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private scene = new Scene();
  private camera = new PerspectiveCamera(30, 1, 0.1, 200);
  private controls: OrbitControls;
  private overlay: HTMLDivElement;
  private nodes: NodeObj[] = [];
  private edges: EdgeObj[] = [];
  private packets: Packet[] = [];
  private packetMesh: InstancedMesh;
  private floorMat: ShaderMaterial;
  private ring: Mesh;
  private dust: Points;
  private shadowTex: CanvasTexture;
  private disposables: { dispose: () => void }[] = [];
  private raycaster = new Raycaster();
  private pointer = new Vector2();
  private ro: ResizeObserver;

  private activeEdges = new Set<string>();
  private focus: string | null = null;
  private hovered: string | null = null;
  private selected: string | null = null;
  private fullscreen = false;
  private running = false;
  private raf = 0;
  private last = 0;
  private time = 0;
  private width = 1;
  private height = 1;
  private viewShift = 0;
  private idleTimer = 0;
  private introDone = false;
  private fitDistance = 20;
  private camAnim: { fromPos: Vector3; toPos: Vector3; fromTarget: Vector3; toTarget: Vector3; t: number; dur: number } | null = null;

  private tmp = new Vector3();
  private matrix = new Matrix4();
  private color = new Color();
  private accent = new Color();

  constructor(
    private container: HTMLElement,
    private opts: Options,
  ) {
    // Throws when WebGL is unavailable; the caller shows a fallback.
    this.renderer = new WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.finePointer ? 1.75 : 1.5));
    this.renderer.setClearColor(BG, 1);
    const canvas = this.renderer.domElement;
    canvas.style.cssText = "display:block;width:100%;height:100%;outline:none";
    canvas.setAttribute("aria-hidden", "true");
    container.appendChild(canvas);

    this.overlay = document.createElement("div");
    this.overlay.setAttribute("aria-hidden", "true");
    this.overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;overflow:hidden";
    container.appendChild(this.overlay);

    // Studio reflections for the metallic node bodies.
    const pmrem = new PMREMGenerator(this.renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environment = envTex;
    this.scene.environmentIntensity = 0.32;
    this.scene.background = BG;
    pmrem.dispose();
    this.disposables.push(envTex);

    const key = new DirectionalLight(0xffffff, 1.2);
    key.position.set(-6, 12, 8);
    this.scene.add(key);

    // Post-processing: MSAA render target -> bloom -> sRGB output.
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new Vector2(256, 256), 0.7, 0.5, 0.7);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.enablePan = false;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = 1.32;
    this.controls.rotateSpeed = 0.6;
    this.controls.autoRotateSpeed = 0.45;
    this.controls.addEventListener("start", () => {
      this.camAnim = null;
      this.idleTimer = 6;
    });
    this.applyInteractionMode();

    this.floorMat = this.track(
      new ShaderMaterial({
        vertexShader: FLOOR_VERT,
        fragmentShader: FLOOR_FRAG,
        uniforms: {
          uBg: { value: BG.clone() },
          uLine: { value: new Color("#232a1e") },
          uAccent: { value: new Color() },
          uRadius: { value: 26 },
        },
      }),
    );
    const floor = new Mesh(this.track(new PlaneGeometry(90, 90)), this.floorMat);
    floor.rotation.x = -Math.PI / 2;
    this.scene.add(floor);

    this.shadowTex = this.track(this.radialTexture("rgba(0,0,0,0.75)", "rgba(0,0,0,0)"));

    const ringMat = this.track(new MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: DoubleSide, depthWrite: false }));
    this.ring = new Mesh(this.track(new RingGeometry(1.25, 1.33, 72)), ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.02;
    this.ring.visible = false;
    this.scene.add(this.ring);

    this.dust = this.buildDust();
    this.scene.add(this.dust);

    // One instanced mesh draws every packet and its trail in a single call.
    this.packetMesh = new InstancedMesh(
      this.track(new SphereGeometry(0.07, 10, 10)),
      this.track(new MeshBasicMaterial({ color: 0xffffff, toneMapped: false })),
      MAX_PACKETS * TRAIL,
    );
    this.packetMesh.frustumCulled = false;
    for (let i = 0; i < MAX_PACKETS * TRAIL; i++) {
      this.packetMesh.setMatrixAt(i, this.matrix.makeScale(0, 0, 0));
      this.packetMesh.setColorAt(i, this.color.set(0x000000));
    }
    this.scene.add(this.packetMesh);
    for (let i = 0; i < MAX_PACKETS; i++) this.packets.push({ edge: null, u: 0, speed: 1, bright: false });

    this.bindPointer(canvas);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();
  }

  /* ---------------- Public API ---------------- */

  /** Swap to another project's architecture with an animated transition. */
  setGraph(graph: SystemGraph) {
    const hadNodes = this.nodes.some((n) => !n.leaving);
    for (const n of this.nodes) n.leaving = true;
    for (const e of this.edges) e.leaving = true;
    this.hovered = this.selected = null;
    this.ring.visible = false;

    const cols = graph.nodes.map((n) => n.at[0]);
    const rows = graph.nodes.map((n) => n.at[1]);
    const cx = (Math.min(...cols) + Math.max(...cols)) / 2;
    const cz = (Math.min(...rows) + Math.max(...rows)) / 2;
    const offset = hadNodes ? 0.45 : 0.15;

    const byId = new Map<string, NodeObj>();
    graph.nodes.forEach((n, i) => {
      const base = new Vector3((n.at[0] - cx) * SPACING_X, 0, (n.at[1] - cz) * SPACING_Z);
      const node = this.buildNode(n.id, n.label, n.shape, n.color, base);
      node.delay = offset + i * 0.06;
      this.nodes.push(node);
      byId.set(n.id, node);
    });

    graph.edges.forEach(([from, to], i) => {
      const a = byId.get(from);
      const b = byId.get(to);
      if (!a || !b) return;
      const edge = this.buildEdge(from, to, a, b);
      edge.delay = offset + graph.nodes.length * 0.06 + 0.15 + i * 0.05;
      this.edges.push(edge);
    });

    // Frame the new graph.
    this.fitDistance = this.distanceFor(this.graphRadius());
    if (this.introDone) this.flyTo(new Vector3(0, 0.6, 0), this.fitDistance, 1.4);
    if (!this.running) this.renderFrame(0);
  }

  setHighlight(edgeKeys: string[], focus: string | null) {
    this.activeEdges = new Set(edgeKeys);
    this.focus = focus;
    if (focus) for (const e of this.edges) if (!e.leaving && (e.from === focus || e.to === focus)) this.activeEdges.add(e.key);
  }

  /** Select a node (camera eases toward it) or clear the selection (camera reframes). */
  select(id: string | null) {
    if (id === this.selected) return;
    this.selected = id;
    const node = id ? this.nodes.find((n) => n.id === id && !n.leaving) : null;
    if (node) {
      this.flyTo(new Vector3(node.base.x, 0.6, node.base.z), this.fitDistance * 0.62, 1.1);
      this.ring.position.set(node.base.x, 0.02, node.base.z);
      this.ring.visible = true;
    } else {
      this.ring.visible = false;
      this.flyTo(new Vector3(0, 0.6, 0), this.fitDistance, 1.1);
    }
  }

  setFullscreen(on: boolean) {
    this.fullscreen = on;
    this.applyInteractionMode();
  }

  /** Shift the projection so the graph sits beside the UI panels (fraction of width). */
  setViewShift(fraction: number) {
    if (fraction === this.viewShift) return;
    this.viewShift = fraction;
    this.resize();
  }

  setActive(active: boolean) {
    if (active && !this.running) {
      this.running = true;
      this.last = performance.now();
      if (!this.introDone) this.playIntro();
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
    for (const n of this.nodes) this.disposeNode(n);
    for (const e of this.edges) this.disposeEdge(e);
    this.disposables.forEach((d) => d.dispose());
    this.composer.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.overlay.remove();
  }

  /* ---------------- Building ---------------- */

  private buildNode(id: string, labelText: string, shape: SystemShape, colorHex: string, base: Vector3): NodeObj {
    const group = new Group();
    group.position.copy(base);
    group.scale.setScalar(0.0001);
    const disposables: { dispose: () => void }[] = [];
    const glowMats: NodeObj["glowMats"] = [];
    const own = <T extends { dispose: () => void }>(x: T) => {
      disposables.push(x);
      return x;
    };
    const body = own(new MeshStandardMaterial({ color: BODY, metalness: 0.65, roughness: 0.32 }));
    /** weight < 1 for large glowing surfaces so they read as lit panels, not light bulbs. */
    const glow = (hex: string, weight = 1) => {
      const mat = own(new MeshBasicMaterial({ color: hex, toneMapped: false }));
      glowMats.push({ mat, base: new Color(hex), weight });
      return mat;
    };
    const add = (geo: BufferGeometry, mat: Material, x = 0, y = 0, z = 0) => {
      const m = new Mesh(own(geo), mat);
      m.position.set(x, y, z);
      group.add(m);
      return m;
    };
    let spinner: Group | null = null;

    switch (shape) {
      case "screen": {
        add(new RoundedBoxGeometry(2.1, 1.35, 0.14, 3, 0.06), body, 0, 1.1, 0);
        add(new PlaneGeometry(1.86, 1.1), glow(colorHex, 0.38), 0, 1.1, 0.075);
        add(new RoundedBoxGeometry(0.16, 0.42, 0.16, 2, 0.04), body, 0, 0.24, 0);
        add(new RoundedBoxGeometry(1.0, 0.06, 0.6, 2, 0.03), body, 0, 0.03, 0);
        break;
      }
      case "server": {
        add(new RoundedBoxGeometry(1.25, 1.9, 1.25, 4, 0.1), body, 0, 0.95, 0);
        for (let i = 0; i < 4; i++) add(new PlaneGeometry(0.8, 0.045), glow(colorHex), 0, 0.45 + i * 0.36, 0.632);
        add(new PlaneGeometry(0.12, 0.12), glow("#C6F432"), 0.42, 1.66, 0.633);
        break;
      }
      case "box": {
        add(new RoundedBoxGeometry(1.4, 0.9, 1.4, 4, 0.12), body, 0, 0.45, 0);
        const top = add(new PlaneGeometry(0.95, 0.95), glow(colorHex, 0.5), 0, 0.905, 0);
        top.rotation.x = -Math.PI / 2;
        add(new PlaneGeometry(1.0, 0.05), glow(colorHex), 0, 0.3, 0.705);
        break;
      }
      case "stack": {
        [0.14, 0.5, 0.86].forEach((y, i) => {
          add(new RoundedBoxGeometry(1.55, 0.24, 1.55, 3, 0.07), body, i === 1 ? 0.07 : 0, y, 0);
          if (i < 2) add(new RoundedBoxGeometry(1.4, 0.035, 1.4, 1, 0.01), glow(colorHex), i === 1 ? 0.035 : 0, y + 0.18, 0);
        });
        break;
      }
      case "database": {
        add(new CylinderGeometry(0.82, 0.82, 1.3, 48), body, 0, 0.65, 0);
        [0.25, 0.65, 1.05].forEach((y) => {
          const ring = add(new TorusGeometry(0.835, 0.02, 8, 64), glow(colorHex), 0, y, 0);
          ring.rotation.x = Math.PI / 2;
        });
        add(new CylinderGeometry(0.6, 0.6, 0.01, 48), glow(colorHex, 0.5), 0, 1.306, 0);
        break;
      }
      case "coin": {
        add(new CylinderGeometry(0.7, 0.7, 0.24, 48), body, 0, 0.16, 0);
        const rim = add(new TorusGeometry(0.7, 0.03, 8, 64), glow(colorHex), 0, 0.28, 0);
        rim.rotation.x = Math.PI / 2;
        const inner = add(new TorusGeometry(0.38, 0.02, 8, 48), glow(colorHex), 0, 0.29, 0);
        inner.rotation.x = Math.PI / 2;
        break;
      }
      case "orb": {
        spinner = new Group();
        spinner.position.y = 1.0;
        const core = new Mesh(own(new SphereGeometry(0.34, 32, 32)), glow(colorHex, 0.7));
        const shellGeo = own(new IcosahedronGeometry(0.72, 1));
        const shell = new Mesh(shellGeo, own(new MeshStandardMaterial({ color: BODY, metalness: 0.7, roughness: 0.25, transparent: true, opacity: 0.35 })));
        const lineMat = own(new LineBasicMaterial({ color: colorHex, toneMapped: false }));
        glowMats.push({ mat: lineMat, base: new Color(colorHex), weight: 0.9 });
        const wire = new LineSegments(own(new EdgesGeometry(shellGeo)), lineMat);
        spinner.add(core, shell, wire);
        group.add(spinner);
        add(new CylinderGeometry(0.5, 0.62, 0.12, 40), body, 0, 0.06, 0);
        break;
      }
      case "doc": {
        [0, 1, 2].forEach((i) => {
          const sheet = add(new RoundedBoxGeometry(1.15, 0.06, 1.45, 2, 0.025), body, i * 0.06, 0.05 + i * 0.1, -i * 0.05);
          sheet.rotation.y = (i - 1) * 0.08;
        });
        [0.35, 0.1, -0.15, -0.4].forEach((z, i) => {
          const line = add(new PlaneGeometry(i === 0 ? 0.5 : 0.8, 0.05), glow(colorHex), i === 0 ? -0.03 : 0.12, 0.29, z - 0.1);
          line.rotation.x = -Math.PI / 2;
        });
        break;
      }
    }

    // Soft contact shadow.
    const shadow = add(new PlaneGeometry(3.2, 3.2), own(new MeshBasicMaterial({ map: this.shadowTex, transparent: true, depthWrite: false })), 0, 0.012, 0);
    shadow.rotation.x = -Math.PI / 2;

    // Invisible hit box for hover and click.
    const h = SHAPE_HEIGHT[shape];
    const hit = add(new RoundedBoxGeometry(2.0, h + 0.5, 2.0, 1, 0.1), own(new MeshBasicMaterial({ visible: false })), 0, h / 2, 0);
    hit.userData.id = id;

    this.scene.add(group);

    const label = document.createElement("div");
    label.style.cssText =
      "position:absolute;left:0;top:0;display:flex;align-items:center;gap:6px;white-space:nowrap;font:500 ${this.width < 640 ? 10 : 11}px var(--font-jetbrains-mono),monospace;padding:4px 9px 4px 7px;border-radius:999px;border:1px solid #2A3124;background:rgba(11,13,10,.78);backdrop-filter:blur(6px);color:#B4BAAA;opacity:0;transition:color .25s,border-color .25s,box-shadow .25s;will-change:transform,opacity";
    const dot = document.createElement("span");
    dot.style.cssText = `width:6px;height:6px;border-radius:999px;background:${colorHex};box-shadow:0 0 8px ${colorHex}`;
    label.append(dot, document.createTextNode(labelText));
    this.overlay.appendChild(label);

    return { id, group, base, height: h, hit, label, glowMats, spinner, disposables, glow: 0, lift: 0, appear: 0, delay: 0, leaving: false };
  }

  private buildEdge(from: string, to: string, a: NodeObj, b: NodeObj): EdgeObj {
    const start = a.base.clone().setY(Math.min(a.height * 0.55, 0.95));
    const end = b.base.clone().setY(Math.min(b.height * 0.55, 0.95));
    const mid = start.clone().lerp(end, 0.5);
    mid.y += 1.0 + start.distanceTo(end) * 0.16;
    const curve = new QuadraticBezierCurve3(start, mid, end);
    const mat = new ShaderMaterial({
      vertexShader: EDGE_VERT,
      fragmentShader: EDGE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uActive: { value: 0 },
        uReveal: { value: 0 },
        uColor: { value: new Color() },
        uDim: { value: DIM_EDGE.clone() },
      },
    });
    const mesh = new Mesh(new TubeGeometry(curve, 90, 0.032, 8, false), mat);
    this.scene.add(mesh);
    return { key: `${from}>${to}`, from, to, curve, mesh, mat, active: 0, reveal: 0, delay: 0, leaving: false, spawn: Math.random() * 2 };
  }

  private buildDust() {
    const pts: number[] = [];
    for (let i = 0; i < 260; i++) pts.push((Math.random() - 0.5) * 34, Math.random() * 8, (Math.random() - 0.5) * 24);
    const geo = this.track(new BufferGeometry());
    geo.setAttribute("position", new Float32BufferAttribute(pts, 3));
    const mat = this.track(
      new PointsMaterial({ color: "#8A9180", size: 0.045, transparent: true, opacity: 0.45, depthWrite: false, blending: AdditiveBlending }),
    );
    return new Points(geo, mat);
  }

  private radialTexture(inner: string, outer: string) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d")!;
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, inner);
    grad.addColorStop(1, outer);
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return new CanvasTexture(c);
  }

  private track<T extends { dispose: () => void }>(item: T): T {
    this.disposables.push(item);
    return item;
  }

  private disposeNode(n: NodeObj) {
    this.scene.remove(n.group);
    n.disposables.forEach((d) => d.dispose());
    n.label.remove();
  }

  private disposeEdge(e: EdgeObj) {
    this.scene.remove(e.mesh);
    e.mesh.geometry.dispose();
    e.mat.dispose();
    for (const p of this.packets) if (p.edge === e) p.edge = null;
  }

  /* ---------------- Camera ---------------- */

  private graphRadius() {
    let radius = 4;
    for (const n of this.nodes) if (!n.leaving) radius = Math.max(radius, Math.hypot(n.base.x, n.base.z) + 1.6);
    return radius;
  }

  private distanceFor(radius: number) {
    const vHalf = (this.camera.fov * Math.PI) / 360;
    const aspect = this.width / this.height;
    const usable = aspect * (1 - Math.abs(this.viewShift) * 1.6);
    const hHalf = Math.atan(Math.tan(vHalf) * Math.max(0.5, usable));
    // Portrait framing is oriented to the graph (no auto-rotate), so it can sit tighter than the bounding sphere.
    return (radius / Math.sin(Math.min(vHalf, hHalf))) * (this.portrait ? 0.82 : 0.92);
  }

  private get portrait() {
    return this.width / this.height < 0.9;
  }

  private defaultDirection() {
    // Portrait: look along the graph's long axis so it runs down the screen.
    return this.portrait ? new Vector3(1, 1.15, 0.3).normalize() : new Vector3(0.38, 0.78, 1).normalize();
  }

  private flyTo(target: Vector3, distance: number, dur: number) {
    const dir = this.portrait ? this.defaultDirection() : this.camera.position.clone().sub(this.controls.target);
    if (dir.lengthSq() < 0.001) dir.copy(this.defaultDirection());
    dir.normalize();
    // Keep a pleasant elevation when re-framing.
    if (dir.y < 0.35) dir.setY(0.35).normalize();
    this.camAnim = {
      fromPos: this.camera.position.clone(),
      toPos: target.clone().add(dir.multiplyScalar(distance)),
      fromTarget: this.controls.target.clone(),
      toTarget: target.clone(),
      t: 0,
      dur: this.opts.reducedMotion ? 0.001 : dur,
    };
  }

  private playIntro() {
    this.introDone = true;
    const target = new Vector3(0, 0.6, 0);
    const rest = target.clone().add(this.defaultDirection().multiplyScalar(this.fitDistance));
    this.controls.target.copy(target);
    if (this.opts.reducedMotion) {
      this.camera.position.copy(rest);
      return;
    }
    // Start high and far, then glide down into the default framing.
    this.camera.position.set(-this.fitDistance * 0.5, this.fitDistance * 1.25, this.fitDistance * 0.9);
    this.camAnim = { fromPos: this.camera.position.clone(), toPos: rest, fromTarget: target.clone(), toTarget: target.clone(), t: 0, dur: 2.4 };
  }

  private applyInteractionMode() {
    const canvas = this.renderer.domElement;
    const interactive = this.opts.finePointer || this.fullscreen;
    this.controls.enabled = interactive;
    this.controls.enableZoom = this.fullscreen;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 60;
    canvas.style.touchAction = this.fullscreen ? "none" : "pan-y";
    // Outside fullscreen the site's custom cursor handles the stage; fullscreen needs the native one.
    canvas.style.cursor = this.fullscreen ? "grab" : "";
  }

  private resize() {
    const r = this.container.getBoundingClientRect();
    this.width = Math.max(1, r.width);
    this.height = Math.max(1, r.height);
    this.renderer.setSize(this.width, this.height, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(this.width, this.height);
    this.bloom.resolution.set(this.width / 2, this.height / 2);
    this.camera.aspect = this.width / this.height;
    if (this.viewShift) this.camera.setViewOffset(this.width, this.height, -this.width * this.viewShift, 0, this.width, this.height);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
    this.fitDistance = this.distanceFor(this.graphRadius());
    if (this.introDone && !this.selected && !this.camAnim) {
      const dir = this.portrait ? this.defaultDirection() : this.camera.position.clone().sub(this.controls.target).normalize();
      this.camera.position.copy(this.controls.target).add(dir.multiplyScalar(this.fitDistance));
    }
    if (!this.running) this.renderFrame(0);
  }

  /* ---------------- Pointer ---------------- */

  private bindPointer(canvas: HTMLCanvasElement) {
    const pick = (e: PointerEvent): string | null => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const live = this.nodes.filter((n) => !n.leaving && n.appear > 0.5).map((n) => n.hit);
      return (this.raycaster.intersectObjects(live, false)[0]?.object.userData.id as string) ?? null;
    };
    let down: { x: number; y: number } | null = null;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || down) return;
      const id = pick(e);
      if (id !== this.hovered) {
        this.hovered = id;
        if (this.fullscreen) canvas.style.cursor = id ? "pointer" : "grab";
        this.opts.onHover(id);
      }
    };
    const onDown = (e: PointerEvent) => {
      down = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return; // orbit drag, not a click
      this.opts.onSelect(pick(e));
    };
    const onLeave = () => {
      down = null;
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
  }

  /* ---------------- Loop ---------------- */

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 1 / 20);
    this.last = now;
    this.renderFrame(dt);
    this.raf = requestAnimationFrame(this.loop);
  };

  private renderFrame(dt: number) {
    this.time += dt;
    const moving = !this.opts.reducedMotion;
    const k = dt ? 1 - Math.pow(0.0015, dt) : 1;
    this.accent.set(this.opts.accent());
    (this.floorMat.uniforms.uAccent.value as Color).copy(this.accent);

    this.updateCamera(dt);
    this.updateNodes(dt, k, moving);
    this.updateEdges(dt, k, moving);
    this.updatePackets(dt);

    if (moving && dt) {
      const pos = this.dust.geometry.getAttribute("position") as Float32BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + dt * 0.12;
        if (y > 8) y = 0;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    if (this.ring.visible) {
      const ringMat = this.ring.material as MeshBasicMaterial;
      ringMat.color.copy(this.accent).multiplyScalar(1.6);
      ringMat.opacity = 0.55 + Math.sin(this.time * 4) * 0.25;
      this.ring.scale.setScalar(1 + Math.sin(this.time * 2) * 0.04);
    }

    this.composer.render(dt);
    this.placeLabels();
  }

  private updateCamera(dt: number) {
    if (this.camAnim) {
      const a = this.camAnim;
      a.t = Math.min(1, a.t + (dt || 1) / a.dur);
      const e = easeInOut(a.t);
      this.camera.position.lerpVectors(a.fromPos, a.toPos, e);
      this.controls.target.lerpVectors(a.fromTarget, a.toTarget, e);
      if (a.t >= 1) this.camAnim = null;
    }
    this.idleTimer = Math.max(0, this.idleTimer - dt);
    this.controls.autoRotate =
      !this.opts.reducedMotion && !this.portrait && !this.camAnim && this.idleTimer === 0 && !this.selected && !this.hovered;
    this.controls.update(dt || undefined);
  }

  private updateNodes(dt: number, k: number, moving: boolean) {
    const remove: NodeObj[] = [];
    for (const n of this.nodes) {
      if (n.leaving) {
        n.appear = dt ? Math.max(0, n.appear - dt / 0.35) : 0;
        if (n.appear <= 0) remove.push(n);
      } else if (n.delay > 0 && dt) {
        n.delay -= dt;
      } else {
        n.appear = dt ? Math.min(1, n.appear + dt / 0.7) : 1;
      }
      const s = n.leaving ? Math.max(0.0001, n.appear) : Math.max(0.0001, easeOutBack(n.appear));
      n.group.scale.setScalar(s);

      const lit =
        !n.leaving &&
        (n.id === this.focus ||
          n.id === this.hovered ||
          n.id === this.selected ||
          this.edges.some((e) => !e.leaving && this.activeEdges.has(e.key) && (e.from === n.id || e.to === n.id)));
      n.glow += ((lit ? 1 : 0) - n.glow) * k;
      const liftTarget = n.id === this.hovered || n.id === this.selected ? 0.22 : 0;
      n.lift += (liftTarget - n.lift) * k;
      for (const g of n.glowMats) g.mat.color.copy(g.base).multiplyScalar((0.3 + n.glow * 1.1) * g.weight);
      const bob = moving ? Math.sin(this.time * 1.1 + n.base.x * 0.7 + n.base.z) * 0.05 : 0;
      n.group.position.y = n.base.y + n.lift + bob;
      if (n.spinner && moving) n.spinner.rotation.y += dt * (0.4 + n.glow * 1.2);
    }
    for (const n of remove) {
      this.disposeNode(n);
      this.nodes.splice(this.nodes.indexOf(n), 1);
    }
  }

  private updateEdges(dt: number, k: number, moving: boolean) {
    const remove: EdgeObj[] = [];
    for (const e of this.edges) {
      if (e.leaving) {
        e.reveal = dt ? Math.max(0, e.reveal - dt / 0.3) : 0;
        if (e.reveal <= 0) remove.push(e);
      } else if (e.delay > 0 && dt) {
        e.delay -= dt;
      } else {
        e.reveal = dt ? Math.min(1, e.reveal + dt / 0.6) : 1;
      }
      const on = !e.leaving && this.activeEdges.has(e.key) ? 1 : 0;
      e.active += (on - e.active) * k;
      const u = e.mat.uniforms;
      u.uTime.value = moving ? this.time : 0;
      u.uActive.value = e.active;
      u.uReveal.value = e.reveal;
      (u.uColor.value as Color).copy(this.accent);

      if (moving && dt && e.reveal >= 1 && !e.leaving) {
        e.spawn -= dt * (on ? 2.6 : 0.3);
        if (e.spawn <= 0) {
          this.launch(e, !!on);
          e.spawn = 0.55 + Math.random() * 0.5;
        }
      }
    }
    for (const e of remove) {
      this.disposeEdge(e);
      this.edges.splice(this.edges.indexOf(e), 1);
    }
  }

  private launch(edge: EdgeObj, bright: boolean) {
    const p = this.packets.find((x) => !x.edge);
    if (!p) return;
    p.edge = edge;
    p.u = 0;
    p.speed = bright ? 0.75 : 0.35;
    p.bright = bright;
  }

  private updatePackets(dt: number) {
    this.packets.forEach((p, i) => {
      if (p.edge) {
        p.u += dt * p.speed;
        if (p.u > 1 + TRAIL * 0.02) p.edge = null;
      }
      for (let t = 0; t < TRAIL; t++) {
        const idx = i * TRAIL + t;
        const u = p.edge ? p.u - t * 0.02 : -1;
        if (!p.edge || u < 0 || u > 1) {
          this.packetMesh.setMatrixAt(idx, this.matrix.makeScale(0, 0, 0));
          continue;
        }
        p.edge.curve.getPoint(u, this.tmp);
        const scale = (p.bright ? 1 : 0.7) * (1 - t / TRAIL);
        this.matrix.makeScale(scale, scale, scale).setPosition(this.tmp);
        this.packetMesh.setMatrixAt(idx, this.matrix);
        const intensity = (p.bright ? 2.4 : 0.9) * (1 - t / (TRAIL + 1));
        if (p.bright) this.color.copy(this.accent).multiplyScalar(intensity);
        else this.color.setRGB(0.55 * intensity, 0.6 * intensity, 0.5 * intensity);
        this.packetMesh.setColorAt(idx, this.color);
      }
    });
    this.packetMesh.instanceMatrix.needsUpdate = true;
    if (this.packetMesh.instanceColor) this.packetMesh.instanceColor.needsUpdate = true;
  }

  private placeLabels() {
    const accentCss = `#${this.accent.getHexString()}`;
    for (const n of this.nodes) {
      this.tmp.set(0, n.height + 0.5, 0);
      n.group.localToWorld(this.tmp);
      this.tmp.project(this.camera);
      const x = (this.tmp.x * 0.5 + 0.5) * this.width;
      const y = (-this.tmp.y * 0.5 + 0.5) * this.height;
      const strong = n.id === this.hovered || n.id === this.selected;
      const lit = n.glow > 0.5;
      const s = n.label.style;
      s.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -100%) scale(${strong ? 1.08 : 1})`;
      s.opacity = this.tmp.z > 1 ? "0" : String(Math.min(1, n.appear * 1.4) * (n.leaving ? n.appear : 1));
      s.color = lit || strong ? "#EDEFE8" : "#B4BAAA";
      s.borderColor = strong ? accentCss : lit ? "#3a4432" : "#2A3124";
      s.boxShadow = strong ? `0 0 0 3px ${accentCss}22` : "none";
    }
  }
}
