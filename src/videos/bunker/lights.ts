// Light presets. The sun is camera-relative and frozen per shot (world.ts).
// az = degrees from the shot camera's forward (0 = backlight, +90 = screen right), el = elevation.
type C3 = [number, number, number];
export type LightName = "day" | "alarm" | "lab";
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3;
  blob: C3; actorShadow: boolean;
  top: string; hor: string; fog: string; fogNear: number; fogFar: number; sunDisc: string;
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;
  bias: number; normalBias: number;
};
export const LIGHTS: Record<LightName, LightPreset> = {
  day: {
    az: 75, el: 52,
    lit: [1.55, 1.48, 1.32], shade: [0.32, 0.34, 0.42], lift: [0.05, 0.06, 0.1], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.96, 0.93], charShade: 0.9, charGrad: 0.06, bodyGrad: 0.16, sideTint: [0.9, 0.92, 0.98],
    blob: [0.55, 0.52, 0.5], actorShadow: true,
    top: "#3e7fd2", hor: "#c5ddf4", fog: "#c5ddf4", fogNear: 18, fogFar: 90, sunDisc: "#fff4d2",
    sunCol: "#fff3e0", sunI: 2.6, sky: "#dcecff", ground: "#b49a78", hemiI: 0.45,
    bias: -0.0004, normalBias: 0.02,
  },
  alarm: {
    az: 55, el: 46,
    lit: [1.65, 0.62, 0.42], shade: [0.28, 0.1, 0.12], lift: [0.07, 0.02, 0.02], lambert: 0.32, sideK: 0.78, term: 0.22,
    charTint: [1.06, 0.82, 0.74], charShade: 0.9, charGrad: 0.08, bodyGrad: 0.18, sideTint: [0.85, 0.55, 0.58],
    blob: [0.45, 0.2, 0.2], actorShadow: true,
    top: "#2a1218", hor: "#5a2830", fog: "#4a2030", fogNear: 6, fogFar: 26, sunDisc: "#000000",
    sunCol: "#ffb0a0", sunI: 2.4, sky: "#4a242c", ground: "#3a2424", hemiI: 0.35,
    bias: -0.00035, normalBias: 0.025,
  },
  lab: {
    az: 120, el: 62,
    lit: [1.28, 1.32, 1.4], shade: [0.42, 0.46, 0.55], lift: [0.04, 0.05, 0.08], lambert: 0.3, sideK: 0.88, term: 0.18,
    charTint: [0.97, 0.98, 1.02], charShade: 0.92, charGrad: 0.05, bodyGrad: 0.12, sideTint: [0.9, 0.92, 0.98],
    blob: [0.6, 0.62, 0.66], actorShadow: true,
    top: "#d5e6f6", hor: "#eef4fa", fog: "#e7eef6", fogNear: 8, fogFar: 32, sunDisc: "#000000",
    sunCol: "#f4f7ff", sunI: 2.2, sky: "#e7f0fa", ground: "#c8c2b8", hemiI: 0.5,
    bias: -0.0003, normalBias: 0.02,
  },
};

export type WorldLook = {
  sky: { c: string[]; e: number[] };
  bounce: C3;
  sat: number;
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<LightName, WorldLook> = {
  day: {
    sky: { c: ["#c5ddf4", "#9ec4ee", "#6a9fe0", "#4f8cdb", "#3373cc"], e: [0, 3, 8, 16, 40] },
    cloud: { lit: "#fbf8f1", mid: "#e1e5f3", shade: "#c3cbe9" },
    bounce: [0.02, 0.02, 0.03], sat: 1.06,
  },
  alarm: {
    sky: { c: ["#5a2830", "#3a1822", "#2a121c", "#1c1016", "#140c12"], e: [0, 4, 12, 24, 50] },
    cloud: { lit: "#6a4048", mid: "#4a2830", shade: "#2a181c" },
    bounce: [0.06, 0.015, 0.01], sat: 1.05,
  },
  lab: {
    sky: { c: ["#eef4fa", "#d5e4f4", "#c5d6ea", "#b7cbe4", "#a9c0dc"], e: [0, 4, 12, 22, 45] },
    cloud: { lit: "#f7f9fc", mid: "#e4eaf2", shade: "#c9d3e0" },
    bounce: [0.02, 0.02, 0.03], sat: 0.96,
  },
};
