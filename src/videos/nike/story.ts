// Timeline for the Nike short. Frames follow nike-short/voice/words.json (the supplied read).
// Visual reactions start about 2 frames before the word. Holds creep; big place changes crossfade; the hook ends on a white flash.
export const FPS = 30;
export const TOTAL = 2243; // 74.77 s, the voice file
export const D0 = 0;
export type V3 = [number, number, number];
export type Light = "day" | "golden";
export type SetName = "room" | "hangar" | "yard" | "pentagon";

export const OX = 700; // backyard
export const HZ = 700; // hangar
export const PX = -700; // pentagon

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };

const lead = (t: number) => Math.max(0, Math.round(t * FPS) - 2);

export type ShotDef = {
  id: number; a: number; b: number; light: Light; set: SetName;
  sunAz?: number; sunEl?: number;
  tau: (t: number) => number;
};
const idn = (t: number) => t;

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 238, light: "day", set: "room", tau: idn }, // hook, flash on "ракету"
  { id: 2, a: 238, b: lead(11.62), light: "golden", set: "pentagon", sunAz: 130, sunEl: 22, tau: idn }, // "косяк Пентагона"
  { id: 3, a: lead(11.62), b: lead(18.56), light: "day", set: "room", tau: idn }, // 2002, Дэвид, радиодетали
  { id: 4, a: lead(18.56), b: lead(28.33), light: "day", set: "hangar", tau: idn }, // списанный контейнер
  { id: 5, a: lead(28.33), b: lead(32.04), light: "day", set: "room", tau: idn }, // 500 баксов, выиграл
  { id: 6, a: lead(32.04), b: lead(38.72), light: "day", set: "yard", tau: idn }, // гигантская ракета
  { id: 7, a: lead(38.72), b: lead(44.86), light: "day", set: "yard", tau: idn }, // лицо курьера, задний двор
  { id: 8, a: lead(44.86), b: lead(50.28), light: "day", set: "yard", tau: idn }, // наведение и электроника
  { id: 9, a: lead(50.28), b: lead(56.8), light: "golden", set: "pentagon", sunAz: 120, sunEl: 18, tau: idn }, // паника
  { id: 10, a: lead(56.8), b: lead(59.0), light: "golden", set: "pentagon", sunAz: 110, sunEl: 16, tau: idn }, // засекретили
  { id: 11, a: lead(59.0), b: lead(62.14), light: "day", set: "yard", tau: idn }, // дяди в костюмах
  { id: 12, a: lead(62.14), b: lead(67.28), light: "day", set: "yard", tau: idn }, // забрали, вернули, выговор
  { id: 13, a: lead(67.28), b: TOTAL, light: "day", set: "yard", tau: idn }, // посылка задерживается
];

export const XFADE: Record<number, number> = { 3: 8, 4: 8, 5: 8, 9: 8, 11: 8, 13: 6 };
export const FLASH_AT = 238;

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3,
  look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

const EYES: Record<string, V3> = {
  david: [0.35, 1.55, 2.15],
  courier: [OX + 6.7, 1.55, 2.9],
  suit: [OX + 0.2, 1.55, -1.7],
  money: [OX + 1.1, 1.5, -2.3],
  yell: [OX + 8.2, 1.55, -1.7],
  porch: [OX + 0.35, 1.45, -2.55],
};

const S1a = (f: number) => dolly([2.4, 1.85, -0.7], [-0.1, 1.15, 2.7], pushK(f, 0, 0.0018), { fov: 42 });
const S1b = (f: number) => dolly([1.35, 1.6, 0.35], [0.15, 1.35, 2.4], pushK(f, 118, 0.0022), { fov: 38, roll: -0.035 });
const S1c = (f: number) => dolly([0.85, 1.52, 0.85], [0.3, 1.48, 2.15], pushK(f, 214, 0.0028, 0.006, 26), { fov: 34, roll: 0.05 });

const S2a = (f: number) => dolly([PX + 4, 16, 52], [PX, 3.4, 2], pushK(f, 238, 0.0016), { fov: 50, roll: -0.03 });

const S3a = (f: number) => dolly([2.6, 2.0, -0.5], [0.05, 1.2, 2.8], pushK(f, 347, 0.0016), { fov: 44 });
const S3b = (f: number) => dolly([1.4, 1.62, 0.45], [0.2, 1.4, 2.3], pushK(f, 470, 0.002), { fov: 38 });

const S4a = (f: number) => dolly([6.5, 2.4, HZ - 6], [0.2, 1.1, HZ + 1.5], pushK(f, 555, 0.002), { fov: 46 });
const S4b = (f: number) => dolly([2.4, 1.45, HZ - 1.2], [0.15, 0.95, HZ + 1.6], pushK(f, 700, 0.0024), { fov: 36 });

const S5a = (f: number) => dolly([1.15, 1.6, 1.05], [0.2, 1.25, 2.7], pushK(f, 848, 0.002), { fov: 38 });
const S5b = (f: number) => dolly([0.7, 1.52, 1.25], [0.3, 1.48, 2.2], pushK(f, 920, 0.0025, 0.006, 24), { fov: 34, roll: 0.05 });

const S6a = (f: number) => dolly([OX - 1, 7.2, 28], [OX, 2.1, 5], pushK(f, 959, 0.0014), { fov: 56 });
const S6b = (f: number) => dolly([OX - 4, 4.4, 18], [OX + 1, 1.8, 5], pushK(f, 1040, 0.0018), { fov: 48, roll: -0.045 });

const S7a = (f: number) => dolly([OX + 6.15, 1.5, 1.15], [OX + 6.7, 1.52, 2.9], pushK(f, 1160, 0.0022), { fov: 36, roll: 0.04 });
const S7b = (f: number) => dolly([OX + 1, 5.6, 24], [OX + 2, 1.9, 5], pushK(f, 1248, 0.0014), { fov: 54, roll: -0.04 });

