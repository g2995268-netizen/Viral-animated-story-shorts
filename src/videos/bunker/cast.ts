// Flat cartoon people for the bunker film. Drawings come from the bridge toon pen;
// cards are lit by the scene sun and never picked up by the world ink pass.
import * as THREE from "three";
import { Pen, bodyFront, townsfolk, Outfit, Expr, SKINS } from "./toon";
import { NOINK } from "./ink";
import { cardShade, blobMaterial, CARD_K } from "./cardshade";
import { FPS, SHOTS, camAt } from "./story";

type Entry = { cv: HTMLCanvasElement; tex: THREE.CanvasTexture; w: number; h: number };
type Req = { key: string; w: number; h: number; k: number; draw: (p: Pen) => void; tex?: THREE.CanvasTexture };

export class Pool {
  private live = new Map<string, Entry>();
  private free: Entry[] = [];
  private reqs: Req[] = [];
  req(key: string, w: number, h: number, k: number, draw: (p: Pen) => void) {
    const r: Req = { key: `${w}x${h}|${key}`, w, h, k, draw };
    this.reqs.push(r); return r;
  }
  flush() {
    const want = new Map<string, Req[]>();
    for (const r of this.reqs) { const l = want.get(r.key); if (l) l.push(r); else want.set(r.key, [r]); }
    for (const [key, e] of this.live) if (!want.has(key)) { this.live.delete(key); this.free.push(e); }
    for (const [key, rs] of want) {
      let e = this.live.get(key);
      if (!e) {
        const r = rs[0], i = this.free.findIndex((x) => x.w === r.w && x.h === r.h);
        e = i >= 0 ? this.free.splice(i, 1)[0] : (() => {
          const cv = document.createElement("canvas"); cv.width = r.w; cv.height = r.h;
          const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
          return { cv, tex, w: r.w, h: r.h };
        })();
        const g = e.cv.getContext("2d")!;
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.w, e.h); g.setTransform(r.k, 0, 0, r.k, 0, 0);
        r.draw(new Pen(g)); e.tex.needsUpdate = true; this.live.set(key, e);
      }
      for (const r of rs) r.tex = e.tex;
    }
    this.reqs = [];
  }
}

const blank = (() => { const c = document.createElement("canvas"); c.width = c.height = 2; return new THREE.CanvasTexture(c); })();
const SU = 0.00216;
const BODY = (() => { const g = new THREE.PlaneGeometry(600 * SU, 1000 * SU); g.translate(0, (975 - 500) * SU, 0); return g; })();

export class Actor {
  mesh: THREE.Mesh; mat: THREE.MeshLambertMaterial; dmat: THREE.MeshDepthMaterial; r: Req | null = null;
  constructor(parent: THREE.Object3D) {
    this.mat = cardShade(new THREE.MeshLambertMaterial({ map: blank, alphaTest: 0.5, side: THREE.DoubleSide }));
    this.dmat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: blank, alphaTest: 0.5, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(BODY, this.mat);
    this.mesh.customDepthMaterial = this.dmat;
    this.mesh.onBeforeRender = (r) => { const rt = r.getRenderTarget(); CARD_K.uPx.value = (rt ? rt.height : r.domElement.height) / 1920; };
    this.mesh.castShadow = true; this.mesh.receiveShadow = true; this.mesh.visible = false;
    this.mesh.layers.set(NOINK); parent.add(this.mesh);
  }
  bind() { const t = this.r?.tex; if (t) { this.mat.map = t; this.dmat.map = t; } }
}

const q = (v: number, n = 12) => Math.round(v * n) / n;
const hh = (i: number, s = 0) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };

export const HERO: Outfit = { jacket: "#f2c14e", pants: "#3c465c", boots: "#2c241c", hat: "hair", hair: "#3a2a22", skin: SKINS[0], buttons: "#5a4630" };
export const COMMANDER: Outfit = { jacket: "#2f6a3a", pants: "#243028", boots: "#1c1a18", hat: "cap", cap: "#243028", belt: "#c9ccd0", build: "stout", moustache: "#3a2a22", skin: SKINS[1] };
const GUARD = (n: number): Outfit => ({ jacket: "#3d4c5c", pants: "#2a3038", boots: "#1a1c20", hat: "cap", cap: "#1e242c", belt: "#b7bdc4", skin: SKINS[n + 1] });
const SCI = (n: number): Outfit => ({ jacket: "#f7f8fb", pants: "#d5d8e0", boots: "#c5c8d0", hat: "hair", hair: ["#2a241c", "#6a4a32", "#1c1c1c"][n], skin: SKINS[n] });

export type Who = {
  i: number; o: Outfit; role: string;
  x: number; z: number; y?: number;
  expr: Expr; mode?: "stand" | "stroll" | "sit";
  glasses?: boolean; pack?: boolean; phase?: number; look?: number; headTilt?: number; wave?: number; blink?: number; scale?: number;
};

