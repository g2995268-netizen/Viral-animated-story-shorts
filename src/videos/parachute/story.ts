// Parachute short on the bridge world. The town stays standing. One jumper falls through it.
// Cameras change angle every beat. Only the opening shot is first person.
export const FPS = 30;
export const TOTAL = 2090;
export const D0 = 6.0;
export const HALF = 27;
export const FILES = [-1.65, -0.55, 0.55, 1.65];
export const ROW_GAP = 1.3;
export const COUNT = 74;
export type V3 = [number, number, number];
export const PARK: V3 = [70, D0, -75];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const easeOut = (u: number) => 1 - (1 - clamp01(u)) ** 4;
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

export const SNAP = 34.62, DROP0 = 36.35, DROP1 = 36.95;
export const DROP_H = 6.6;
export const front = (tau: number) => 26 - 1.6 * (tau - 4.4);
export const marchPhase = (tau: number) => ((tau % 1) + 1) % 1;
export const amp = (_tau: number) => 0;
export const stomp = (_tau: number) => 1;
export const shapeZ = (z: number) => (Math.abs(z) < HALF ? Math.cos((Math.PI * z) / (2 * HALF)) : 0);
export const dropW = (z: number) => smooth((20 - z) / 26);
export const dropU = (_tau: number) => 0;
export type BridgeState = { bounce: number; drop: number; snap: number; collapsed: boolean };
export const deckY = (z: number, b: BridgeState) => D0 + b.bounce * shapeZ(z) - b.drop * DROP_H * dropW(z);
export const bridgeState = (_id: number, _t: number): BridgeState => ({ bounce: 0, drop: 0, snap: 0, collapsed: false });
export const ANCHOR: V3 = [-2.7, D0 + 0.62, -37];
export const snapEnd = (_snap: number): V3 => [ANCHOR[0], ANCHOR[1], ANCHOR[2]];

/** Feet altitude. Starts high over the valley and is lower in every later shot. */
export const fallY = (t: number) => {
  if (t <= 56) return 88 - 1.28 * t;
  return Math.max(D0 + 1.15, 16.3 - 0.72 * (t - 56));
};
/** Drift from above the river to the park, so the landing is not the water. */
export const jumperAt = (t: number): V3 => {
  const u = clamp01(t / 64);
  const s = u * u * (3 - 2 * u);
  return [lerp(6, 64, s), fallY(t), lerp(-6, -78, s)];
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Light = "day" | "golden";
export type Crowd = "march" | "fall" | "water" | "bank" | "tourists" | "none";
export type ShotDef = { id: number; a: number; b: number; light: Light; crowd: Crowd; tau: (t: number) => number; towns?: boolean; sunAz?: number; sunEl?: number };
const idn = (t: number) => t;
const F = (sec: number) => Math.max(0, Math.round(sec * FPS) - 2);

// Cuts land about 2 frames before the stressed word (F already subtracts those frames).
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: F(5.46), light: "day", crowd: "none", tau: idn },                 // failed / sixty seconds
  { id: 2, a: F(5.46), b: F(8.74), light: "day", crowd: "none", tau: idn, towns: true }, // Look / 3,300 m
  { id: 3, a: F(8.74), b: F(15.06), light: "day", crowd: "none", tau: idn },          // 200 km/h, belly, handles
  { id: 4, a: F(15.06), b: F(18.20), light: "day", crowd: "none", tau: idn },         // streamer
  { id: 5, a: F(18.20), b: F(22.36), light: "day", crowd: "none", tau: idn },         // cutaway
  { id: 6, a: F(22.36), b: F(25.96), light: "day", crowd: "none", tau: idn, towns: true }, // reserve, still a map
  { id: 7, a: F(25.96), b: F(30.22), light: "day", crowd: "none", tau: idn },         // stay flat / head-down
  { id: 8, a: F(30.22), b: F(40.62), light: "day", crowd: "none", tau: idn },         // lake and road
  { id: 9, a: F(40.62), b: F(44.96), light: "golden", crowd: "none", tau: idn, sunAz: 40, sunEl: 18 }, // snow, slope, trees
  { id: 10, a: F(44.96), b: F(48.64), light: "day", crowd: "none", tau: idn },        // car window
  { id: 11, a: F(48.64), b: F(56.36), light: "day", crowd: "none", tau: idn },        // still fast, the box
  { id: 12, a: F(56.36), b: F(60.64), light: "day", crowd: "none", tau: idn },        // reserve opens
  { id: 13, a: F(60.64), b: TOTAL, light: "golden", crowd: "none", tau: idn, sunAz: 130, sunEl: 16, towns: true },
];
/** 5-frame dissolves on every angle change. The hook still ends on a white flash. */
export const XFADE: Record<number, number> = { 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5, 10: 5, 11: 5, 12: 5, 13: 5 };
export const FLASH_AT = F(5.46);
export type Mood = "fall" | "day" | "warm";
/** High fall is contrasty. The street stays noon. Snow and the ending go warm. */
export const moodAt = (id: number): Mood => (id <= 7 || id === 11 ? "fall" : id === 9 || id === 13 ? "warm" : "day");

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k,
  roll: a.roll + (b.roll - a.roll) * k,
});

