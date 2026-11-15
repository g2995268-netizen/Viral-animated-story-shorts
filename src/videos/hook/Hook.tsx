// Hook's island. Ink, lens blur, bloom, neutral tonemap, grade. Subtitles sit on top, one or two words.
import React, { useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "./ink";
import { LensBlur } from "./lensblur";
import { GradeEffect, gradeFor } from "./grade";
import { TOTAL, FPS, SHOTS, layersAt, dofAt } from "./story";
import { LINES } from "./lines";

export const HOOK_FRAMES = TOTAL;

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.45, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.55 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ id: number }> = ({ id }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera),
    lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }),
    bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }),
    grade: new GradeEffect({ ky: [0, 0.1, 0.28, 0.6, 0.84, 0.95, 1], sat: [1, 1.05, 1], tintS: [0, 0], tintM: [0, 0], tintH: [0, 0], vig: [0.16, 0.48] }, 1),
  }), [camera, scene]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  target.copy(world.update(id, f, cam, scene));
  noInkFallback(world.root);
  const d = dofAt(f);
  cam.getWorldDirection(fwd);
  if (d.focus) fpt.set(...d.focus(f)); else fpt.copy(target);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd));
  fx.lens.cInf = d.cInf;
  gradeFor(fx.grade, SHOTS[id - 1].light);
  return (
    <>
      <primitive object={world.root} dispose={null} />
      {post}
    </>
  );
};

const ShotView: React.FC<{ id: number; alpha: number }> = ({ id, alpha }) => {
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ opacity: alpha }}>
      <ThreeCanvas width={width} height={height} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMapping: THREE.NoToneMapping, toneMappingExposure: 1.0 }}
        camera={{ fov: 40, near: 0.15, far: 1200 }}>
        <Inner id={id} />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};

const Captions: React.FC<{ frame: number }> = ({ frame }) => {
  const { height } = useVideoConfig();
  const t = frame / FPS;
  const line = LINES.find((l) => t >= l.s && t < l.e);
  if (!line) return null;
  const s = height / 1920;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", left: 0, right: 0, bottom: `${14}%`, textAlign: "center",
        color: "#fff", fontFamily: "Arial Black, Arial, sans-serif", fontWeight: 800,
        fontSize: Math.round(78 * s), letterSpacing: Math.round(1 * s), lineHeight: 1,
        textShadow: `0 0 ${4 * s}px #111, ${2 * s}px ${2 * s}px 0 #111, -${2 * s}px ${2 * s}px 0 #111, ${2 * s}px -${2 * s}px 0 #111, -${2 * s}px -${2 * s}px 0 #111`,
      }}>{line.t}</div>
    </AbsoluteFill>
  );
};

export const HookShort: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#7ecff0" }}>
      {layersAt(f).map((l, i) => <ShotView key={i ? "over" : "base"} id={l.id} alpha={l.alpha} />)}
      <Captions frame={f} />
    </AbsoluteFill>
  );
};
export const HookPreview = HookShort;