const tier = (d: number): [number, number, number] =>
  d < 3.2 ? [480, 800, 0.8] : d < 7 ? [360, 600, 0.6] : d < 14 ? [240, 400, 0.4] : [160, 260, 0.26];

const LID = [0.5, 1, 1, 0.5];
const blinkOf = (t: number, i: number, force?: number) => {
  if (force !== undefined) return force;
  const f = Math.round(t * FPS);
  let s = Math.round(40 * hh(i, 3));
  for (let n = 0; s <= f && n < 500; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += Math.round(18 + 48 * hh(i * 13 + n, 5));
  }
  return 0;
};

const drawWho = (p: Pen, w: Who, light: number) => {
  if (w.pack) {
    p.poly([[222, 500], [258, 492], [260, 630], [218, 640]], "#b85a32", 5);
    p.poly([[378, 492], [342, 500], [340, 630], [382, 640]], "#b85a32", 5);
  }
  bodyFront(p, w.o, {
    phase: w.phase ?? 0, expr: w.expr, mode: w.mode ?? "stand", look: w.look ?? 0,
    blink: w.blink ?? 0, headTilt: w.headTilt ?? 0, wave: w.wave, light, seed: (w.i % 7) + 1, lift: w.mode === "stroll" ? 36 : 0,
  });
  if (w.pack) {
    p.band([[268, 470], [268, 700]], "#5a3a28", 16, 3);
    p.band([[332, 470], [332, 700]], "#5a3a28", 16, 3);
  }
  if (w.glasses) {
    p.ell(268, 312, 22, 16, null, 5);
    p.ell(332, 312, 22, 16, null, 5);
    p.stroke([[290, 312], [310, 312]], 4);
    p.stroke([[246, 312], [228, 304]], 4);
    p.stroke([[354, 312], [372, 304]], 4);
  }
};

const CROWD: Who[] = [];
const coats = ["#3f6fb5", "#8c3b4a", "#5d7a3a", "#b5653f", "#2f5f6a", "#7b5ac9", "#c9842f", "#35586e"];
for (let i = 0; i < 16; i++) {
  const col = i % 4, row = Math.floor(i / 4);
  const folk = townsfolk(i);
  folk.jacket = coats[i % coats.length];
  folk.hat = i % 3 === 0 ? "cap" : i % 3 === 1 ? "hair" : null;
  if (folk.hat === "cap") folk.cap = coats[(i + 3) % coats.length];
  if (folk.hat === "hair") folk.hair = ["#2a241c", "#6a4a32", "#1a1a1a", "#8a6848"][i % 4];
  folk.skin = SKINS[i % 4];
  folk.rifle = false;
  CROWD.push({ i: 10 + i, o: folk, role: i === 5 ? "glasses" : "crowd", x: -3.3 + col * 2.2, z: -1.2 + row * 1.7, expr: "neutral", glasses: i === 5 });
}
const SIT: Who[] = [-4, -1, 2, 5].map((z, i) => ({
  i: 40 + i, o: { ...townsfolk(i + 2), rifle: false, hat: "hair", hair: "#3a2a22" }, role: "sit",
  x: i % 2 ? 6.15 : -6.15, z, y: 0.42, expr: "neutral" as Expr, mode: "sit" as const,
}));

export type CastIn = { id: number; f: number; camPos: THREE.Vector3; camRight: THREE.Vector3; sun: THREE.Vector3 };

const exprFor = (role: string, id: number, base: Expr): Expr => {
  if (role === "hero") {
    if (id === 1) return "relief";
    if (id === 2 || id === 22 || id === 26) return "smile_closed";
    if (id === 4 || id === 13) return "nervous";
    if (id === 5 || id === 15 || id === 17 || id === 28) return "shock";
    if (id === 14) return "smile";
    if (id === 19) return "nervous";
    if (id === 20 || id === 23 || id === 24 || id === 25) return "pained";
    return "nervous";
  }
  if (role === "cmd") return id === 9 || id === 16 ? "stern" : "neutral";
  if (role === "g1" || role === "g2") return id >= 18 ? "stern" : "neutral";
  if (role === "glasses") return id === 17 || id === 34 || id >= 33 ? "shock" : id === 8 || id === 18 ? "stern" : base;
  if (role === "sci") return id === 31 ? "neutral" : "smile";
  if (role === "crowd" || role === "sit") {
    if (id === 6 || id === 8 || id === 18) return "stern";
    if (id === 33 || id === 36 || id === 5) return "shock";
    if (id === 20) return "stern";
    return base;
  }
  return base;
};