const S8a = (f: number) => dolly([OX - 3.2, 1.85, 8.4], [OX - 4.6, 1.35, 6.2], pushK(f, 1344, 0.002), { fov: 36 });
const S8b = (f: number) => dolly([OX - 4.4, 1.7, 7.5], [OX - 4.8, 1.4, 6.15], pushK(f, 1435, 0.0024), { fov: 32, roll: 0.045 });

const S9a = (f: number) => dolly([PX + 6, 18, 58], [PX, 3.2, 4], pushK(f, 1506, 0.0014), { fov: 52, roll: -0.03 });
const S9b = (f: number) => dolly([PX - 1, 2.3, 26], [PX + 2, 1.5, 18.5], pushK(f, 1648, 0.0022, 0.005, 28), { fov: 40, roll: 0.05 });

const S10a = (f: number) => dolly([PX + 1.4, 1.7, 8.2], [PX - 0.2, 1.5, 4.6], pushK(f, 1702, 0.0022), { fov: 36 });

const S11a = (f: number) => dolly([OX + 14, 3.4, 14], [OX + 1, 1.6, 1], pushK(f, 1768, 0.0015), { fov: 48, roll: -0.03 });
const S11b = (f: number) => dolly([OX + 3.4, 1.65, 2.0], [OX + 0.3, 1.48, -1.8], pushK(f, 1830, 0.002), { fov: 38, roll: 0.035 });

const S12a = (f: number) => dolly([OX - 6, 4.2, 20], [OX + 4, 1.8, 10], pushK(f, 1862, 0.0016), { fov: 48 });
const S12b = (f: number) => dolly([OX + 0.2, 1.55, -0.4], [OX + 1.15, 1.45, -2.3], pushK(f, 1896, 0.0022), { fov: 36 });
const S12c = (f: number) => dolly([OX + 10.4, 1.65, 0.6], [OX + 8.1, 1.5, -1.75], pushK(f, 1948, 0.0024), { fov: 34, roll: -0.05 });

const S13a = (f: number) => dolly([OX + 2.2, 1.55, -0.2], [OX + 0.35, 1.15, -2.7], pushK(f, 2016, 0.0016), { fov: 40 });
const S13b = (f: number) => dolly([OX + 6, 3.2, 8], [OX + 18, 1.4, 14], pushK(f, 2145, 0.0014), { fov: 44, roll: 0.04 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 118, dur: 28, s: S1b }, { f: 214, dur: 22, s: S1c }],
  2: [{ f: 238, s: S2a }],
  3: [{ f: 347, s: S3a }, { f: 470, dur: 32, s: S3b }],
  4: [{ f: 555, s: S4a }, { f: 700, dur: 36, s: S4b }],
  5: [{ f: 848, s: S5a }, { f: 920, dur: 26, s: S5b }],
  6: [{ f: 959, s: S6a }, { f: 1040, dur: 34, s: S6b }],
  7: [{ f: 1160, s: S7a }, { f: 1248, cut: true, s: S7b }],
  8: [{ f: 1344, s: S8a }, { f: 1435, dur: 30, s: S8b }],
  9: [{ f: 1506, s: S9a }, { f: 1648, dur: 32, s: S9b }],
  10: [{ f: 1702, s: S10a }],
  11: [{ f: 1768, s: S11a }, { f: 1830, dur: 24, s: S11b }],
  12: [{ f: 1862, s: S12a }, { f: 1896, cut: true, s: S12b }, { f: 1948, cut: true, s: S12c }],
  13: [{ f: 2016, s: S13a }, { f: 2145, dur: 40, s: S13b }],
};

const KICKS: [number, number][] = [[31.06, 0.75], [34.88, 1.45], [59.66, 0.85], [65.72, 0.95]];
export const kickAt = (t: number) => {
  let a = 0;
  for (const [t0, g] of KICKS) {
    const n = Math.floor((t - t0) * FPS + 1e-6);
    if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5;
  }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f / FPS);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

export type Dof = { f: number; dur?: number; cInf: number; focus?: (f: number) => V3 };
const at = (p: V3) => (_f: number): V3 => p;
export const DOF: Dof[] = [
  { f: 0, cInf: 13, focus: at(EYES.david) },
  { f: 214, dur: 22, cInf: 15, focus: at(EYES.david) },
  { f: 238, cInf: 0 },
  { f: 347, cInf: 12, focus: at(EYES.david) },
  { f: 470, dur: 32, cInf: 14, focus: at(EYES.david) },
  { f: 555, cInf: 6 },
  { f: 700, dur: 36, cInf: 12 },
  { f: 848, cInf: 13, focus: at(EYES.david) },
  { f: 920, dur: 26, cInf: 14, focus: at(EYES.david) },
  { f: 959, cInf: 0 },
  { f: 1160, cInf: 15, focus: at(EYES.courier) },
  { f: 1248, cInf: 4 },
  { f: 1344, cInf: 12 },
  { f: 1435, dur: 30, cInf: 14 },
  { f: 1506, cInf: 0 },
  { f: 1648, dur: 32, cInf: 11 },
  { f: 1702, cInf: 12 },
  { f: 1768, cInf: 8 },
  { f: 1830, dur: 24, cInf: 12, focus: at(EYES.suit) },
  { f: 1862, cInf: 0 },
  { f: 1896, cInf: 12, focus: at(EYES.money) },
  { f: 1948, cInf: 13, focus: at(EYES.yell) },
  { f: 2016, cInf: 10, focus: at(EYES.porch) },
  { f: 2145, dur: 40, cInf: 5 },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};
