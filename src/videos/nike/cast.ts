// Flat cartoon cast for the Nike short. Cards are lit by the scene and live on the NOINK layer.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, fxBurst, fxStars, fxShadow, fxContact, Outfit, Expr, FrontOpts, SideOpts } from "./toon";
import { FPS, OX, PX, SHOTS, V3, clamp01 } from "./story";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r);
    return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : makeEntry(r.w, r.h);
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g));
        e.tex.needsUpdate = true;
        this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};

const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();
const CARD = new THREE.PlaneGeometry(1, 1);
const ROOTS = new Set<THREE.Object3D>();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.mat.alphaToCoverage = false;
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = false; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.rotation.order = "YXZ"; this.mesh.renderOrder = 1; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
    ROOTS.add(parent);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}
export class Fx {
  mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; soft: THREE.MeshBasicMaterial; blob: THREE.MeshBasicMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = new THREE.MeshBasicMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mat.alphaToCoverage = false;
    this.soft = new THREE.MeshBasicMaterial({ map: blank, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.blob = blobMaterial(blank);
    this.mesh = new THREE.Mesh(CARD, this.mat);
    this.mesh.visible = false; this.mesh.layers.set(NOINK);
    parent.add(this.mesh);
  }
  use(soft: boolean) { this.mesh.material = soft ? this.soft : this.mat; }
  bind() {
    const t = this.r?.tex;
    if (!t) return;
    if (this.r!.key.includes("|blob|")) {
      if (t.generateMipmaps) { t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.needsUpdate = true; }
      this.blob.map = t; this.mesh.material = this.blob; this.mesh.renderOrder = 0.5;
    } else { this.mat.map = t; this.soft.map = t; this.mesh.renderOrder = 0; }
  }
}

export type Place = {
  key: string; draw: (p: Pen) => void; x: number; y: number; z: number;
  scale?: number; mirror?: boolean; yaw?: number; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3; sun?: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [1800, 3000, 3] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];

const DAVID: Outfit = { jacket: "#c4553a", pants: "#3e4d6b", boots: "#f4f1ea", hat: "cap", cap: "#24386a", skin: "#f0c29a", hair: "#5a3a28" };
const COURIER: Outfit = { jacket: "#8d5a32", pants: "#4e4034", boots: "#2a2420", hat: "cap", cap: "#d08a3a", skin: "#e0b088", build: "stout", moustache: "#6a4a32" };
const SUIT: Outfit = { jacket: "#1c1e24", pants: "#14161c", boots: "#101114", hat: "hair", hair: "#2a241e", skin: "#e7c3a4" };
const SUIT2: Outfit = { ...SUIT, hair: "#3a3028", skin: "#c9956c" };
const SUIT3: Outfit = { ...SUIT, jacket: "#24262e", hair: "#1a1816", skin: "#f3d0b0" };
const OFFICER: Outfit = { jacket: "#4e5c38", pants: "#3a4034", boots: "#2a2824", hat: "cap", cap: "#3e4a30", skin: "#e8c4a4", belt: "#c2b48a", buttons: "#d9c48a" };
const GENERAL: Outfit = { ...OFFICER, jacket: "#3d4a32", cap: "#2e3824", build: "stout", moustache: "#4a4038", buttons: "#e8c45a" };
const CLERK: Outfit = { jacket: "#6d7a55", pants: "#3e4638", boots: "#322c26", hat: "cap", cap: "#6a6248", skin: "#f0c8a8" };
const RUNNER: Outfit[] = [0, 1, 2, 3].map((v) => ({ ...OFFICER, skin: ["#f0c29a", "#e0b088", "#c9956c", "#f3d0b0"][v], cap: ["#3e4a30", "#4a4030", "#2e3824", "#555c40"][v] }));

const SUN = new THREE.Vector3(0.5, 0.75, -0.4).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" = "day";
const sunOf = (root: THREE.Object3D): THREE.DirectionalLight | null => {
  let s: THREE.DirectionalLight | null = null;
  root.traverse((o) => {
    const d = o as THREE.DirectionalLight;
    if (!s && d.isDirectionalLight && d.castShadow) s = d;
  });
  return s;
};
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  if (cam.sun) return out.copy(cam.sun).normalize();
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const s = sunOf(r);
    if (!s) continue;
    const d = tmp.copy(s.target.position).sub(cam.pos), e = Math.abs(d.dot(cam.right)) / (d.length() || 1);
    if (e < err) { err = e; best = s; }
  }
  return best ? out.copy(best.position).sub(best.target.position).normalize() : out;
};
const light2D = (cam: CamInfo, mirror: boolean) => {
  const sx = SUN.dot(cam.right) * (mirror ? -1 : 1), sy = -SUN.y;
  return Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);
};
const viewOf = (cam: CamInfo, x: number, z: number, dx: number, dz: number) => {
  const tx = cam.pos.x - x, tz = cam.pos.z - z, tl = Math.hypot(tx, tz) || 1;
  const c = (tx * dx + tz * dz) / tl;
  return { side: c < 0.57, mirror: dx * cam.right.x + dz * cam.right.z < 0, fs: Math.round(Math.sqrt(Math.max(0, 1 - c * c)) * 20) / 20 };
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-40 * hh(i, 3));
  for (let n = 0; s <= f && n < 500; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(15 + 54 * hh(i * 17 + n, 5));
  }
  return 0;
};

