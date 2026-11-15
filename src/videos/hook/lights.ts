// Light presets per time of day. The sun is CAMERA-RELATIVE and frozen per shot (world.ts update()):
// az = degrees from the shot camera's forward axis (0 = sun straight ahead = backlight, +90 = screen right,
// 180 = behind camera), el = elevation. lit/shade/lift are LINEAR RGB multipliers for shade.ts (may exceed 1).
// Field names follow lighting.md 9.1 exactly (the CHAR and POST agents read them); values are tuned on renders.
type C3 = [number, number, number];
export type LightPreset = {
  az: number; el: number;
  lit: C3; shade: C3; lift: C3; lambert: number; sideK: number; term: number;      // world two-tone (shade.ts)
  charTint: C3; charShade: number; charGrad: number; bodyGrad: number; sideTint: C3; // character cards (cast.ts)
  blob: C3; actorShadow: boolean;                                                    // contact blobs / card shadows
  top: string; hor: string; skyCurve: C3; fog: string; fogNear: number; fogFar: number; sunDisc: string; // depth.md 6.5
  sunCol: string; sunI: number; sky: string; ground: string; hemiI: number;         // three lights (unpatched mats only)
  bias: number; normalBias: number;
};
export const LIGHTS: Record<"day" | "golden" | "night", LightPreset> = {
  day: {
    az: 75, el: 48,
    lit: [1.58, 1.5, 1.33], shade: [0.3, 0.29, 0.36], lift: [0.05, 0.06, 0.11], lambert: 0.35, sideK: 0.84, term: 0.2,
    charTint: [1.0, 0.94, 0.92], charShade: 0.86, charGrad: 0.07, bodyGrad: 0.2, sideTint: [0.92, 0.90, 0.96],
    blob: [0.62, 0.58, 0.58], actorShadow: false,
    top: "#3e9fe0", hor: "#b7e6f4", skyCurve: [0.0, 0.5, 0.6], fog: "#b7e6f4", fogNear: 18, fogFar: 220, sunDisc: "#000000",
    sunCol: "#fff6e4", sunI: 2.9, sky: "#d8f3ff", ground: "#c6a36a", hemiI: 0.55,
    bias: -0.00025, normalBias: 0.015,
  },
  golden: {
    az: 6, el: 7,
    lit: [1.5, 0.68, 0.24], shade: [0.15, 0.15, 0.3], lift: [0.04, 0.06, 0.17], lambert: 0.35, sideK: 0.82, term: 0.07,
    charTint: [1.0, 0.78, 0.56], charShade: 0.88, charGrad: 0.1, bodyGrad: 0.25, sideTint: [0.85, 0.80, 0.95],
    blob: [0.75, 0.74, 0.9], actorShadow: true,
    top: "#6a4f8c", hor: "#ffd08a", skyCurve: [0.05, 0.6, 1.0], fog: "#efb489", fogNear: 50, fogFar: 380, sunDisc: "#ffcf9e",
    sunCol: "#ffab5e", sunI: 5.5, sky: "#d8b0b8", ground: "#8a6a60", hemiI: 0.5,
    bias: -0.0006, normalBias: 0.03,
  },
  night: {
    az: 150, el: 32,
    lit: [0.62, 0.7, 1.05], shade: [0.1, 0.12, 0.24], lift: [0.03, 0.04, 0.1], lambert: 0.4, sideK: 0.8, term: 0.12,
    charTint: [0.78, 0.84, 1.08], charShade: 0.8, charGrad: 0.1, bodyGrad: 0.22, sideTint: [0.7, 0.76, 1.0],
    blob: [0.35, 0.4, 0.62], actorShadow: true,
    top: "#0c1c44", hor: "#1a3d6e", skyCurve: [0.0, 0.45, 0.85], fog: "#16345e", fogNear: 14, fogFar: 150, sunDisc: "#e7eeff",
    sunCol: "#d5e2ff", sunI: 1.35, sky: "#1a2c58", ground: "#102038", hemiI: 0.4,
    bias: -0.0004, normalBias: 0.02,
  },
};

/** world-only look per light (sky stops by elevation in degrees, river colours, cloud palette). All colours are
 *  ON-SCREEN targets under the current PBR-Neutral tone map; world.ts pre-inverts the tone map (shade.ts untone). */
export type WorldLook = {
  sky: { c: string[]; e: number[] };                         // 5 stops: c[i] at elevation e[i] (deg), smoothstep between
  water: { near: string; mid: string; far: string; crest: string; trough: string; glint: string; shade: C3 };
  bounce: C3;                                                 // shade.ts uBounce: albedo x bounce on shaded faces turned to the lens
  sat: number;                                                // shade.ts uSat: world albedo saturation (1 = as painted)
  cloud: { lit: string; mid: string; shade: string };
};
export const LOOK: Record<"day" | "golden" | "night", WorldLook> = {
  day: {
    sky: { c: ["#b7e6f4", "#7ecff0", "#3aa6e4", "#1d7ed4", "#1464c4"], e: [0, 3, 8, 16, 40] },
    water: { near: "#1ec8c0", mid: "#1494c8", far: "#0d5f96", crest: "#c8f7f4", trough: "#0a6a84", glint: "#ffffff", shade: [0.42, 0.62, 0.7] },
    cloud: { lit: "#fffaf2", mid: "#e7eef6", shade: "#c5d4ea" },
    bounce: [0, 0, 0],
    sat: 1.08,
  },
  golden: {
    // sunset, not dusk: #ffd08a horizon, peach/orange through ~10 deg, warm rose at 20, muted warm mauve only near the top
    // (the golden grade adds ~+11/255 blue to shadows/mids, so these lean warm)
    sky: { c: ["#ffc47c", "#f7ae78", "#e8967c", "#c4848e", "#8a6f8a"], e: [0, 4, 10, 20, 40] },
    water: { near: "#1e3a6e", mid: "#355f96", far: "#d4a48e", crest: "#d9a088", trough: "#16294f", glint: "#ffe2b0", shade: [0.42, 0.46, 0.72] },
    cloud: { lit: "#ffd2a8", mid: "#f2a08f", shade: "#a98fc4" },
    bounce: [0.04, 0.02, 0.0],
    sat: 1.1,
  },
  night: {
    sky: { c: ["#1b4578", "#14325c", "#0e2244", "#0a1834", "#070e20"], e: [0, 4, 12, 22, 48] },
    water: { near: "#0c3c4e", mid: "#0a2844", far: "#071422", crest: "#1d6070", trough: "#061018", glint: "#b7c6de", shade: [0.28, 0.34, 0.5] },
    cloud: { lit: "#2a3c58", mid: "#1a2840", shade: "#101828" },
    bounce: [0.02, 0.03, 0.06],
    sat: 0.92,
  },
};
