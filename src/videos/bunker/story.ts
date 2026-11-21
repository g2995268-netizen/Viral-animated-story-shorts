// Bunker 101. Shot order and rough beats follow the attached shot list.
// Boundaries are snapped to the voice in shots.json after the transcript lands; cameras are local to each shot.
import type { LightName } from "./lights";

export const FPS = 30;
export const TOTAL = 3402; // 113.40 s voice
export type V3 = [number, number, number];
export type SetName = "hall" | "lock" | "street" | "lab";
export type ShotDef = { id: number; a: number; b: number; light: LightName; set: SetName; zoom?: boolean; cInf: number };

// Frame each shot starts. Snapped to the voice: sirens, the 101 alert, the pass,
// the recount, access denied, the hatch, the sky, the lab, the last 99/100.
const ENDS = [0, 153, 204, 342, 383, 550, 668, 764, 791, 848, 995, 1146, 1216, 1322, 1412, 1494, 1606, 1707, 1831, 1900, 2029, 2180, 2249, 2300, 2372, 2476, 2601, 2657, 2773, 2868, 2944, 3019, 3126, 3177, 3332, 3353, TOTAL];
const LIGHT: LightName[] = [
  "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm",
  "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm", "alarm",
  "alarm", "alarm", "alarm", "alarm", "alarm", "alarm",
  "day", "day", "day",
  "lab", "lab", "lab",
  "alarm", "alarm", "alarm", "alarm",
];
const SETS: SetName[] = [
  "hall", "hall", "hall", "hall", "hall", "hall", "hall", "hall", "hall", "hall",
  "hall", "hall", "hall", "hall", "hall", "hall", "hall", "hall", "hall", "hall",
  "lock", "lock", "lock", "lock", "lock", "lock",
  "street", "street", "street",
  "lab", "lab", "lab",
  "hall", "hall", "hall", "hall",
];
const CINF = [8, 15, 10, 5, 12, 6, 11, 15, 14, 3, 12, 12, 12, 11, 10, 13, 16, 14, 15, 10, 8, 15, 9, 16, 6, 15, 0, 8, 9, 5, 14, 12, 5, 16, 13, 8];
const ZOOM = new Set([32]);

export const SHOTS: ShotDef[] = ENDS.slice(0, -1).map((_, i) => ({
  id: i + 1, a: ENDS[i], b: ENDS[i + 1], light: LIGHT[i], set: SETS[i], zoom: ZOOM.has(i + 1), cInf: CINF[i],
}));

/** crossfade length (frames) when the place changes */
export const XFADE: Record<number, number> = { 21: 8, 27: 8, 30: 8, 33: 8 };
/** white flash as the outer hatch blows open */
export const FLASH_AT = 2372;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Fr = { pos: V3; look: V3; fov?: number; roll?: number };
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Fr): Cam => ({ fov: c.fov ?? 40, roll: c.roll ?? 0, pos: c.pos, look: c.look });
const F = (x: number, y: number, z: number, lx: number, ly: number, lz: number, fov = 40, roll = 0): Fr =>
  ({ pos: [x, y, z], look: [lx, ly, lz], fov, roll });

