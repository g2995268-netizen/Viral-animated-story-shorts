// "The Bridge That Fell for a Song": our original 67 s short in the flat-characters-in-a-3D-toon-world style.
// One three.js world (world.ts) posed per frame from the story timeline (story.ts). Post chain (look-match pass):
//   InkPass (world ink lines, own pass) -> lens blur pre + main (thin-lens DOF per shot from dofAt) ->
//   [bloom (emissive only) + NEUTRAL tone mapping + colour grade] (one merged EffectPass), MSAA 4.
// Ink runs before the DOF so lines blur with what they belong to; bloom after the DOF so glows defocus with their
// source; the grade is display-referred, so it comes after tone mapping. Every pixel-sized parameter is specified at
// 1080x1920 and scaled with the output size, so stills at --scale 0.5 and the 1440x2560 final match.
// Place changes crossfade by stacking a second canvas for the fade frames; the hook ends on a 4-frame white flash.
import React, { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World, loadKit } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur, GrainEffect } from "./lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "./grade";
import { Kit } from "./build";
import { TOTAL, FLASH_AT, FPS, layersAt, dofAt, moodAt } from "./story";

export const BRIDGE_FRAMES = TOTAL;
export const PARACHUTE_FRAMES = TOTAL;

/** A/B switches for test stills only (Remotion inputProps `{ post: { ink: false, ... } }`); everything is on by default. */
type PostToggles = { ink: boolean; lens: boolean; pre: boolean; bloom: boolean; grade: boolean; grain: boolean };
const toggles = (): PostToggles => ({ ink: true, lens: true, pre: true, bloom: true, grade: true, grain: false, ...((getInputProps() as { post?: Partial<PostToggles> }).post ?? {}) });

/** Bloom for emissive sources only (depth.md 6.4). Its MIP chain always starts at 540x960 (half of 1080x1920),
 *  whatever the output size, so the glow keeps the same size relative to the frame (e-fold ~30 px at 1080p,
 *  ~1.5 % of the frame height) at 540, 1080 and 1440 widths. ADD blend: HDR-safe (SCREEN darkens values > 1). */
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const useKit = () => {
  const [kit, setKit] = useState<Kit | null>(null);
  const [handle] = useState(() => delayRender("bridge kit"));
  useEffect(() => { loadKit().then((k) => { setKit(k); continueRender(handle); }); }, [handle]);
  return kit;
};

const Inner: React.FC<{ id: number; kit: Kit }> = ({ id, kit }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(kit), [kit]);
  const target = useMemo(() => new THREE.Vector3(), []);
  const on = useMemo(toggles, []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
    grain: new GrainEffect({ amount: 0.025, cellPx: 1.5 }), // film grain, OFF by default (inputProps post.grain): the reference measures no grain and it quadruples the file size
  }), [camera, scene]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      {on.ink ? <primitive object={fx.ink} dispose={null} /> : <group />}
      {on.lens && on.pre ? <primitive object={fx.lens.pre} dispose={null} /> : <group />}
      {on.lens ? <primitive object={fx.lens.main} dispose={null} /> : <group />}
      {on.bloom ? <primitive object={fx.bloom} dispose={null} /> : <group />}
      <primitive object={fx.tone} dispose={null} />
      {on.grade ? <primitive object={fx.grade} dispose={null} /> : <group />}
      {on.grain ? <primitive object={fx.grain} dispose={null} /> : <group />}
    </EffectComposer>
  ), [fx, on]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  // thin-lens focus: distance along the view axis to the shot's focus point (default: the camera's look target)
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, moodAt(id));
  fx.grain.seed = f; // deterministic per frame
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

