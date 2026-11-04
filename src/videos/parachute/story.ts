// One continuous freefall. Picture time follows parachute-short/voice/words.json.
// Height drops every frame. The camera is the jumper's eyes, except for the car-window insert.
export const FPS = 30;
export const TOTAL = 2090; // 69.67 s, the supplied voice
export const D0 = 0;
export type V3 = [number, number, number];

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** metres above the landing field. Linear until the reserve box fires, then a canopy. */
export const fallY = (t: number) => {
  if (t <= 55.62) return 3300 - 55.2 * t;
  if (t <= 58.5) return lerp(230, 120, smooth((t - 55.62) / 2.88));
  return Math.max(16, 120 - 9.4 * (t - 58.5));
};

type Wp = [number, number, number]; // t, x, z
const XZ: Wp[] = [
  [0, -700, 900],
  [10, -280, 520],
  [20, -60, 340],
  [33, 0, 240],
  [42, 70, 40],
  [50, 180, -80],
  [58, 300, -180],
  [70, 360, -240],
];
export const jumperXZ = (t: number): [number, number] => {
  let i = 1;
  while (i < XZ.length - 1 && t > XZ[i][0]) i++;
  const a = XZ[i - 1], b = XZ[i];
  const u = smooth((t - a[0]) / Math.max(0.001, b[0] - a[0]));
  return [lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
};

export type Cam = { pos: V3; look: V3; fov: number; roll: number; insert: boolean };

/** dir is where the eyes point, in a yaw/pitch: yaw 0 looks toward -z, pitch -1.2 looks down. */
const aim = (pos: V3, yaw: number, pitch: number, dist = 40): V3 => {
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  return [pos[0] + sy * cp * dist, pos[1] + sp * dist, pos[2] - cy * cp * dist];
};

export const camAt = (f: number): Cam => {
  const t = f / FPS;
  const y = fallY(t);
  const [x, z] = jumperXZ(t);
  const pos: V3 = [x, y, z];
  // default: steep look down the fall, a little forward so the horizon exists
  let yaw = 0.15;
  let pitch = -1.18;
  let fov = 64;
  let roll = Math.sin(t * 0.7) * 0.03;
  let insert = false;

  if (t < 5.4) { pitch = -1.05; fov = 66; roll = -0.06; } // hook: canopy overhead is still in the upper frame, ground fills the rest
  else if (t < 11.1) { pitch = -0.72; fov = 54; roll = 0.04; } // altimeter and the speed
  else if (t < 15.5) { pitch = -1.12; fov = 62; }
  else if (t < 18.4) { pitch = 0.42; yaw = 0.1; fov = 58; roll = 0.08; } // the streamer above
  else if (t < 22.2) { pitch = -0.95; fov = 58; roll = -0.05; } // cutaway, hands
  else if (t < 26.1) { pitch = -1.02; fov = 60; } // reserve, then the map
  else if (t < 29.6) { // head-down is faster, then correct
    const u = smooth((t - 27.0) / 1.1);
    const back = smooth((t - 28.5) / 1.0);
    pitch = lerp(-1.15, -1.48, u * (1 - back));
    fov = lerp(62, 76, u * (1 - back));
    roll = lerp(0, 0.55, u * (1 - back));
  } else if (t < 44.7) { // lake beside the road, then snow, slope, trees
    const along = smooth((t - 30.4) / 12);
    yaw = lerp(0.05, -0.55, along);
    pitch = -1.08;
    fov = 63;
    roll = lerp(0.12, -0.08, along);
  } else if (t >= 46.85 && t < 48.55) {
    insert = true;
  } else if (t < 55.5) { pitch = -0.78; fov = 56; roll = 0.02; } // the box, still falling
  else if (t < 62.4) { pitch = lerp(-0.4, -0.85, smooth((t - 55.6) / 4)); fov = 60; roll = -0.04; } // canopy overhead, ground close
  else { pitch = -0.95; yaw = 0.35; fov = 58; roll = 0.03; } // field under the boots, lake off to the side

  if (insert) {
    return {
      pos: [199.2, 1.7, 304.8],
      look: [201.4, 1.22, 301.1],
      fov: 52,
      roll: -0.08,
      insert: true,
    };
  }
  return { pos, look: aim(pos, yaw, pitch, 80), fov, roll, insert: false };
};

export type Dof = { cInf: number; focus?: V3 };
export const dofAt = (f: number): Dof => {
  const t = f / FPS;
  const c = camAt(f);
  if (c.insert) return { cInf: 9, focus: [196.2, 1.2, 163.5] };
  if (t < 5.5) return { cInf: 4 };
  if (t < 11.2) return { cInf: 11, focus: [c.pos[0] - 0.22, c.pos[1] - 0.18, c.pos[2] - 0.35] };
  if (t > 15.6 && t < 18.5) return { cInf: 8 };
  if (t > 52 && t < 57) return { cInf: 10 };
  if (t > 58) return { cInf: 6 };
  return { cInf: 3 };
};

export const lightName = (_f: number): "day" | "golden" => "day";