const person = (cam: CamInfo, who: { i: number; o: Outfit; okey: string }, x: number, y: number, z: number, dx: number, dz: number, fo: FrontOpts, so: SideOpts, scale = 1): Place => {
  const view = viewOf(cam, x, z, dx, dz);
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror);
  const f2: FrontOpts = { ...fo, light, seed: who.i }, s2: SideOpts = { ...so, light, seed: who.i };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return {
    key, x, y, z, scale, mirror, size: [w, h, k],
    draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)),
  };
};

const CONTACT: Record<"day" | "golden", [number, number, number]> = { day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33] };
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number, sc = 1) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME === "day") {
    const el = Math.asin(Math.min(0.99, Math.max(0.1, SUN.y)));
    const len = Math.min(2.4, Math.max(0.5, 1.6 / Math.tan(el))) * sc, h = len + 0.55 * sc, c = 0.3 * h;
    const tc = hexOf(TAIL, 1);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * c, y: y + 0.018, z: z + oz * c, w: 0.72 * sc, h, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], 1);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x: x + ox * 0.03 * sc, y: y + 0.022, z: z + oz * 0.03 * sc, w: 0.52 * sc, h: 0.4 * sc, flat: true, rot });
};

const face = (cam: CamInfo, x: number, z: number) => {
  const dx = cam.pos.x - x, dz = cam.pos.z - z, l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l] as const;
};
const stand = (cam: CamInfo, out: Stage, who: { i: number; o: Outfit; okey: string }, x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}, scale = 1) => {
  const [dx, dz] = face(cam, x, z);
  const blink = lidAt(cam.pos.length() * 0 + (extra.blink as number ?? 0) , who.i);
  // blink from time is passed via extra; lid computed by caller through extra.blink
  void blink;
  out.places.push(person(cam, who, x, 0, z, dx, dz, { mode: "stand", expr, blink: extra.blink ?? 0, ...extra }, { mode: "stand", expr, blink: extra.blink ?? 0 }, scale));
  blob(out, x, 0, z, scale);
};