/** test stills only: inputProps `{ post: { dpr: 0.5 } }` forces the WebGL buffer size (R3F clamps dpr to >= 1 by default) */
const dprOverride = () => (getInputProps() as { post?: { dpr?: number } }).post?.dpr;
const ShotView: React.FC<{ id: number; kit: Kit; alpha: number }> = ({ id, kit, alpha }) => {
  const { width, height } = useVideoConfig();
  return (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={width} height={height} {...(dprOverride() ? { dpr: dprOverride() } : {})} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping, toneMappingExposure: 1.0 }}
      camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner id={id} kit={kit} />
    </ThreeCanvas>
  </AbsoluteFill>
  );
};

export const BridgeShort: React.FC = () => {
  const f = useCurrentFrame();
  const kit = useKit();
  if (!kit) return null;
  const flash = f >= FLASH_AT && f < FLASH_AT + 4 ? [1, 0.75, 0.45, 0.2][f - FLASH_AT] : 0;
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} kit={kit} alpha={l.alpha} />)}
      {flash > 0 && <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} />}
      <Plates frame={f} />
    </AbsoluteFill>
  );
};

type Plate = { t0: number; t1: number; kicker: string; value: string; unit: string; side: "left" | "right" };
const PLATES: Plate[] = [
  { t0: 1.62, t1: 3.05, kicker: "TIME", value: "60", unit: "SECONDS", side: "left" },
  { t0: 6.64, t1: 8.55, kicker: "ALTITUDE", value: "3,300", unit: "METERS", side: "right" },
  { t0: 8.68, t1: 10.25, kicker: "SPEED", value: "200", unit: "KM/H", side: "left" },
  { t0: 51.8, t1: 53.7, kicker: "THE BOX", value: "200", unit: "GRAMS", side: "right" },
  { t0: 54.78, t1: 56.25, kicker: "ALTITUDE", value: "230", unit: "METERS", side: "left" },
  { t0: 58.28, t1: 60.35, kicker: "TOO LATE", value: "40", unit: "METERS", side: "right" },
];

const Plates: React.FC<{ frame: number }> = ({ frame }) => {
  const { height } = useVideoConfig();
  const t = frame / FPS;
  const s = height / 1920;
  const plate = PLATES.find((p) => t >= p.t0 && t < p.t1);
  if (!plate) return null;
  const inn = Math.max(0, Math.min(1, (t - plate.t0) / 0.16));
  const out = Math.max(0, Math.min(1, (plate.t1 - t) / 0.18));
  const e = 1 - (1 - inn) ** 3;
  const scale = inn < 1 ? 0.7 + 0.36 * e : 1;
  const opacity = Math.min(1, inn * 5, out * 5);
  const edge = Math.round(36 * s);
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <div style={{
        position: "absolute",
        top: Math.round(150 * s),
        left: plate.side === "left" ? edge : undefined,
        right: plate.side === "right" ? edge : undefined,
        transform: `translateY(${(1 - e) * 28 * s}px) scale(${scale})`,
        transformOrigin: plate.side === "left" ? "left top" : "right top",
        background: "#f6f1e6",
        color: "#241726",
        border: `${Math.max(3, Math.round(8 * s))}px solid #241726`,
        borderRadius: Math.round(28 * s),
        padding: `${Math.round(16 * s)}px ${Math.round(28 * s)}px ${Math.round(18 * s)}px`,
        boxShadow: `${Math.round(8 * s)}px ${Math.round(8 * s)}px 0 #241726`,
        fontFamily: "Trebuchet MS, Arial Rounded MT Bold, sans-serif",
        lineHeight: 0.9,
      }}>
        <div style={{ fontSize: Math.round(28 * s), letterSpacing: Math.round(3 * s), fontWeight: 700 }}>{plate.kicker}</div>
        <div style={{ fontSize: Math.round(92 * s), fontWeight: 800, marginTop: Math.round(4 * s) }}>{plate.value}</div>
        <div style={{ fontSize: Math.round(32 * s), fontWeight: 700, letterSpacing: Math.round(2 * s) }}>{plate.unit}</div>
      </div>
    </AbsoluteFill>
  );
};
export const ParachuteShort = BridgeShort;
