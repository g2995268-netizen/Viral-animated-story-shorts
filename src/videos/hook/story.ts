// Hook's island. Cuts sit on the voice. Cameras push and pull; place changes crossfade.
export const FPS = 30;
export const TOTAL = 1812;
export const D0 = 0;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Seven holes. The count in the last line wins over the earlier "four more". */
export const HOLES: V3[] = [
  [-4.5, 0, -0.6],
  [6.4, 0, -3.4],
  [0.4, 0, 7.4],
  [3.4, 0, -4.2],
  [-2.6, 0, 4.8],
  [4.8, 0, 2.0],
  [-6.6, 0, 3.4],
];

export type Light = "day" | "golden" | "night";
export type ShotDef = { id: number; a: number; b: number; light: Light; tau: (t: number) => number };
const idn = (t: number) => t;
const fr = (sec: number) => Math.max(0, Math.round(sec * FPS));

// Provisional beats. Snapped to the sped-up voice once words.json is in.
export const BEAT = {
  set: 4.04,
  fear: 12.26,
  dig1: 16.98,
  dig2: 20.84,
  night: 28.48,
  more: 31.34,
  cover: 38.16,
  week: 43.66,
  lost: 51.02,
};

export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: fr(BEAT.set), light: "day", tau: idn },
  { id: 2, a: fr(BEAT.set), b: fr(BEAT.fear), light: "day", tau: idn },
  { id: 3, a: fr(BEAT.fear), b: fr(BEAT.dig1), light: "day", tau: idn },
  { id: 4, a: fr(BEAT.dig1), b: fr(BEAT.dig2), light: "day", tau: idn },
  { id: 5, a: fr(BEAT.dig2), b: fr(BEAT.night), light: "day", tau: idn },
  { id: 6, a: fr(BEAT.night), b: fr(BEAT.more), light: "night", tau: idn },
  { id: 7, a: fr(BEAT.more), b: fr(BEAT.cover), light: "night", tau: idn },
  { id: 8, a: fr(BEAT.cover), b: fr(BEAT.week), light: "golden", tau: idn },
  { id: 9, a: fr(BEAT.week), b: fr(BEAT.lost), light: "day", tau: idn },
  { id: 10, a: fr(BEAT.lost), b: TOTAL, light: "day", tau: idn },
];
export const XFADE: Record<number, number> = { 2: 6, 3: 6, 4: 6, 5: 6, 6: 8, 7: 6, 8: 8, 9: 6, 10: 6 };

export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
const mix = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

/** Fast ease-out push: most of the move in the first ~14 frames, then a slow creep. */
const push = (wide: V3, near: V3, f: number, a0: number): V3 => {
  const u = 1 - Math.exp(-Math.max(0, f - a0) / 11);
  return mix(wide, near, u);
};

export type HookPose = { x: number; y: number; z: number; dig: boolean; hammock: boolean; walk: number; face: "nervous" | "stern" | "grin" | "laugh" | "shock" | "dazed" | "pained" | "smile" };
const at = (p: V3, extra: Partial<HookPose> = {}): HookPose => ({ x: p[0], y: 0, z: p[2], dig: false, hammock: false, walk: 0, face: "stern", ...extra });
const between = (t: number, a: number, b: number, from: V3, to: V3, face: HookPose["face"]): HookPose => {
  const u = smooth((t - a) / Math.max(0.2, b - a));
  return { x: lerp(from[0], to[0], u), y: 0, z: lerp(from[2], to[2], u), dig: false, hammock: false, walk: u > 0.08 && u < 0.92 ? (t * 1.8) % 1 : 0, face };
};

export const hookPose = (t: number): HookPose => {
  const h = HOLES;
  if (t < BEAT.dig1) return at([-3.3, 0, 0.9], { face: t < BEAT.fear ? "grin" : "nervous" });
  if (t < 17.7) return between(t, BEAT.dig1, 17.7, [-3.3, 0, 0.9], h[0], "stern");
  if (t < BEAT.dig2) return at(h[0], { dig: true, face: "stern" });
  if (t < 23.1) return between(t, BEAT.dig2, 23.1, h[0], h[1], "nervous");
  if (t < 25.7) return at(h[1], { dig: true, face: "pained" });
  if (t < BEAT.night) return at(h[1], { face: "pained" });
  if (t < 29.3) return between(t, BEAT.night, 29.3, h[1], [-3.6, 0, -1.2], "nervous");
  if (t < BEAT.more) return { x: -3.6, y: 0.62, z: -1.15, dig: false, hammock: true, walk: 0, face: "pained" };
  if (t < BEAT.cover) {
    const slots = [2, 3, 4, 5, 6];
    const span = (BEAT.cover - BEAT.more) / slots.length;
    const i = Math.min(slots.length - 1, Math.floor((t - BEAT.more) / span));
    const a = BEAT.more + i * span, b = a + span * 0.4;
    const hole = h[slots[i]];
    if (t < b) return between(t, a, b, i === 0 ? [-3.6, 0, -1.2] : h[slots[i - 1]], hole, "stern");
    return at(hole, { dig: true, face: "stern" });
  }
  if (t < BEAT.cover + 0.7) return between(t, BEAT.cover, BEAT.cover + 0.7, h[6], [0.2, 0, 0.4], "smile");
  if (t < BEAT.week) return at([0.2, 0, 0.4], { face: "grin" });
  if (t < 46.4) return between(t, BEAT.week, 46.4, [0.2, 0, 0.4], [0.4, 0, 1.4], "stern");
  if (t < BEAT.lost) return between(t, 46.4, BEAT.lost, [0.4, 0, 1.4], [0.5, 0, 6.4], "nervous");
  if (t < 53.7) return between(t, BEAT.lost, 53.7, [0.5, 0, 6.4], [0.1, 0, 0.4], "shock");
  return at([0.1, 0, 0.4], { face: t < 56.2 ? "shock" : "dazed" });
};