/** two or three framings. The move between them is a short glide, then a creep. */
const FR: Fr[][] = [
  [F(2.4, 1.85, -2.6, 0.15, 1.4, -6.4, 50, -0.04), F(0.9, 1.6, -3.8, 0.1, 1.42, -6.2, 42, -0.02)],
  [F(0.85, 1.62, -3.7, 0.05, 1.5, -6.2, 36), F(0.3, 1.52, -4.15, 0.05, 1.48, -6.2, 30, 0.03)],
  [F(0.7, 1.75, 1.6, 0, 2.15, 9.4, 42, -0.03), F(0.2, 1.68, 2.5, 0, 2.1, 9.4, 34)],
  [F(-2.6, 1.85, -7.7, 0.4, 1.35, -1.2, 50, 0.04), F(-0.9, 1.55, -6.7, 0.2, 1.4, -2.4, 40)],
  [F(0.45, 1.78, 1.9, 0, 2.2, 9.4, 38), F(0.1, 1.7, 2.7, 0, 2.12, 9.4, 30, -0.02)],
  [F(-0.7, 1.75, -6.6, 0.3, 1.4, 2.2, 52, 0.05), F(0.15, 1.55, -5.55, 0.1, 1.4, 1.2, 42, -0.02)],
  [F(-1.7, 1.55, -4.15, 0.15, 1.42, -5.9, 40), F(-0.7, 1.48, -4.55, 0.05, 1.45, -5.85, 32, 0.03)],
  [F(2.2, 1.58, -2.55, -0.15, 1.48, -0.7, 34, -0.04), F(1.15, 1.5, -1.85, 0.05, 1.48, -0.55, 26)],
  [F(4.05, 1.6, -2.15, 2.35, 1.48, -3.45, 36), F(3.15, 1.52, -2.55, 2.3, 1.5, -3.35, 28, -0.04)],
  [F(-5.6, 2.7, -6.8, 0.2, 1.15, 1.5, 54, 0.04), F(-3.6, 2.05, -5.4, 0.6, 1.25, 2, 44, -0.02)],
  [F(-0.35, 1.72, 2.0, 0.1, 2.05, 9.4, 36), F(0.15, 1.68, 2.8, 0, 2.02, 9.4, 30)],
  [F(0.4, 1.8, 1.8, 0, 2.2, 9.4, 38, 0.03), F(0.05, 1.72, 2.6, 0, 2.12, 9.4, 30)],
  [F(1.15, 1.55, -4.05, -0.05, 1.45, -5.9, 38), F(0.35, 1.48, -4.55, 0, 1.48, -5.85, 30, 0.04)],
  [F(-1.9, 1.6, -4.2, 0.35, 1.42, -5.6, 40, -0.03), F(-0.85, 1.5, -4.6, 0.15, 1.45, -5.7, 32)],
  [F(0.9, 1.55, 2.4, 0, 2.05, 9.4, 38), F(0.35, 1.5, 3.1, 0, 2.0, 9.4, 32, 0.03)],
  [F(-0.4, 1.6, 2.2, 0.15, 1.85, 9.35, 36), F(0.1, 1.55, 2.9, 0.05, 1.78, 9.35, 30)],
  [F(0.55, 1.55, -2.85, 1.25, 1.5, -1.35, 32), F(0.85, 1.5, -2.25, 1.28, 1.52, -1.32, 22, -0.03)],
  [F(-2.5, 1.6, 0.2, -0.2, 1.45, 1.6, 36, 0.05), F(-1.55, 1.5, 0.55, 0.05, 1.46, 1.35, 28)],
  [F(0.85, 1.52, -4.15, 0, 1.48, -5.9, 34), F(0.2, 1.48, -4.7, 0.02, 1.5, -5.85, 26, 0.04)],
  [F(-2.5, 1.55, -4.35, 0.05, 1.35, -5.7, 42, -0.05), F(-1.15, 1.4, -4.85, 0, 1.38, -5.75, 34, 0.03)],
  [F(-0.15, 1.6, -11.35, 0.1, 1.4, -2, 46), F(0.1, 1.5, -10.7, 0, 1.4, -1, 38, -0.02)],
  [F(0.45, 1.55, -10.35, -0.02, 1.48, -11.7, 32), F(0.1, 1.5, -10.75, 0, 1.5, -11.65, 24)],
  [F(1.85, 1.45, -11.05, 0.05, 1.25, -12.7, 42, 0.05), F(1.25, 1.35, -11.45, 0.05, 1.3, -12.75, 34)],
  [F(0.4, 1.55, -11.15, 0, 1.48, -12.35, 30), F(0.05, 1.5, -11.55, 0, 1.5, -12.3, 22, -0.04)],
  [F(-0.2, 1.55, -10.5, 0, 1.35, -13.3, 44, 0.04), F(0.1, 1.45, -11.15, 0, 1.4, -13.2, 34)],
  [F(0.5, 1.55, -11.05, 0, 1.48, -12.25, 32), F(0.1, 1.5, -11.45, 0, 1.5, -12.2, 24, 0.03)],
  [F(2.4, 1.15, 6.2, -3, 8.5, -6, 56, 0.07), F(1.2, 1.7, 4.2, -2.2, 6.2, -4, 46, 0.03)],
  [F(3.6, 1.7, 3.4, 0.45, 1.35, 0.2, 42, -0.03), F(2.4, 1.55, 2.5, 0.5, 1.4, 0.3, 34)],
  [F(1.55, 1.65, 0.35, -3.2, 1.5, -0.1, 40), F(0.7, 1.55, 0.15, -3.4, 1.5, 0, 32, 0.03)],
  [F(-2.2, 1.75, 2.6, -4.2, 1.35, -0.4, 48), F(-2.8, 1.6, 1.7, -4.4, 1.4, -0.2, 40, -0.02)],
  [F(-3.3, 1.55, 1.15, -4.55, 1.42, -0.35, 34), F(-3.7, 1.5, 0.7, -4.6, 1.45, -0.3, 26, 0.03)],
  [F(-3.6, 1.7, 0.55, -4.15, 0.95, 0.15, 36), F(-3.85, 1.45, 0.35, -4.2, 0.92, 0.1, 28)],
  [F(-3.2, 2.15, -4.2, 0.2, 1.5, 2.5, 50, 0.04), F(-1.6, 1.75, -2.6, 0.3, 1.55, 2.2, 42)],
  [F(0.7, 1.55, -2.7, 1.25, 1.5, -1.35, 30), F(0.95, 1.5, -2.15, 1.28, 1.52, -1.32, 22, -0.04)],
  [F(0.25, 1.78, 2.1, 0, 2.15, 9.4, 36), F(-0.05, 1.7, 2.9, 0, 2.08, 9.4, 28)],
  [F(-3.4, 2.05, -4.6, 0.3, 1.55, 2.6, 50, 0.04), F(-2.0, 1.75, -3.2, 0.25, 1.5, 2.0, 42, -0.02)],
];