export const poseCast = (pool: Pool, actors: Actor[], inp: CastIn) => {
  const { id, f, camPos } = inp;
  const t = f / FPS;
  const set = SHOTS[id - 1].set;
  const inHall = set === "hall" || set === "lock";
  const people: Who[] = [];

  const hero: Who = {
    i: 1, o: HERO, role: "hero", pack: true, x: 0.05, z: -6.2, expr: "neutral",
  };
  if (id === 1) hero.z = -7.2 + Math.min(1, (f - SHOTS[0].a) / 50) * 1.1;
  if (id === 20) hero.z = -6.2 - Math.min(1, (f - SHOTS[19].a) / 40) * 0.9;
  if (id >= 22 && id <= 26) { hero.x = 0; hero.z = -11.7; }
  if (set === "street" && id !== 29) { hero.x = 0.55; hero.z = 0.4; }
  if (id === 7 || id === 13) hero.wave = 0.7 + 0.3 * Math.sin(t * 6);
  if (id === 24) hero.wave = Math.sin(t * 14) > 0 ? 1.1 : 0.2;
  if (id === 2 || id === 22 || id === 25 || id === 26) hero.blink = 1;
  if (inHall && id !== 21) people.push(hero);
  if (set === "street" && id !== 27 && id !== 29) people.push(hero);

  const cmd: Who = { i: 2, o: COMMANDER, role: "cmd", x: 2.35, z: -3.3, expr: "stern" };
  const g1: Who = { i: 3, o: GUARD(0), role: "g1", x: -2.3, z: -4.3, expr: "neutral", mode: "stroll" };
  const g2: Who = { i: 4, o: GUARD(1), role: "g2", x: 1.7, z: -4.6, expr: "neutral", mode: "stroll" };
  if (id === 10) { g1.x = -4.5 + ((f - SHOTS[9].a) / 80) * 3; g2.z = -2 + ((f - SHOTS[9].a) / 90) * 2.5; }
  if (id === 20) { g1.x = -0.55; g1.z = -5.7; g2.x = 0.7; g2.z = -5.9; g1.mode = "stand"; g2.mode = "stand"; }
  if (inHall) people.push(cmd, g1, g2, ...CROWD, ...SIT);

  if (set === "lab" || id === 29) {
    people.push(
      { i: 60, o: SCI(0), role: "sci", x: -4.7, z: 0.55, expr: "neutral", glasses: true, wave: id === 31 ? Math.sin(t * 5) * 0.4 : undefined },
      { i: 61, o: SCI(1), role: "sci", x: -3.7, z: -0.55, expr: "smile" },
      { i: 62, o: SCI(2), role: "sci", x: -5.6, z: -1.4, expr: "neutral" },
    );
  }
  if (set === "street") {
    for (let i = 0; i < 3; i++) people.push({
      i: 70 + i, o: { ...townsfolk(i), rifle: false }, role: "ped",
      x: -0.4, z: ((t * (0.6 + i * 0.2) + i * 4) % 18) - 8, expr: "neutral", mode: "stroll",
    });
  }

  const right = inp.camRight;
  const sun = inp.sun;
  // canvas angle the sun comes from, snapped so drawings cache
  const sx = sun.dot(right), sy = -sun.y;
  const light = Math.round(Math.atan2(sy, sx) / (Math.PI / 4)) * (Math.PI / 4);

  people.forEach((w, n) => {
    const a = actors[n];
    if (!a) return;
    const y = w.y ?? 0;
    const dx = camPos.x - w.x, dz = camPos.z - w.z;
    if (dx * dx + dz * dz < 0.35) { a.mesh.visible = false; return; }
    const expr = exprFor(w.role, id, w.expr);
    const phase = q((w.phase ?? t * (w.mode === "stroll" ? 1.3 : 0.35) + w.i * 0.17) % 1, 4);
    const look = q(w.look ?? Math.sin(t * 0.7 + w.i) * (id === 6 ? 0.2 : 0.45), 2);
    const headTilt = Math.round((w.headTilt ?? Math.sin(t * 1.3 + w.i) * 3) / 3) * 3;
    const blink = blinkOf(t, w.i, w.blink);
    const wave = w.wave === undefined ? undefined : q(w.wave, 4);
    const d = Math.hypot(dx, dz, camPos.y - (y + 1.3));
    const [cw, ch, k] = tier(d);
    const posed: Who = { ...w, expr, phase, look, headTilt, blink, wave };
    const key = `${w.role}|${w.i % 7}|${expr}|${w.mode ?? "stand"}|${phase}|${look}|${headTilt}|${blink}|${wave ?? "-"}|${w.glasses ? 1 : 0}|${w.pack ? 1 : 0}|${light.toFixed(2)}`;
    a.r = pool.req(key, cw, ch, k, (p) => drawWho(p, posed, light));
    a.mesh.visible = true;
    a.mesh.position.set(w.x, y + Math.sin(t * 1.6 + w.i) * 0.012, w.z);
    a.mesh.rotation.set(0, Math.atan2(dx, dz), 0);
    const sc = (w.scale ?? 1) * (1 + Math.sin(t * 1.8 + w.i) * 0.008);
    a.mesh.scale.set(sc, sc, sc);
  });
  for (let n = people.length; n < actors.length; n++) actors[n].mesh.visible = false;
  pool.flush();
  for (const a of actors) a.bind();
};

export const focusOf = (id: number, f: number): THREE.Vector3 => {
  const c = camAt(id, f);
  return new THREE.Vector3(c.look[0], c.look[1], c.look[2]);
};
