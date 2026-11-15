// Pirate cards. Same billboard path as the bridge cast: lit drawings, blinks, contact blobs, NOINK layer.
import * as THREE from "three";
import { Pen, bodyFront, bodySide, Outfit, Expr, FrontOpts, SideOpts, fxContact, fxShadow } from "./toon";
import { FPS, D0, SHOTS, hookPose, HookPose, clamp01 } from "./story";
import { LIGHTS } from "./lights";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";

type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };
const makeEntry = (w: number, h: number): Entry => {
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return { cv, tex, w, h };
};
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
  scale?: number; mirror?: boolean; roll?: number; size?: [number, number, number];
};
export type FxPlace = { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number; soft?: boolean };
export type CamInfo = { pos: THREE.Vector3; right: THREE.Vector3 };
export type Stage = { places: Place[]; fx: FxPlace[] };

const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const q = (v: number, n = 120) => Math.round(v * n) / n;
const tier = (d: number): [number, number, number] => d < 3.2 ? [1200, 2000, 2] : d < 7 ? [720, 1200, 1.2] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4];
const SUN = new THREE.Vector3(0.45, 0.8, 0.35).normalize();
const tmp = new THREE.Vector3();
let LNAME: "day" | "golden" | "night" = "day";
const findSun = (cam: CamInfo, out: THREE.Vector3) => {
  let best: THREE.DirectionalLight | null = null, err = Infinity;
  for (const r of ROOTS) {
    if (!r.parent) continue;
    const lights: THREE.DirectionalLight[] = [];
    r.traverse((o) => { if (o instanceof THREE.DirectionalLight && o.castShadow) lights.push(o); });
    const s = lights[0];
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
  return { side: c < 0.55, mirror: dx * cam.right.x + dz * cam.right.z < 0 };
};
const LID = [0.5, 1, 1, 0.5];
const lidAt = (t: number, i: number) => {
  const f = Math.round(t * FPS);
  let s = Math.round(-40 * hh(i, 3));
  for (let n = 0; s <= f && n < 400; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(12 + 40 * hh(i * 17 + n, 5));
  }
  return 0;
};
const fkey = (o: object) => JSON.stringify(o, (_k, v) => (typeof v === "number" ? q(v) : v));
type Who = { i: number; o: Outfit; okey: string };
const person = (cam: CamInfo, who: Who, x: number, y: number, z: number, dx: number, dz: number, fo: FrontOpts, so: SideOpts, scale = 1): Place => {
  const view = viewOf(cam, x, z, dx, dz);
  const d = cam.pos.distanceTo(tmp.set(x, y + 1.2, z)) / scale;
  const [w, h, k] = tier(d);
  const mirror = view.side && view.mirror, light = light2D(cam, mirror), seed = (who.i % 7) + 1;
  const f2: FrontOpts = { ...fo, light, seed }, s2: SideOpts = { ...so, light, seed };
  const key = view.side ? `S|${who.okey}|${fkey(s2)}` : `F|${who.okey}|${fkey(f2)}`;
  return { key, x, y, z, scale, mirror, size: [w, h, k], draw: (p) => (view.side ? bodySide(p, who.o, s2) : bodyFront(p, who.o, f2)) };
};

const CONTACT: Record<"day" | "golden" | "night", [number, number, number]> = {
  day: [0.2, 0.21, 0.33], golden: [0.24, 0.2, 0.33], night: [0.16, 0.18, 0.32],
};
const TAIL: [number, number, number] = [0.42, 0.44, 0.62];
const toSrgb = (v: number) => { const c = clamp01(v); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
const hexOf = (c: [number, number, number], k: number) => "#" + c.map((v) => Math.round(255 * toSrgb(1 - (1 - v) * k)).toString(16).padStart(2, "0")).join("");
const blob = (out: Stage, x: number, y: number, z: number) => {
  const hl = Math.hypot(SUN.x, SUN.z) || 1, ox = -SUN.x / hl, oz = -SUN.z / hl, rot = Math.atan2(-ox, -oz);
  if (LNAME !== "golden") {
    const tc = hexOf(TAIL, 1);
    out.fx.push({ key: `blob|shadow|${tc}`, cw: 128, ch: 256, draw: (p) => fxShadow(p, tc), x: x + ox * 0.4, y: y + 0.02, z: z + oz * 0.4, w: 0.7, h: 1.3, flat: true, rot });
  }
  const cc = hexOf(CONTACT[LNAME], 1);
  out.fx.push({ key: `blob|contact|${cc}`, cw: 128, ch: 128, draw: (p) => fxContact(p, cc), x, y: y + 0.03, z, w: 0.55, h: 0.42, flat: true, rot });
};

const HOOK: Outfit = { jacket: "#a83232", pants: "#1c3558", boots: "#241910", hat: "tophat", belt: "#e0b44a", moustache: "#2a1c14", skin: "#e7b48a", build: "stout", buttons: "#f2e2a8" };
const CREW: Outfit[] = [
  { jacket: "#2f6a4a", pants: "#3a3128", boots: "#241910", hat: "cap", cap: "#1c1c1c", skin: "#c98a5a", moustache: "#1a120e" },
  { jacket: "#c4552a", pants: "#243044", boots: "#241910", hat: "hair", hair: "#1a120e", skin: "#f0c8a0" },
  { jacket: "#3d4e86", pants: "#6a4a2a", boots: "#241910", hat: "cap", cap: "#f4f1ea", skin: "#e0b48a", build: "stout" },
];
const CREW_AT: [number, number][] = [[4.0, 2.4], [5.6, 1.6], [3.4, 3.5]];

const mapCard = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "#f3e2b0"; g.strokeStyle = "#241726"; g.lineWidth = 10;
  g.fillRect(30, 40, 240, 320); g.strokeRect(30, 40, 240, 320);
  g.strokeStyle = "#8c3b3b"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(70, 280); g.lineTo(140, 180); g.lineTo(210, 220); g.lineTo(180, 90); g.stroke();
  g.fillStyle = "#c9a24a"; g.beginPath(); g.arc(180, 90, 12, 0, 7); g.fill();
};
const dust = (p: Pen) => {
  const g = p.g;
  g.fillStyle = "rgba(226,201,146,0.85)";
  g.beginPath(); g.ellipse(80, 80, 50, 30, 0, 0, 7); g.fill();
  g.beginPath(); g.ellipse(130, 60, 28, 16, 0.4, 0, 7); g.fill();
};

const faceOf = (h: HookPose): Expr => h.face;

export const stage = (id: number, t: number, cam: CamInfo): Stage => {
  const out: Stage = { places: [], fx: [] };
  LNAME = SHOTS[id - 1].light;
  findSun(cam, SUN);
  const h = hookPose(t);
  const bob = h.dig ? Math.abs(Math.sin(t * 9)) * 0.06 : h.hammock ? Math.sin(t * 1.6) * 0.04 : Math.abs(Math.sin(t * 2.2 + 1)) * 0.02;
  const dx = cam.pos.x - h.x, dz = cam.pos.z - h.z, len = Math.hypot(dx, dz) || 1;
  const face = faceOf(h);
  const digSide = h.dig;
  const fdx = digSide ? -dz / len : dx / len;
  const fdz = digSide ? dx / len : dz / len;
  const mode = h.walk > 0 ? "march" : h.hammock ? "sit" : "stand";
  out.places.push(person(cam, { i: 1, o: HOOK, okey: "hook" }, h.x, D0 + h.y + bob, h.z, fdx, fdz,
    { mode, expr: face, blink: lidAt(t, 1), phase: h.walk, look: h.face === "dazed" ? Math.sin(t * 1.4) * 0.8 : 0 },
    { mode: h.dig ? "push" : h.walk > 0 ? "march" : "stand", expr: face, blink: lidAt(t, 1), phase: h.walk, pose: h.dig ? 0.35 + 0.35 * Math.sin(t * 8) : 0 }));
  blob(out, h.x, D0 + (h.hammock ? 0 : h.y), h.z);
  const showCrew = id <= 5 || id === 8 || id === 9;
  if (showCrew) {
    CREW.forEach((o, i) => {
      const [x, z] = CREW_AT[i];
      const laugh = id === 5;
      const yb = laugh ? Math.abs(Math.sin(t * 7 + i)) * 0.08 : Math.sin(t * 1.5 + i) * 0.02;
      const expr: Expr = laugh ? "laugh" : id === 3 ? "grin" : "smile";
      const cdx = h.x - x, cdz = h.z - z, cl = Math.hypot(cdx, cdz) || 1;
      out.places.push(person(cam, { i: 4 + i, o, okey: "crew" + i }, x, D0 + yb, z, cdx / cl, cdz / cl,
        { mode: "stand", expr, blink: lidAt(t, 4 + i) },
        { mode: "stand", expr, blink: lidAt(t, 4 + i) }));
      blob(out, x, D0, z);
    });
  }
  if (h.dig && (t * 8) % 1 < 0.25) {
    out.fx.push({ key: `dust|${q(t, 8)}`, cw: 160, ch: 160, draw: dust, x: h.x, y: 0.25, z: h.z + 0.3, w: 0.8, h: 0.5, soft: true });
  }
  if (id === 3 || (id === 4 && t < 19.6 + 1.4)) {
    out.fx.push({ key: "map", cw: 300, ch: 400, draw: mapCard, x: h.x + 0.35, y: h.y + 1.15, z: h.z + 0.2, w: 0.42, h: 0.55, rot: -0.3 });
  }
  return out;
};

export { FPS };