const push = (pos: V3, look: V3, f: number, f0: number, rate = 0.002): V3 => {
  const k = Math.exp(-rate * Math.max(0, f - f0));
  return [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k];
};

const J = (f: number) => jumperAt(f / FPS);

export const camAt = (id: number, f: number): Cam => {
  const j = J(f);
  const t = f / FPS;
  let pos: V3;
  let look: V3 = [j[0], j[1] + 1.1, j[2]];
  let fov = 42;
  let roll = 0;
  const a0 = SHOTS[id - 1].a;
  switch (id) {
    case 1: // POV straight down the valley; the rag is placed in the top of this view
      pos = [j[0], j[1] + 0.2, j[2]];
      look = [j[0], j[1] - 22, j[2] + 14];
      fov = 66;
      roll = -0.04;
      break;
    case 2: // far enough that the quay AND the jumper share the frame
      pos = push([j[0] - 28, D0 + 2.2, j[2] + 52], [j[0], D0 + 6, j[2]], f, a0, 0.0012);
      look = [j[0], j[1] * 0.42 + D0 * 0.58, j[2]];
      fov = 62;
      roll = 0.03;
      break;
    case 3: // side, belly to earth, handles
      pos = push([j[0] + 6.5, j[1] + 0.4, j[2] + 4.5], j, f, a0);
      fov = 38;
      roll = -0.04;
      break;
    case 4: // above, the streamer
      pos = push([j[0] - 1.2, j[1] + 4.8, j[2] - 1.5], j, f, a0, 0.0024);
      look = [j[0], j[1] + 1.6, j[2]];
      fov = 46;
      roll = 0.08;
      break;
    case 5: // cutaway, close
      pos = push([j[0] + 2.4, j[1] + 0.6, j[2] + 2.2], j, f, a0, 0.0026);
      fov = 34;
      roll = -0.06;
      break;
    case 6: // reserve, the town is still a map
      pos = push([j[0] + 16, j[1] + 18, j[2] + 12], [j[0], D0 + 4, j[2]], f, a0, 0.0014);
      look = [j[0], j[1] - 2, j[2]];
      fov = 50;
      break;
    case 7: { // flat, then head-down, then flat
      const dive = t > 27.05 && t < 28.9 ? Math.sin(((t - 27.05) / 1.85) * Math.PI) : 0;
      pos = push([j[0] + 5.5, j[1] + 0.2, j[2] - 3.2], j, f, a0);
      fov = 40 + dive * 10;
      roll = dive * 0.9;
      break;
    }
    case 8: // across the river: water and the quay below, jumper above them
      pos = push([-22, D0 + 4, 22], [j[0], D0 + 4, j[2]], f, a0, 0.0011);
      look = [j[0], j[1] * 0.32 + D0, j[2]];
      fov = 58;
      roll = -0.04;
      break;
    case 9: // park, trees and the snow patch, jumper just over them
      pos = push([92, D0 + 5, -42], [j[0], D0 + 8, j[2]], f, a0, 0.0012);
      look = [j[0], j[1] * 0.38 + D0, j[2]];
      fov = 56;
      roll = 0.06;
      break;
    case 10: // the whole car, the window, the street
      pos = push([36, D0 + 2.6, -22], [51, D0 + 1.4, -35], f, a0, 0.001);
      look = [51, D0 + 1.4, -35];
      fov = 34;
      roll = -0.02;
      break;
    case 11: // low, roofs big, the box
      pos = push([j[0] + 3.2, j[1] + 0.3, j[2] + 2.6], j, f, a0, 0.0022);
      fov = 36;
      roll = 0.05;
      break;
    case 12: // canopy opens, still descending
      pos = push([j[0] + 5, j[1] - 0.4, j[2] + 4], [j[0], j[1] + 1.4, j[2]], f, a0, 0.0016);
      look = [j[0], j[1] + 1.4, j[2]];
      fov = 44;
      roll = -0.04;
      break;
    default: // field, water far to the side
      pos = push([70, D0 + 2.2, -62], [j[0], j[1] + 1, j[2]], f, a0, 0.0014);
      look = [j[0], j[1] + 0.8, j[2]];
      fov = 42;
      roll = 0.04;
  }
  // Air buffet so a hold is never a frozen frame. The car shot stays calmer.
  const air = id === 10 ? 0.2 : id >= 12 ? 0.4 : 1;
  const amp = 0.055 * air * (id === 7 ? 1.7 : 1);
  pos = [
    pos[0] + Math.sin(t * 14.2) * amp + Math.sin(t * 27.5 + 1.1) * amp * 0.35,
    pos[1] + Math.sin(t * 9.6 + 0.4) * amp * 0.65,
    pos[2] + Math.cos(t * 12.1) * amp * 0.45,
  ];
  roll += Math.sin(t * 8.4) * 0.02 * air;
  const age = f - a0;
  if (age >= 0 && age < 7 && id > 1) {
    const hard = id === 5 || id === 7 || id === 12;
    const s = (age % 2 ? -1 : 1) * (1 - age / 7) ** 1.6 * (hard ? 0.14 : 0.07);
    roll += s;
    pos = [pos[0] + s * 0.55, pos[1] - Math.abs(s) * 0.2, pos[2]];
  }
  const dive = t > 27.05 && t < 28.9 ? Math.sin(((t - 27.05) / 1.85) * Math.PI) : 0;
  if (id === 7) roll += dive * 0.15;
  const cut = Math.floor((t - 18.2) * FPS);
  const kick = cut >= 0 && cut < 7 && id === 5 ? (cut % 2 ? -1 : 1) * (1 - cut / 7) ** 1.5 * 0.16 : 0;
  return { pos, look, fov, roll: roll + kick };
};

export const dofAt = (f: number) => {
  const id = shotAt(f).id;
  const t = f / FPS;
  const focus = (_f: number) => {
    const j = jumperAt(t);
    return [j[0], j[1] + 1.15, j[2]] as V3;
  };
  if (id === 1) return { cInf: 5 };
  if (id === 2) return { cInf: 4, focus };
  if (id === 5 || id === 11) return { cInf: 12, focus };
  if (id === 10) return { cInf: 8, focus: (_f: number) => [52.2, D0 + 1.3, -36.2] as V3 };
  if (id === 8 || id === 9) return { cInf: 7, focus };
  if (id >= 12) return { cInf: 6, focus };
  return { cInf: 3, focus };
};

export type Fg = { a: number; b: number; kit: string; pos: V3; s?: number; yaw?: number };
export const FOREGROUND: Fg[] = [];