/** How many holes are open, and 0..1 once the morning sand wipes them. */
export const holesNow = (t: number) => {
  let open = 0;
  if (t >= 17.9) open = 1;
  if (t >= 23.4) open = 2;
  if (t >= BEAT.more) {
    const span = (BEAT.cover - BEAT.more) / 5;
    const i = Math.floor((t - BEAT.more) / span);
    const local = (t - BEAT.more) - i * span;
    open = 2 + Math.min(5, i + (local > span * 0.4 ? 1 : 0));
  }
  const wipe = t < BEAT.cover ? 0 : t < BEAT.cover + 1.5 ? smooth((t - BEAT.cover) / 1.5) : 1;
  return { open: Math.min(7, open), wipe };
};

export const camAt = (id: number, f: number): Cam => {
  const s = SHOTS[id - 1];
  const t = f / FPS;
  const u = smooth((f - s.a) / Math.max(1, s.b - s.a));
  const hook = hookPose(t);
  let pos: V3;
  let look: V3 = [hook.x, hook.y + 1.25, hook.z];
  let fov = 38;
  let roll = Math.sin(t * 0.7) * 0.012;
  switch (id) {
    case 1:
      pos = push([8, 32, 26], [4, 16, 16], f, s.a);
      look = [-1, 0.2, 0];
      fov = 42;
      break;
    case 2:
      pos = push([2, 14, 24], [1.2, 8, 18], f, s.a);
      look = [1.2, 0.4, 2];
      fov = 54;
      break;
    case 3:
      pos = push([-0.6, 1.7, 4.2], [-1.6, 1.45, 2.8], f, s.a);
      look = [-3.3, 1.2, 0.85];
      fov = 32;
      break;
    case 4:
      pos = push([1.6, 2.4, 5.4], [-0.2, 1.7, 3.6], f, s.a);
      look = [hook.x, 0.9, hook.z];
      fov = 36;
      break;
    case 5:
      pos = push([11, 3.2, 7], [8.4, 1.9, 4.6], f, s.a);
      look = [hook.x, 1.0, hook.z];
      fov = 40;
      break;
    case 6:
      pos = push([0.4, 1.8, 3.4], [-0.8, 1.35, 1.8], f, s.a);
      look = [-3.5, 0.95, -1.15];
      fov = 34;
      break;
    case 7: {
      const a: V3 = [2.2, 1.7, 11];
      const b: V3 = [6.5, 2.1, -1.2];
      pos = mix(a, b, u);
      look = [hook.x, 0.8, hook.z];
      fov = 40;
      break;
    }
    case 8:
      pos = push([6, 4.2, 9], [2.4, 2.2, 4.6], f, s.a);
      look = [0.2, 0.7, 0.3];
      fov = 40;
      break;
    case 9:
      pos = push([hook.x + 4.2, 1.8, hook.z + 3.2], [hook.x + 2.6, 1.45, hook.z + 2.2], f, s.a);
      look = [hook.x, 1.15, hook.z];
      fov = 36;
      break;
    default: {
      const close: V3 = [2.2, 1.7, 3.4];
      const wide: V3 = [6, 22, 18];
      pos = mix(close, wide, smooth((u - 0.22) / 0.7));
      look = u < 0.4 ? [hook.x, 1.35, hook.z] : [-1, 0.2, 0];
      fov = 34 + u * 12;
      roll = -0.02;
    }
  }
  return { pos, look, fov, roll };
};

export const dofAt = (f: number) => {
  const id = shotAt(f).id;
  const t = f / FPS;
  const h = hookPose(t);
  const focus = (_f: number): V3 => [h.x, h.y + 1.2, h.z];
  if (id === 1 || id === 10) return { cInf: 4 };
  if (id === 3 || id === 6) return { cInf: 10, focus };
  if (id === 5) return { cInf: 6, focus };
  return { cInf: 5, focus };
};