const tBlink = (t: number, i: number) => lidAt(t, i);

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  const s = SHOTS[id - 1];
  LNAME = s.light;
  findSun(cam, SUN);
  const david = { i: 1, o: DAVID, okey: "david" };
  const put = (who: { i: number; o: Outfit; okey: string }, x: number, z: number, expr: Expr, extra: Partial<FrontOpts> = {}, scale = 1) =>
    stand(cam, out, who, x, z, expr, { blink: tBlink(t, who.i), ...extra }, scale);

  if (id === 1 || id === 3 || id === 5) {
    const expr: Expr = id === 1 ? (t < 4.1 ? "grin" : t < 7.3 ? "nervous" : "shock") : id === 5 ? (t < 30.9 ? "grin" : "laugh") : (t < 15.0 ? "neutral" : "smile" as Expr);
    const e: Expr = id === 3 ? (t < 15.1 ? "neutral" : t < 17.2 ? "smile" : "neutral") : expr;
    put(david, 0.35, 2.15, e, { look: id === 1 && t > 7.3 ? 0 : -0.4 });
    if (id === 5 && t > 30.95) {
      const u = (t * 1.4) % 1;
      out.fx.push({ key: `stars${q(u, 24)}`, cw: 420, ch: 210, draw: (p) => fxStars(p, q(u, 24)), x: 0.35, y: 2.15, z: 2.15, w: 0.7, h: 0.35 });
      out.fx.push({ key: `burst${q(clamp01((t - 31.06) / 0.45), 20)}`, cw: 400, ch: 400, draw: (p) => fxBurst(p, clamp01((t - 31.06) / 0.45)), x: -0.55, y: 1.05, z: 2.85, w: 0.9, h: 0.9 });
    }
  }

  if (id === 6) put(david, OX + 0.4, 8.1, t < 34.7 ? "grin" : "shock", { headTilt: -8 });
  if (id === 7) put({ i: 2, o: COURIER, okey: "courier" }, OX + 6.7, 2.9, "shock", { headTilt: 4 }, 1.05);

  if (id === 2) {
    put({ i: 20, o: GENERAL, okey: "gen" }, PX - 1.2, 20.5, "stern");
    put({ i: 21, o: CLERK, okey: "clerk" }, PX + 1.1, 20.8, "nervous");
  }
  if (id === 9) {
    for (let i = 0; i < 6; i++) {
      const x = PX - 10 + ((t * 2.2 + i * 2.4) % 18);
      const z = 18.2 + (i % 3) * 1.25;
      const who = { i: 10 + i, o: RUNNER[i % 4], okey: `run${i % 4}` };
      const ph = (t * 2 + i * 0.17) % 1;
      const expr: Expr = i % 2 ? "shock" : "nervous";
      out.places.push(person(cam, who, x, 0, z, 1, 0.15, { mode: "march", phase: ph, expr, blink: tBlink(t, 10 + i) }, { mode: "march", phase: ph, expr, blink: tBlink(t, 10 + i), stride: 0.8 }));
      blob(out, x, 0, z);
    }
  }
  if (id === 10) {
    put({ i: 20, o: GENERAL, okey: "gen" }, PX - 0.15, 4.7, "stern", { wave: 0.85, look: 1 });
    put({ i: 21, o: CLERK, okey: "clerk" }, PX + 1.15, 4.9, "nervous");
  }
  if (id === 11) {
    const suits = [[OX - 0.7, -2.05, SUIT, "s1"], [OX + 0.55, -1.45, SUIT2, "s2"], [OX + 1.7, -2.25, SUIT3, "s3"]] as const;
    suits.forEach(([x, z, o, k], i) => put({ i: 30 + i, o, okey: k }, x, z, i === 1 ? "stern" : "neutral"));
    put(david, OX - 1.9, -2.45, "nervous", {}, 0.98);
  }
  if (id === 12 && t >= 63.15 && t < 64.5) put(david, OX + 1.15, -2.3, "relief");
  if (id === 12 && t >= 64.4) {
    put({ i: 20, o: GENERAL, okey: "gen" }, OX + 8.4, -1.85, t > 65.6 ? "stern" : "neutral", { wave: t > 65.5 ? 1 : 0.2 });
    put({ i: 21, o: CLERK, okey: "clerk" }, OX + 7.05, -1.55, "nervous");
  }
  if (id === 13 && t < 71.4) put(david, OX + 0.35, -2.55, t < 69.4 ? "neutral" : "nervous", { look: 0.6, headTilt: 10 });

  return out;
};