const dolly = (c: Cam, k: number): Cam => ({
  ...c,
  pos: c.look.map((v, i) => v + (c.pos[i] - v) * k) as V3,
});
const zoom = (c: Cam, k: number): Cam => ({ ...c, fov: (360 / Math.PI) * Math.atan(Math.tan((c.fov * Math.PI) / 360) * k) });

/** impact kicks: flip every frame, decay over 7 frames. `at` is frames from the shot start. */
const KICKS: { shot: number; at: number; mag: number }[] = [
  { shot: 1, at: 70, mag: 0.045 },
  { shot: 5, at: 4, mag: 0.03 },
  { shot: 20, at: 8, mag: 0.05 },
  { shot: 25, at: 6, mag: 0.06 },
  { shot: 32, at: 28, mag: 0.035 },
];
const kickOf = (id: number, f: number) => {
  const s = SHOTS[id - 1];
  let y = 0;
  for (const k of KICKS) {
    if (k.shot !== id) continue;
    const d = f - (s.a + k.at);
    if (d >= 0 && d < 7) y += k.mag * (1 - d / 7) * (d % 2 ? -1 : 1);
  }
  return y;
};

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const keys = FR[id - 1].map(full);
  const u = (f - s.a) / Math.max(1, s.b - s.a);
  let cam: Cam;
  if (keys.length === 2) cam = mix(keys[0], keys[1], glide(Math.min(1, (f - s.a) / 18)));
  else {
    const split = 0.42;
    cam = u < split ? mix(keys[0], keys[1], glide(u / split)) : mix(keys[1], keys[2], glide((u - split) / (1 - split)));
  }
  const creep = Math.exp(-0.0015 * Math.max(0, f - s.a));
  cam = s.zoom ? zoom(cam, creep) : dolly(cam, creep);
  const y = kickOf(id, f);
  if (y) cam = { ...cam, pos: [cam.pos[0], cam.pos[1] + y, cam.pos[2]], roll: cam.roll + y * 0.8 };
  return cam;
};

export const dofAt = (f: number) => {
  const s = shotAt(f);
  return { cInf: s.cInf };
};

/** which monitor card the hall screen shows */
export type Mon =
  | "logo" | "full" | "alert" | "ok" | "timer" | "still" | "term" | "deny" | "extra" | "seats" | "people";
export const monitorOf = (id: number): Mon => {
  if (id <= 2) return "logo";
  if (id === 3 || id === 4) return "full";
  if (id === 5 || id === 6) return "alert";
  if (id >= 7 && id <= 10) return "alert";
  if (id === 11) return "ok";
  if (id === 12) return "timer";
  if (id === 13 || id === 14) return "still";
  if (id === 15) return "alert";
  if (id === 16) return "term";
  if (id >= 17 && id <= 26) return "deny";
  if (id === 33) return "extra";
  if (id === 34) return "extra";
  if (id === 35) return "seats";
  if (id === 36) return "people";
  return "logo";
};

/** airlock countdown, seconds left, null outside the lock */
export const oxygenLeft = (id: number, f: number) => {
  if (id < 21 || id > 26) return null;
  const s = SHOTS[id - 1];
  const u = (f - s.a) / Math.max(1, s.b - s.a);
  if (id <= 22) return 10;
  if (id === 23) return 8 - Math.floor(u * 3);
  if (id === 24) return 5 - Math.floor(u * 2);
  return 0;
};
